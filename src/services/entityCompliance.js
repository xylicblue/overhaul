import { supabase } from "../creatclient";
import {
  ACCEPTED_ENTITY_DOCUMENT_TYPES,
  ENTITY_DOCUMENT_BUCKET,
  MAX_ENTITY_DOCUMENT_BYTES,
  createOnboardingDocumentPreview,
} from "./entityOnboarding";

function throwIf(error, fallback) {
  if (error) throw new Error(error.message || fallback);
}

function cleanFilename(name) {
  return String(name || "document")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-120) || "document";
}

async function currentAdmin() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) throw new Error("Your Compliance session has expired. Please sign in again.");
  return session.user;
}

export async function loadEntityExtendedContext(applicationId) {
  const [extendedResult, monitoringResult] = await Promise.all([
    supabase.rpc("admin_entity_extended_context", {
      p_application_id: applicationId,
    }),
    supabase.rpc("admin_entity_live_monitoring_context", {
      p_application_id: applicationId,
    }),
  ]);
  if (extendedResult.error) throw extendedResult.error;
  if (monitoringResult.error &&
      monitoringResult.error.code !== "PGRST202" &&
      !/admin_entity_live_monitoring_context/i.test(monitoringResult.error.message || "")) {
    throw monitoringResult.error;
  }
  return {
    ...(extendedResult.data || {}),
    live_monitoring: monitoringResult.data || {},
  };
}

export async function updateEntityMonitoringProfile({ applicationId, accountPurpose, expectedMonthlyDeposits, rationale }) {
  const { error } = await supabase.rpc("admin_update_entity_monitoring_profile", {
    p_application_id: applicationId,
    p_account_purpose: accountPurpose,
    p_expected_monthly_deposits_usd: expectedMonthlyDeposits === "" || expectedMonthlyDeposits == null
      ? null
      : Number(expectedMonthlyDeposits),
    p_rationale: rationale.trim(),
  });
  throwIf(error, "Could not update the monitoring profile.");
}

export async function reviseEntityMonitoringThresholds({ capacityStep, thresholdFactor, rationale, approvalReference }) {
  const { data, error } = await supabase.rpc("admin_revise_entity_monitoring_thresholds", {
    p_capacity_step: Number(capacityStep),
    p_compliance_threshold_factor: Number(thresholdFactor),
    p_rationale: rationale.trim(),
    p_approval_reference: approvalReference?.trim() || null,
  });
  throwIf(error, "Could not create the monitoring-model revision.");
  return data;
}

export async function registerCurrentComplianceOfficer(rationale) {
  const user = await currentAdmin();
  const { error } = await supabase.rpc("admin_set_entity_compliance_officer", {
    p_user_id: user.id,
    p_active: true,
    p_rationale: rationale.trim(),
  });
  throwIf(error, "Could not register the Compliance Officer.");
}

export async function uploadComplianceDocument({ applicationId, purpose, file }) {
  const user = await currentAdmin();
  if (!ACCEPTED_ENTITY_DOCUMENT_TYPES.includes(file.type)) {
    throw new Error("Upload a PDF, JPEG, PNG or WebP file.");
  }
  if (file.size > MAX_ENTITY_DOCUMENT_BYTES) {
    throw new Error("Each document must be 15 MB or smaller.");
  }

  const path = `${user.id}/${applicationId}/compliance/${purpose}/${crypto.randomUUID()}-${cleanFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(ENTITY_DOCUMENT_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  throwIf(uploadError, "Could not upload the Compliance document.");

  const { data, error } = await supabase
    .from("entity_compliance_documents")
    .insert({
      application_id: applicationId,
      purpose,
      original_filename: file.name.slice(0, 255),
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from(ENTITY_DOCUMENT_BUCKET).remove([path]);
    throwIf(error, "Could not record the Compliance document.");
  }
  return data;
}

export async function removeComplianceDocument(document) {
  const { error: storageError } = await supabase.storage
    .from(ENTITY_DOCUMENT_BUCKET)
    .remove([document.storage_path]);
  throwIf(storageError, "Could not remove the Compliance file.");
  const { error } = await supabase
    .from("entity_compliance_documents")
    .delete()
    .eq("id", document.id);
  throwIf(error, "Could not remove the Compliance document record.");
}

export async function openComplianceDocument(document) {
  return createOnboardingDocumentPreview(document);
}

export async function reviewBackgroundScreening({ caseId, outcome, gateKeys, note, providerReference }) {
  const { error } = await supabase.rpc("admin_review_entity_background_screening", {
    p_case_id: caseId,
    p_review_answer: outcome,
    p_gate_keys: gateKeys || [],
    p_note: note?.trim() || null,
    p_provider_reference: providerReference?.trim() || null,
  });
  throwIf(error, "Could not record the background-screening outcome.");
}

export async function reviewMonitoringAlert({ alertId, status, rationale }) {
  const { error } = await supabase.rpc("admin_review_entity_monitoring_alert", {
    p_alert_id: alertId,
    p_status: status,
    p_rationale: rationale.trim(),
  });
  throwIf(error, "Could not record the alert review.");
}

export async function setEntityRestriction({ applicationId, restrictionType, active, rationale, memberUserIds = [] }) {
  const { error } = await supabase.rpc("admin_set_entity_account_restriction", {
    p_application_id: applicationId,
    p_restriction_type: restrictionType,
    p_active: active,
    p_rationale: rationale.trim(),
  });
  throwIf(error, "Could not update the customer restriction.");

  if (active && restrictionType === "all_activity") {
    const uniqueUsers = [...new Set(memberUserIds.filter(Boolean))];
    const outcomes = await Promise.all(uniqueUsers.map((userId) => supabase.rpc("admin_set_account_frozen", {
      p_user_id: userId,
      p_frozen: true,
      p_reason: `[Entity restriction: ${applicationId}] ${rationale.trim()}`,
    })));
    const failed = outcomes.find((outcome) => outcome.error);
    throwIf(failed?.error, "The entity restriction was recorded, but one or more linked accounts could not be frozen.");
  }
}

export async function setMemberAccountFrozen({ userId, frozen, rationale }) {
  const { error } = await supabase.rpc("admin_set_account_frozen", {
    p_user_id: userId,
    p_frozen: frozen,
    p_reason: frozen ? rationale.trim() : null,
  });
  throwIf(error, "Could not update the member account freeze.");
}
