import { supabase } from "../creatclient";

export const ENTITY_DOCUMENT_BUCKET = "entity-onboarding-documents";
export const MAX_ENTITY_DOCUMENT_BYTES = 15 * 1024 * 1024;
export const ACCEPTED_ENTITY_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const FINANCIAL_ENTITY_TYPES = new Set([
  "bank_credit_institution",
  "investment_securities_firm",
  "insurance_entity",
  "digital_asset_business",
  "exchange",
  "money_service_business",
]);

export const REQUIRED_ENTITY_DOCUMENTS = [
  "proof_business_address",
  "articles_of_incorporation",
  "certificate_good_standing",
  "bank_statement",
  "source_of_funds",
  "aml_program_certificate",
  "aml_atf_sanctions_policy",
];

// Trading and wallet linking are available only after Compliance approval.
// `collectionComplete` is separate so submitted applicants can proceed to KYC
// without accidentally being treated as approved for platform access.
export const ENTITY_ONBOARDING_COMPLETE_STATUSES = new Set([
  "approved",
]);
export const ENTITY_COLLECTION_COMPLETE_STATUSES = new Set([
  "submitted",
  "under_review",
  "approved",
]);

export function isEntityOnboardingSchemaMissing(error) {
  return error?.code === "42P01" ||
    /entity_applications.*(does not exist|schema cache)/i.test(error?.message || "");
}

export async function getEntityAccessState(userId) {
  if (!userId) throw new Error("Please sign in to continue.");

  const [profileResult, applicationResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("entity_applications")
      .select("id, status")
      .eq("primary_contact_user_id", userId)
      .maybeSingle(),
  ]);

  throwIf(profileResult.error, "Could not verify account permissions.");
  const isAdmin = profileResult.data?.is_admin === true;

  // Admin status is authoritative and does not depend on the onboarding table.
  // This also keeps internal testing available during a staged schema rollout.
  if (isAdmin) {
    return {
      isAdmin: true,
      onboardingComplete: true,
      collectionComplete: true,
      application: applicationResult.data || null,
      schemaAvailable: !applicationResult.error,
    };
  }

  if (applicationResult.error) {
    if (isEntityOnboardingSchemaMissing(applicationResult.error)) {
      return {
        isAdmin: false,
        onboardingComplete: false,
        collectionComplete: false,
        application: null,
        schemaAvailable: false,
      };
    }
    throw new Error(applicationResult.error.message || "Could not verify entity onboarding status.");
  }

  return {
    isAdmin: false,
    onboardingComplete: ENTITY_ONBOARDING_COMPLETE_STATUSES.has(applicationResult.data?.status),
    collectionComplete: ENTITY_COLLECTION_COMPLETE_STATUSES.has(applicationResult.data?.status),
    application: applicationResult.data || null,
    schemaAvailable: true,
  };
}

async function currentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Please sign in to continue your application.");
  return user;
}

function throwIf(error, fallback) {
  if (error) throw new Error(error.message || fallback);
}

