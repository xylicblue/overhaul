import { supabase } from "../creatclient";
import { entityAccessFreshnessMs, normalizeEntityAccessState } from "../utils/entityAccessState";

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
  "information_requested",
  "approved",
]);

export function isEntityOnboardingSchemaMissing(error) {
  return error?.code === "42P01" ||
    /entity_applications.*(does not exist|schema cache)/i.test(error?.message || "");
}

function isEntityAccessFunctionMissing(error) {
  return error?.code === "PGRST202" ||
    /(could not find|does not exist).*current_entity_access_state/i.test(error?.message || "");
}

const ACCESS_CACHE_PREFIX = "bytestrike:entity-access:v1:";
const ACCESS_STALE_IF_ERROR_MS = 30 * 60_000;
const memoryAccessCache = new Map();
const inflightAccessRequests = new Map();

function readStoredAccess(userId) {
  const memory = memoryAccessCache.get(userId);
  if (memory) return memory;
  if (typeof window === "undefined") return null;
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(`${ACCESS_CACHE_PREFIX}${userId}`) || "null");
    if (!stored?.verifiedAt || !stored?.value) return null;
    memoryAccessCache.set(userId, stored);
    return stored;
  } catch {
    return null;
  }
}

function storeAccess(userId, value) {
  const entry = { value, verifiedAt: Date.now() };
  memoryAccessCache.set(userId, entry);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(`${ACCESS_CACHE_PREFIX}${userId}`, JSON.stringify(entry));
    } catch {
      // Memory caching still prevents duplicate checks when storage is blocked.
    }
  }
  return entry;
}

export function clearEntityAccessStateCache(userId = null) {
  if (userId) memoryAccessCache.delete(userId);
  else memoryAccessCache.clear();
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      window.sessionStorage.removeItem(`${ACCESS_CACHE_PREFIX}${userId}`);
      return;
    }
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(ACCESS_CACHE_PREFIX)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // Cache invalidation must never interrupt logout or onboarding actions.
  }
}

function sessionIdFromAccessToken(accessToken) {
  if (!accessToken || typeof window === "undefined") return null;
  try {
    const encoded = accessToken.split(".")[1];
    if (!encoded) return null;
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
      .padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    return JSON.parse(window.atob(base64))?.session_id || null;
  } catch {
    return null;
  }
}

// A cache is valid only within the current authenticated session. Supabase may
// emit SIGNED_IN when an existing session is re-established (for example on
// tab focus), so clear only when the actual session changes or signs out.
// Token refreshes keep the same session_id and deliberately preserve access.
if (typeof window !== "undefined") {
  let activeAuthSessionId = null;
  supabase.auth.onAuthStateChange((event, session) => {
    const nextSessionId = sessionIdFromAccessToken(session?.access_token);
    if (event === "INITIAL_SESSION") {
      activeAuthSessionId = nextSessionId;
      return;
    }
    if (event === "SIGNED_OUT") {
      clearEntityAccessStateCache();
      activeAuthSessionId = null;
      return;
    }
    if (event === "SIGNED_IN") {
      if (activeAuthSessionId && nextSessionId && activeAuthSessionId !== nextSessionId) {
        clearEntityAccessStateCache();
      }
      activeAuthSessionId = nextSessionId || activeAuthSessionId;
    }
  });
}

export async function getEntityAccessState(userId, { forceRefresh = false } = {}) {
  if (!userId) throw new Error("Please sign in to continue.");

  const cached = readStoredAccess(userId);
  const cacheAge = cached ? Date.now() - cached.verifiedAt : Number.POSITIVE_INFINITY;
  if (!forceRefresh && cached && cacheAge < entityAccessFreshnessMs(cached.value)) {
    return { ...cached.value, cacheStatus: "fresh", lastVerifiedAt: cached.verifiedAt };
  }

  if (inflightAccessRequests.has(userId)) return inflightAccessRequests.get(userId);

  const request = (async () => {
    const { data, error } = await supabase.rpc("current_entity_access_state");
    if (error) {
      // A previously verified approval is safer UX than converting a timeout,
      // gateway throttle or transient PostgREST failure into "not onboarded".
      // Sensitive writes continue to re-check access server-side.
      if (cached && cacheAge < ACCESS_STALE_IF_ERROR_MS &&
          (cached.value.isAdmin || cached.value.onboardingComplete)) {
        console.warn("[EntityAccess] using last verified access after refresh failure:", error.message);
        return { ...cached.value, cacheStatus: "stale", lastVerifiedAt: cached.verifiedAt };
      }
      if (isEntityOnboardingSchemaMissing(error) || isEntityAccessFunctionMissing(error)) {
        return {
          isAdmin: false,
          onboardingComplete: false,
          collectionComplete: false,
          application: null,
          schemaAvailable: false,
          membershipFound: false,
          mfaComplete: false,
          cacheStatus: "unavailable",
        };
      }
      throw new Error(error.message || "Could not verify entity onboarding status.");
    }

    const value = normalizeEntityAccessState(data);
    const entry = storeAccess(userId, value);
    return { ...value, cacheStatus: "verified", lastVerifiedAt: entry.verifiedAt };
  })().finally(() => {
    inflightAccessRequests.delete(userId);
  });

  inflightAccessRequests.set(userId, request);
  return request;
}

async function currentUser() {
  // The authenticated onboarding route has already restored the Supabase
  // session. Reuse that same session identity instead of making a second
  // /auth/user request for every load, save, and upload. getSession refreshes
  // an expired access token when a valid refresh token is available.
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) {
    throw new Error("Please sign in to continue your application.");
  }
  return session.user;
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
    application.isic_class_code || String(application.isic_division || "").match(/\b\d{4}\b/)?.[0],
    application.source_of_funds_category,
    application.ownership_structure_category,
    application.source_of_funds,
  ];
  if (requiredValues.some((value) => !String(value || "").trim())) {
    throw new Error("Complete all required entity fields before submitting.");
  }
  const isicClassCode = application.isic_class_code || String(application.isic_division || "").match(/\b\d{4}\b/)?.[0];
  if (!/^\d{4}$/.test(String(isicClassCode || ""))) {
    throw new Error("Enter a valid four-digit ISIC class code before submitting.");
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
  const invalidWallet = application.crypto_wallet_addresses.find(
    (address) => !/^0x[0-9a-fA-F]{40}$/.test(String(address || "").trim())
  );
  if (invalidWallet) {
    throw new Error(`Enter a valid Ethereum-compatible 0x address instead of ${invalidWallet}.`);
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
  const isicClassCode = String(
    application.isic_class_code || String(application.isic_division || "").match(/\b\d{4}\b/)?.[0] || ""
  ).trim();

  return updateEntityApplication(application.id, {
    // Re-send the reviewed value at the submission boundary so an edited form
    // cannot submit an older ISIC value that is still stored on the row.
    isic_class_code: isicClassCode,
    isic_division: isicClassCode,
    status: "submitted",
    onboarding_step: 3,
    submitted_at: new Date().toISOString(),
  });
}