export async function loadEntityOnboarding() {
  const user = await currentUser();
  const { data: application, error } = await supabase
    .from("entity_applications")
    .select("*")
    .eq("primary_contact_user_id", user.id)
    .maybeSingle();
  throwIf(error, "Could not load the entity application.");

  if (!application) {
    return { user, application: null, connectedPersons: [], documents: [] };
  }

  const [peopleResult, documentsResult] = await Promise.all([
    supabase
      .from("entity_connected_persons")
      .select("*")
      .eq("application_id", application.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("entity_onboarding_documents")
      .select("*")
      .eq("application_id", application.id)
      .order("created_at", { ascending: true }),
  ]);
  throwIf(peopleResult.error, "Could not load connected persons.");
  throwIf(documentsResult.error, "Could not load supporting documents.");

  return {
    user,
    application,
    connectedPersons: peopleResult.data || [],
    documents: documentsResult.data || [],
  };
}

export async function createEntityShell(values) {
  const user = await currentUser();
  const payload = {
    primary_contact_user_id: user.id,
    primary_contact_legal_name: values.primary_contact_legal_name.trim(),
    primary_contact_phone: values.primary_contact_phone.trim(),
    entity_legal_name: values.entity_legal_name.trim(),
    status: "in_progress",
    onboarding_step: 1,
  };
  const { data, error } = await supabase
    .from("entity_applications")
    .upsert(payload, { onConflict: "primary_contact_user_id" })
    .select()
    .single();
  throwIf(error, "Could not create the entity application.");
  return data;
}

export async function updateEntityApplication(applicationId, updates) {
  const { data, error } = await supabase
    .from("entity_applications")
    .update(updates)
    .eq("id", applicationId)
    .select()
    .single();
  throwIf(error, "Could not save the entity application.");
  return data;
}

export async function saveConnectedPerson(applicationId, person) {
  if (!person.roles?.length) throw new Error("Select at least one role for the connected person.");
  if (!person.full_name?.trim() || !person.phone?.trim() || !person.email?.trim() ||
      !person.nationality_country_code || !person.residence_country_code ||
      !person.residential_address?.trim() || !person.date_of_birth ||
      !person.tax_identification_number?.trim()) {
    throw new Error("Complete every required connected-person field.");
  }
  if (person.roles.includes("beneficial_owner") &&
      (person.ownership_percent === "" || person.ownership_percent == null)) {
    throw new Error("Enter the ownership percentage for the beneficial owner.");
  }
  const payload = {
    application_id: applicationId,
    roles: person.roles || [],
    ownership_percent: person.ownership_percent === "" || person.ownership_percent == null
      ? null
      : Number(person.ownership_percent),
    control_description: person.control_description?.trim() || null,
    full_name: person.full_name?.trim() || null,
    phone: person.phone?.trim() || null,
    email: person.email?.trim() || null,
    nationality_country_code: person.nationality_country_code || null,
    residence_country_code: person.residence_country_code || null,
    residential_address: person.residential_address?.trim() || null,
    date_of_birth: person.date_of_birth || null,
    tax_identification_number: person.tax_identification_number?.trim() || null,
  };

  const query = person.id
    ? supabase.from("entity_connected_persons").update(payload).eq("id", person.id)
    : supabase.from("entity_connected_persons").insert(payload);
  const { data, error } = await query.select().single();
  throwIf(error, "Could not save the connected person.");
  return data;
}

export async function removeConnectedPerson(personId) {
  const { error } = await supabase.from("entity_connected_persons").delete().eq("id", personId);
  throwIf(error, "Could not remove the connected person.");
}

function cleanFilename(name) {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-120) || "document";
}

export async function uploadOnboardingDocument({ applicationId, category, file, connectedPersonId = null }) {
  const user = await currentUser();
  if (!ACCEPTED_ENTITY_DOCUMENT_TYPES.includes(file.type)) {
    throw new Error("Upload a PDF, JPEG, PNG or WebP file.");
  }
  if (file.size > MAX_ENTITY_DOCUMENT_BYTES) {
    throw new Error("Each document must be 15 MB or smaller.");
  }

  const scope = connectedPersonId || "entity";
  const path = `${user.id}/${applicationId}/${scope}/${category}/${crypto.randomUUID()}-${cleanFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(ENTITY_DOCUMENT_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  throwIf(uploadError, "Could not upload the document.");

  const { data, error } = await supabase
    .from("entity_onboarding_documents")
    .insert({
      application_id: applicationId,
      connected_person_id: connectedPersonId,
      uploaded_by: user.id,
      category,
      original_filename: file.name.slice(0, 255),
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from(ENTITY_DOCUMENT_BUCKET).remove([path]);
    throwIf(error, "Could not record the uploaded document.");
  }

  // Keep one current document per requirement. The new object is committed
  // before old versions are removed, so a failed upload never destroys the
  // applicant's previous evidence.
  let oldQuery = supabase
    .from("entity_onboarding_documents")
    .select("id, storage_path")
    .eq("application_id", applicationId)
    .eq("category", category)
    .neq("id", data.id);
  oldQuery = connectedPersonId
    ? oldQuery.eq("connected_person_id", connectedPersonId)
    : oldQuery.is("connected_person_id", null);
  const { data: oldDocuments } = await oldQuery;
  if (oldDocuments?.length) {
    await supabase.storage.from(ENTITY_DOCUMENT_BUCKET).remove(oldDocuments.map((doc) => doc.storage_path));
    await supabase
      .from("entity_onboarding_documents")
      .delete()
      .in("id", oldDocuments.map((doc) => doc.id));
  }

  return data;
}

export async function createOnboardingDocumentPreview(document) {
  if (!document?.storage_path) throw new Error("This document is not available for preview.");

  // The bucket is private. A short-lived URL allows an applicant to inspect
  // their own upload without making the object public or persisting a link.
  const { data, error } = await supabase.storage
    .from(ENTITY_DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, 300);
  throwIf(error, "Could not create a secure document preview.");
  if (!data?.signedUrl) throw new Error("Could not create a secure document preview.");
  return data.signedUrl;
}

export async function removeOnboardingDocument(document) {
  const { error: storageError } = await supabase.storage
    .from(ENTITY_DOCUMENT_BUCKET)
    .remove([document.storage_path]);
  throwIf(storageError, "Could not remove the uploaded file.");
  const { error } = await supabase
    .from("entity_onboarding_documents")
    .delete()
    .eq("id", document.id);
  throwIf(error, "Could not remove the document record.");
}

export function validateApplicationForSubmission(application, people, documents) {
  const requiredValues = [
    application.primary_contact_legal_name,
    application.primary_contact_phone,
    application.entity_legal_name,
    application.registered_address,
    application.business_address,
    application.incorporation_date,
    application.incorporation_place,
    application.incorporation_country_code,
    application.corporate_identification_number,
    application.entity_type,
    application.entity_phone,
    application.isic_division,
    application.source_of_funds_category,
    application.ownership_structure_category,
    application.source_of_funds,
  ];
  if (requiredValues.some((value) => !String(value || "").trim())) {
    throw new Error("Complete all required entity fields before submitting.");
  }
  if (application.entity_type === "other" && !application.entity_type_other?.trim()) {
    throw new Error("Specify the entity type selected as Other.");
  }
  if (application.listed_on_stock_exchange && !application.stock_exchange_name?.trim()) {
    throw new Error("Provide the stock exchange on which the entity is listed.");
  }
  if (!application.crypto_wallet_addresses?.length || !application.directors_and_officers?.length) {
    throw new Error("Add at least one intended wallet and one director or officer.");
  }
  const neededDocuments = [...REQUIRED_ENTITY_DOCUMENTS];
  if (application.is_financial_institution) neededDocuments.push("regulatory_licence");
  const categories = new Set(documents.filter((doc) => !doc.connected_person_id).map((doc) => doc.category));
  const missing = neededDocuments.filter((category) => !categories.has(category));
  if (missing.length) throw new Error("Upload every required entity document before submitting.");
  if (!people.length) throw new Error("Add at least one connected person.");
  for (const person of people) {
    if (!person.roles?.length || !person.full_name || !person.phone || !person.email ||
        !person.nationality_country_code || !person.residence_country_code ||
        !person.residential_address || !person.date_of_birth || !person.tax_identification_number) {
      throw new Error(`Complete all required details for ${person.full_name || "each connected person"}.`);
    }
    if (person.roles.includes("beneficial_owner") && person.ownership_percent == null) {
      throw new Error(`Enter the ownership percentage for ${person.full_name}.`);
    }
    const hasId = documents.some((doc) =>
      doc.connected_person_id === person.id && doc.category === "connected_person_government_id"
    );
    if (!hasId) throw new Error(`Upload government-issued identification for ${person.full_name}.`);
  }
}

export async function submitEntityApplication(application, people, documents) {
  validateApplicationForSubmission(application, people, documents);
  return updateEntityApplication(application.id, {
    status: "submitted",
    onboarding_step: 3,
    submitted_at: new Date().toISOString(),
  });
}
