import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import sumsubWebSdk from "@sumsub/websdk";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "./creatclient";
import {
  getEntityKycStatus,
  getPrimaryEntityKycToken,
  initializeEntityKyc,
  reopenEntityApplication,
  resendConnectedPersonKyc,
  setUsername,
} from "./services/api";
import AccountGate from "./components/AccountGate";
import MfaGate from "./components/MfaGate";
import logo from "./assets/ByteStrikeLogoFinal.png";
import { COUNTRIES } from "./data/countries";
import {
  ACCEPTED_ENTITY_DOCUMENT_TYPES,
  FINANCIAL_ENTITY_TYPES,
  REQUIRED_ENTITY_DOCUMENTS,
  createOnboardingDocumentPreview,
  createEntityShell,
  getEntityAccessState,
  loadEntityOnboarding,
  removeConnectedPerson,
  removeOnboardingDocument,
  saveConnectedPerson,
  submitEntityApplication,
  updateEntityApplication,
  uploadOnboardingDocument,
} from "./services/entityOnboarding";
import "./entity-onboarding.css";

const ENTITY_TYPES = [
  { value: "private_company", label: "Private company", group: "Corporate and legal entities" },
  { value: "public_company", label: "Public company", group: "Corporate and legal entities" },
  { value: "partnership", label: "Partnership or LLP", group: "Corporate and legal entities" },
  { value: "trust_foundation", label: "Trust or foundation", group: "Corporate and legal entities" },
  { value: "non_profit", label: "Non-profit organisation", group: "Corporate and legal entities" },
  { value: "government_body", label: "Government or public body", group: "Corporate and legal entities" },
  { value: "bank_credit_institution", label: "Bank or credit institution", group: "Financial institutions" },
  { value: "investment_securities_firm", label: "Investment or securities firm", group: "Financial institutions" },
  { value: "insurance_entity", label: "Insurance entity", group: "Financial institutions" },
  { value: "digital_asset_business", label: "Digital asset business or VASP", group: "Financial institutions" },
  { value: "exchange", label: "Exchange", group: "Financial institutions" },
  { value: "money_service_business", label: "Money service business", group: "Financial institutions" },
  { value: "other", label: "Other", group: "Other" },
];

const DOCUMENT_REQUIREMENTS = [
  ["proof_business_address", "Proof of business address", "Utility bill, lease agreement or equivalent"],
  ["articles_of_incorporation", "Articles of incorporation", "Current constitutional or formation document"],
  ["certificate_good_standing", "Certificate of good standing", "Current certificate issued by the relevant registry"],
  ["bank_statement", "Bank statement", "Recent statement in the entity's legal name"],
  ["source_of_funds", "Source of funds evidence", "Document supporting the source described above"],
  ["aml_program_certificate", "AML compliance programme certificate", "Certificate for the entity's own programme"],
  ["aml_atf_sanctions_policy", "AML, ATF and sanctions policy", "Current policy document"],
];

const PERSON_ROLES = [
  ["beneficial_owner", "Beneficial owner (10% or more equity or control)"],
  ["director", "Director"],
  ["officer", "Officer"],
  ["authorised_signatory", "Authorised signatory"],
];

const SOURCE_OF_FUNDS_CATEGORIES = [
  ["institutional_capital", "Institutional capital"],
  ["operating_business_revenue", "Verifiable operating business revenue"],
  ["sale_of_assets", "Documented sale of assets"],
  ["loan_or_credit_facility", "Documented loan or credit facility"],
  ["gift_or_inheritance", "Documented gift or inheritance"],
  ["other_undocumented", "Other, undocumented or unable to verify"],
];

const OWNERSHIP_STRUCTURE_CATEGORIES = [
  ["single_direct_ubo", "Single natural-person UBO, direct"],
  ["two_three_direct_ubos", "2–3 natural-person UBOs, direct"],
  ["four_plus_direct_ubos", "4+ natural-person UBOs, direct"],
  ["single_holding_entity", "Single intermediate holding entity"],
  ["multiple_layers_or_jurisdictions", "Multiple layers or jurisdictions"],
  ["trust_nominee_bearer", "Trust, nominee or bearer-share arrangement"],
  ["ubo_unidentified", "UBO cannot be fully identified or verified"],
];

const EMPTY_PERSON = {
  roles: [],
  ownership_percent: "",
  control_description: "",
  full_name: "",
  phone: "",
  email: "",
  nationality_country_code: "",
  residence_country_code: "",
  residential_address: "",
  date_of_birth: "",
  tax_identification_number: "",
};

function applicationStep(application) {
  if (!application) return 0;
  if (["under_review", "approved"].includes(application.status)) return 5;
  if (application.status === "submitted") return 4;
  if (application.onboarding_step === 2 && !application.is_financial_institution) return 3;
  return Math.min(application.onboarding_step || 0, 3);
}

const APPROVED_KYC_STATES = new Set(["approved", "verified", "completed"]);

function withinKycRequestTimeout(promise, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("Verification services did not respond. Please try again.")),
      timeoutMs
    );
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); }
    );
  });
}

function verificationLabel(status) {
  const labels = {
    not_started: "Not started",
    invited: "Invitation sent",
    pending: "In progress",
    in_review: "Under review",
    approved: "Verified",
    verified: "Verified",
    completed: "Verified",
    resubmission: "Action required",
    retry: "Action required",
    rejected: "Review required",
  };
  return labels[status] || "Not started";
}

function verificationTone(status) {
  if (APPROVED_KYC_STATES.has(status)) return "verified";
  if (["resubmission", "retry", "rejected"].includes(status)) return "attention";
  return "pending";
}

function EntityIdentityVerification({ application, onApplicationChanged, onEditApplication }) {
  const initializationPromise = useRef(null);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyPerson, setBusyPerson] = useState("");
  const [sdkActive, setSdkActive] = useState(false);
  const [reopening, setReopening] = useState(false);

  const loadStatus = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const next = await withinKycRequestTimeout(getEntityKycStatus());
      setState(next);
      if (["under_review", "approved"].includes(next.application?.status)) {
        onApplicationChanged(next.application);
      }
    } catch (error) {
      if (!quiet) toast.error(error.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [onApplicationChanged]);

  useEffect(() => {
    let active = true;
    // React StrictMode runs this effect through a setup/cleanup/setup cycle in
    // development. Reuse one idempotent initialization request, but let the
    // currently active setup consume its result and clear the loader.
    if (!initializationPromise.current) {
      initializationPromise.current = withinKycRequestTimeout(initializeEntityKyc());
    }
    initializationPromise.current
      .then(() => {
        if (active) return loadStatus();
        return undefined;
      })
      .catch((error) => {
        if (active) {
          toast.error(error.message);
          setLoading(false);
        }
      });
    const timer = window.setInterval(() => {
      if (active && !sdkActive) loadStatus({ quiet: true });
    }, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [sdkActive, loadStatus]);

  const startPrimaryVerification = async () => {
    try {
      const getToken = async () => (await getPrimaryEntityKycToken()).token;
      const token = await getToken();
      setSdkActive(true);
      window.requestAnimationFrame(() => {
        sumsubWebSdk
          .init(token, getToken)
          .withConf({ lang: "en" })
          .on("idCheck.applicantStatusUpdated", () => loadStatus({ quiet: true }))
          .on("idCheck.onDone", () => {
            toast.success("Verification submitted to Sumsub for review");
            window.setTimeout(() => loadStatus({ quiet: true }), 1500);
          })
          .build()
          .launch("#entity-primary-sumsub");
      });
    } catch (error) {
      setSdkActive(false);
      toast.error(error.message);
    }
  };

  const resend = async (personId) => {
    setBusyPerson(personId);
    try {
      const result = await resendConnectedPersonKyc(personId);
      if (!result.ok) throw new Error("The invitation email could not be sent. Please try again.");
      toast.success("Verification invitation sent");
      await loadStatus({ quiet: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyPerson("");
    }
  };

  const editApplication = async () => {
    setReopening(true);
    try {
      const result = await reopenEntityApplication();
      toast.success("Application reopened for editing");
      onEditApplication(result.application);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setReopening(false);
    }
  };

  if (sdkActive) {
    return (
      <div className="entity-card entity-kyc-sdk-card">
        <div className="entity-kyc-sdk-header">
          <div><p>Primary contact</p><h2>Identity verification</h2></div>
          <button type="button" className="entity-back" onClick={() => { setSdkActive(false); loadStatus({ quiet: true }); }}>
            <ArrowLeft size={15} /> Return to overview
          </button>
        </div>
        <div id="entity-primary-sumsub" className="entity-kyc-sdk" />
      </div>
    );
  }

  const primaryStatus = state?.primary_contact?.status || "not_started";
  const primaryVerified = APPROVED_KYC_STATES.has(primaryStatus);

  return (
    <div className="entity-card entity-kyc-card">
      <SectionHeading
        icon={ShieldCheck}
        eyebrow="Identity verification"
        title="Verify the people behind the entity"
        description="The primary contact completes verification here. Each other connected person receives a private link at the email address supplied in the application."
      />
      <div className="entity-kyc-edit-row">
        <div>
          <strong>Need to correct the application?</strong>
          <span>You can return to the forms before a connected person starts verification.</span>
        </div>
        <button type="button" className="entity-secondary" disabled={reopening} onClick={editApplication}>
          {reopening ? <Loader2 size={14} className="spin" /> : <ArrowLeft size={14} />}
          Edit application
        </button>
      </div>
      {loading ? (
        <div className="entity-kyc-loading"><Loader2 size={20} className="spin" /> Preparing secure verification</div>
      ) : (
        <>
          <div className="entity-kyc-summary">
            <div><strong>{application.entity_legal_name}</strong><span>Identity checks are completed independently by Sumsub.</span></div>
            <span className={`entity-kyc-status ${verificationTone(state?.application?.identity_verification_status)}`}>
              {verificationLabel(state?.application?.identity_verification_status)}
            </span>
          </div>

          <div className="entity-kyc-list">
            <article className="entity-kyc-person">
              <div className="entity-kyc-person-mark"><UserRound size={18} /></div>
              <div className="entity-kyc-person-copy">
                <small>Primary contact</small>
                <strong>{application.primary_contact_legal_name}</strong>
                <span>{state?.primary_contact?.email}</span>
              </div>
              <span className={`entity-kyc-status ${verificationTone(primaryStatus)}`}>{verificationLabel(primaryStatus)}</span>
              {!primaryVerified && (
                <button type="button" className="entity-primary entity-kyc-action" onClick={startPrimaryVerification}>
                  {primaryStatus === "not_started" ? "Start verification" : "Continue verification"}
                </button>
              )}
            </article>

            {(state?.connected_persons || []).map((person) => {
              const verified = APPROVED_KYC_STATES.has(person.sumsub_review_status);
              const inviteFailed = Boolean(person.invitation?.last_error);
              return (
                <article className="entity-kyc-person" key={person.id}>
                  <div className="entity-kyc-person-mark"><Mail size={18} /></div>
                  <div className="entity-kyc-person-copy">
                    <small>{person.verification_via_primary_contact ? "Verified with primary contact" : "Connected person"}</small>
                    <strong>{person.full_name}</strong>
                    <span>{person.email}</span>
                    {!person.verification_via_primary_contact && person.invitation?.sent_at && !inviteFailed && (
                      <em>Private invitation sent {new Date(person.invitation.sent_at).toLocaleDateString()}</em>
                    )}
                    {inviteFailed && <em className="is-error">Delivery failed. Send the invitation again.</em>}
                  </div>
                  <span className={`entity-kyc-status ${verificationTone(person.sumsub_review_status)}`}>
                    {verificationLabel(person.sumsub_review_status)}
                  </span>
                  {!person.verification_via_primary_contact && !verified && (
                    <button type="button" className="entity-secondary entity-kyc-action" disabled={busyPerson === person.id} onClick={() => resend(person.id)}>
                      {busyPerson === person.id ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                      {person.invitation?.sent_at ? "Resend" : "Send invitation"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>

          <div className="entity-kyc-footnote">
            <ShieldCheck size={17} />
            <p>Invitation links expire after seven days and provide verification access only. Connected persons do not receive a ByteStrike account or access to trading.</p>
          </div>
        </>
      )}
    </div>
  );
}

function safeNext(raw) {
  if (!raw || typeof raw !== "string" || raw.startsWith("//") || raw.includes("\\")) return "/trade";
  try {
    const value = new URL(raw, window.location.origin);
    return value.origin === window.location.origin ? `${value.pathname}${value.search}${value.hash}` : "/trade";
  } catch {
    return "/trade";
  }
}

function Input({ label, required, hint, ...props }) {
  return (
    <label className="entity-field">
      <span>{label}{required && <em>Required</em>}</span>
      <input required={required} {...props} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Textarea({ label, required, hint, ...props }) {
  return (
    <label className="entity-field entity-field-wide">
      <span>{label}{required && <em>Required</em>}</span>
      <textarea required={required} {...props} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

function CountrySelect({ label, required, hint, ...props }) {
  return (
    <label className="entity-field">
      <span>{label}{required && <em>Required</em>}</span>
      <select required={required} {...props}>
        <option value="" disabled>Select country</option>
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>{country.name}</option>
        ))}
      </select>
      {hint && <small>{hint}</small>}
    </label>
  );
}

function SectionHeading({ icon, eyebrow, title, description }) {
  return (
    <div className="entity-section-heading">
      <div className="entity-section-icon">{React.createElement(icon, { size: 19 })}</div>
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        <span>{description}</span>
      </div>
    </div>
  );
}

function DocumentField({ applicationId, documents, category, title, description, connectedPersonId, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const document = documents.find((item) =>
    item.category === category && (item.connected_person_id || null) === (connectedPersonId || null)
  );
  const inputId = `doc-${category}-${connectedPersonId || "entity"}`;

  useEffect(() => {
    setPreviewUrl("");
    setPreviewError("");
    setPreviewBusy(false);
  }, [document?.storage_path]);

  const loadPreview = async () => {
    if (!document || previewUrl || previewBusy || previewError) return;
    setPreviewBusy(true);
    try {
      setPreviewUrl(await createOnboardingDocumentPreview(document));
    } catch (error) {
      setPreviewError(error.message || "Preview unavailable");
    } finally {
      setPreviewBusy(false);
    }
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await uploadOnboardingDocument({ applicationId, category, file, connectedPersonId });
      await onChanged({ preserveStep: true });
      toast.success(`${title} uploaded`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!document) return;
    setBusy(true);
    try {
      await removeOnboardingDocument(document);
      await onChanged({ preserveStep: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`entity-document ${document ? "is-complete" : ""}`}>
      <div className="entity-document-mark">
        {document ? <FileCheck2 size={19} /> : <FileText size={19} />}
      </div>
      <div
        className="entity-document-copy"
        tabIndex={document ? 0 : undefined}
        onMouseEnter={loadPreview}
        onFocus={loadPreview}
      >
        <strong>{title}</strong>
        <span className={document ? "entity-document-filename" : ""}>
          {document ? document.original_filename : description}
        </span>
        {document && (
          <div className="entity-document-preview" role="tooltip">
            {previewBusy ? (
              <div className="entity-document-preview-state"><Loader2 size={17} className="spin" /> Loading preview</div>
            ) : previewError ? (
              <div className="entity-document-preview-state">{previewError}</div>
            ) : previewUrl ? (
              document.mime_type?.startsWith("image/") ? (
                <img src={previewUrl} alt={`Preview of ${title}`} />
              ) : (
                <iframe src={previewUrl} title={`Preview of ${title}`} />
              )
            ) : (
              <div className="entity-document-preview-state">Hover to preview</div>
            )}
          </div>
        )}
      </div>
      <input
        id={inputId}
        type="file"
        accept={ACCEPTED_ENTITY_DOCUMENT_TYPES.join(",")}
        onChange={upload}
        hidden
      />
      {document ? (
        <div className="entity-document-actions">
          <label htmlFor={inputId}>{busy ? <Loader2 size={15} className="spin" /> : "Replace"}</label>
          <button type="button" onClick={remove} disabled={busy} aria-label={`Remove ${title}`}><Trash2 size={15} /></button>
        </div>
      ) : (
        <label htmlFor={inputId} className="entity-upload-button">
          {busy ? <Loader2 size={16} className="spin" /> : <UploadCloud size={16} />}
          Upload
        </label>
      )}
    </div>
  );
}

function EntityOnboardingFlow({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const nextPath = safeNext(new URLSearchParams(location.search).get("next"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [application, setApplication] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [people, setPeople] = useState([]);
  const [profileUsername, setProfileUsername] = useState("");
  const [step, setStep] = useState(0);
  const [draftPerson, setDraftPerson] = useState(null);
  const [selectedEntityType, setSelectedEntityType] = useState("");
  const [businessAddressSame, setBusinessAddressSame] = useState(true);
  const [listedOnExchange, setListedOnExchange] = useState(false);

  const refresh = async ({ preserveStep = false } = {}) => {
    const state = await loadEntityOnboarding();
    setApplication(state.application);
    setDocuments(state.documents);
    setPeople(state.connectedPersons);
    if (state.application && !preserveStep) {
      setStep(applicationStep(state.application));
    }
    return state;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [{ data: profile }, state] = await Promise.all([
          supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
          loadEntityOnboarding(),
        ]);
        if (!active) return;
        setProfileUsername(profile?.username || "");
        setApplication(state.application);
        setDocuments(state.documents);
        setPeople(state.connectedPersons);
        setSelectedEntityType(state.application?.entity_type || "");
        setBusinessAddressSame(state.application?.business_address_same !== false);
        setListedOnExchange(Boolean(state.application?.listed_on_stock_exchange));
        setStep(applicationStep(state.application));
      } catch (error) {
        if (active) toast.error(error.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user.id]);

  const groups = useMemo(() => {
    return ENTITY_TYPES.reduce((result, item) => {
      if (!result[item.group]) result[item.group] = [];
      result[item.group].push(item);
      return result;
    }, {});
  }, []);

  const saveStepZero = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setSaving(true);
    try {
      if (values.username !== profileUsername) await setUsername(values.username);
      const saved = await createEntityShell(values);
      setProfileUsername(values.username);
      setApplication(saved);
      setStep(1);
      toast.success("Entity account created");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveEntityDetails = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const isFinancial = FINANCIAL_ENTITY_TYPES.has(values.entity_type);
    setSaving(true);
    try {
      const saved = await updateEntityApplication(application.id, {
        registered_address: values.registered_address.trim(),
        business_address_same: values.business_address_same === "on",
        business_address: values.business_address_same === "on"
          ? values.registered_address.trim()
          : values.business_address.trim(),
        incorporation_date: values.incorporation_date,
        incorporation_place: values.incorporation_place.trim(),
        incorporation_country_code: values.incorporation_country_code,
        listed_on_stock_exchange: values.listed_on_stock_exchange === "yes",
        stock_exchange_name: values.listed_on_stock_exchange === "yes" ? values.stock_exchange_name.trim() : null,
        corporate_identification_number: values.corporate_identification_number.trim(),
        entity_type: values.entity_type,
        entity_type_other: values.entity_type === "other" ? values.entity_type_other.trim() : null,
        entity_phone: values.entity_phone.trim(),
        crypto_wallet_addresses: values.crypto_wallet_addresses.split("\n").map((v) => v.trim()).filter(Boolean),
        isic_division: values.isic_division.trim(),
        ownership_structure_category: values.ownership_structure_category,
        directors_and_officers: values.directors_and_officers.split("\n").map((v) => v.trim()).filter(Boolean),
        source_of_funds_category: values.source_of_funds_category,
        source_of_funds: values.source_of_funds.trim(),
        is_financial_institution: isFinancial,
        onboarding_step: isFinancial ? 2 : 3,
        status: "in_progress",
      });
      setApplication(saved);
      setStep(isFinancial ? 2 : 3);
      toast.success("Entity details saved");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveFinancialDetails = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setSaving(true);
    try {
      const saved = await updateEntityApplication(application.id, {
        financial_institution_type: values.financial_institution_type.trim(),
        regulatory_registration_number: values.regulatory_registration_number.trim(),
        competent_authority: values.competent_authority.trim(),
        onboarding_step: 3,
      });
      setApplication(saved);
      setStep(3);
      toast.success("Regulatory details saved");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const savePerson = async (person) => {
    setSaving(true);
    try {
      await saveConnectedPerson(application.id, person);
      await refresh();
      setDraftPerson(null);
      toast.success("Connected person saved");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const deletePerson = async (person) => {
    if (!person.id) { setDraftPerson(null); return; }
    setSaving(true);
    try {
      const personDocuments = documents.filter((doc) => doc.connected_person_id === person.id);
      for (const document of personDocuments) await removeOnboardingDocument(document);
      await removeConnectedPerson(person.id);
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      const state = await refresh({ preserveStep: true });
      const entityDocumentCategories = new Set(
        state.documents
          .filter((document) => !document.connected_person_id)
          .map((document) => document.category)
      );
      const hasMissingEntityDocument = REQUIRED_ENTITY_DOCUMENTS.some(
        (category) => !entityDocumentCategories.has(category)
      );

      if (hasMissingEntityDocument) {
        setStep(1);
        window.scrollTo({ top: 0, behavior: "smooth" });
        toast.error("Complete the required document uploads before submitting.");
        return;
      }

      if (
        state.application?.is_financial_institution &&
        !entityDocumentCategories.has("regulatory_licence")
      ) {
        setStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
        toast.error("Upload the required regulatory evidence before submitting.");
        return;
      }

      const personMissingIdentification = state.connectedPersons.some((person) =>
        !state.documents.some((document) =>
          document.connected_person_id === person.id &&
          document.category === "connected_person_government_id"
        )
      );
      if (personMissingIdentification) {
        setStep(3);
        toast.error("Upload identification for each connected person before submitting.");
        return;
      }

      const saved = await submitEntityApplication(state.application, state.connectedPersons, state.documents);
      setApplication(saved);
      setStep(4);
      toast.success("Information submitted. Continue with identity verification.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="entity-page-loading"><Loader2 size={22} className="spin" /></div>;
  }

  if (step === 4) {
    return (
      <OnboardingShell step={4} isFinancial={application?.is_financial_institution}>
        <EntityIdentityVerification
          application={application}
          onApplicationChanged={(nextApplication) => {
            setApplication((current) => ({ ...current, ...nextApplication }));
            setStep(applicationStep(nextApplication));
          }}
          onEditApplication={(nextApplication) => {
            setApplication(nextApplication);
            setStep(3);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </OnboardingShell>
    );
  }

  if (step === 5) {
    return (
      <OnboardingShell step={5} isFinancial={application?.is_financial_institution}>
        <div className="entity-complete">
          <div className="entity-complete-icon"><CheckCircle2 size={27} /></div>
          <p>Verification received</p>
          <h1>Your application is with Compliance.</h1>
          <span>
            The entity information and required identity checks have been received. Our Compliance team will review
            the application and contact the primary contact if clarification or further due diligence is required.
          </span>
          {application?.is_financial_institution && (
            <div className="entity-edd-note">
              <ShieldCheck size={18} />
              <div>
                <strong>Enhanced due diligence applies</strong>
                <span>Financial institution applications require EDD. Our Compliance team will contact you directly.</span>
              </div>
            </div>
          )}
          <button className="entity-primary" type="button" onClick={() => navigate(nextPath, { replace: true })}>
            Continue <ArrowRight size={16} />
          </button>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell step={step} isFinancial={application?.is_financial_institution}>
      {step === 0 && (
        <form onSubmit={saveStepZero} className="entity-card">
          <SectionHeading
            icon={Building2}
            eyebrow="Step 0"
            title="Create the entity profile"
            description="The authorised primary contact should complete this application on behalf of the entity."
          />
          <div className="entity-form-grid">
            <Input label="Primary contact legal name" name="primary_contact_legal_name" required autoComplete="name" />
            <Input label="Primary contact phone" name="primary_contact_phone" type="tel" required autoComplete="tel" />
            <Input label="Entity legal name" name="entity_legal_name" required className="entity-span-two" />
            <Input
              label="Account username"
              name="username"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-z0-9_]+"
              defaultValue={profileUsername}
              hint="Lowercase letters, numbers and underscores. This is separate from the entity's legal name."
            />
          </div>
          <FormFooter saving={saving} label="Create entity profile" />
        </form>
      )}

      {step === 1 && application && (
        <form onSubmit={saveEntityDetails} className="entity-card">
          <SectionHeading
            icon={FileText}
            eyebrow="Step 1"
            title="Entity details and documents"
            description="Provide the entity's registration, operating and financial information. Progress is saved at the end of this step."
          />
          <div className="entity-form-grid">
            <Textarea label="Registered address" name="registered_address" required defaultValue={application.registered_address || ""} rows={3} />
            <div className="entity-field entity-field-wide">
              <label className="entity-check">
                <input
                  type="checkbox"
                  name="business_address_same"
                  checked={businessAddressSame}
                  onChange={(event) => setBusinessAddressSame(event.target.checked)}
                />
                <span><Check size={13} /> Business address is the same as the registered address</span>
              </label>
              {!businessAddressSame && (
                <Textarea label="Business address" name="business_address" required defaultValue={application.business_address || ""} rows={3} />
              )}
            </div>
            <Input label="Date of incorporation or establishment" name="incorporation_date" type="date" required defaultValue={application.incorporation_date || ""} />
            <Input label="Place of incorporation or establishment" name="incorporation_place" required defaultValue={application.incorporation_place || ""} />
            <CountrySelect
              label="Country of incorporation"
              name="incorporation_country_code"
              required
              defaultValue={application.incorporation_country_code || ""}
            />
            <Input label="Corporate identification number" name="corporate_identification_number" required defaultValue={application.corporate_identification_number || ""} />
            <Input label="Entity phone number" name="entity_phone" type="tel" required defaultValue={application.entity_phone || ""} />
            <label className="entity-field">
              <span>Entity type <em>Required</em></span>
              <select
                name="entity_type"
                required
                value={selectedEntityType}
                onChange={(event) => setSelectedEntityType(event.target.value)}
              >
                <option value="" disabled>Select the closest entity type</option>
                {Object.entries(groups).map(([group, items]) => (
                  <optgroup key={group} label={group}>
                    {items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            {selectedEntityType === "other" && (
              <Input label="Specify the entity type" name="entity_type_other" required defaultValue={application.entity_type_other || ""} />
            )}
            <Input label="ISIC division" name="isic_division" required defaultValue={application.isic_division || ""} hint="Enter the applicable ISIC division code and description." />
            <label className="entity-field">
              <span>Ownership structure <em>Required</em></span>
              <select name="ownership_structure_category" required defaultValue={application.ownership_structure_category || ""}>
                <option value="" disabled>Select the closest structure</option>
                {OWNERSHIP_STRUCTURE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <small>Choose the most complex structure that applies. Connected-person ownership is checked again during Compliance review.</small>
            </label>
            <label className="entity-field">
              <span>Listed on a stock exchange? <em>Required</em></span>
              <select
                name="listed_on_stock_exchange"
                required
                value={listedOnExchange ? "yes" : "no"}
                onChange={(event) => setListedOnExchange(event.target.value === "yes")}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            {listedOnExchange && (
              <Input label="Stock exchange" name="stock_exchange_name" required defaultValue={application.stock_exchange_name || ""} />
            )}
            <Textarea
              label="Crypto wallet addresses intended for use"
              name="crypto_wallet_addresses"
              required
              defaultValue={(application.crypto_wallet_addresses || []).join("\n")}
              rows={4}
              hint="Enter one wallet address per line. Wallet screening and allowlisting will occur later."
            />
            <Textarea
              label="Legal names of directors and officers"
              name="directors_and_officers"
              required
              defaultValue={(application.directors_and_officers || []).join("\n")}
              rows={4}
              hint="Enter one legal name per line, including the chief executive or equivalent."
            />
            <Textarea
              label="Source of funds details"
              name="source_of_funds"
              required
              defaultValue={application.source_of_funds || ""}
              rows={4}
              hint="Describe the origin and identify the documents that support it."
            />
            <label className="entity-field entity-field-wide">
              <span>Primary source of funds <em>Required</em></span>
              <select name="source_of_funds_category" required defaultValue={application.source_of_funds_category || ""}>
                <option value="" disabled>Select the closest category</option>
                {SOURCE_OF_FUNDS_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <small>This controlled category feeds the risk model; your description and evidence remain available to Compliance.</small>
            </label>
          </div>

          <div className="entity-subsection">
            <div><h3>Supporting documents</h3><p>PDF or image files, up to 15 MB each.</p></div>
            <div className="entity-document-list">
              {DOCUMENT_REQUIREMENTS.map(([category, title, description]) => (
                <DocumentField
                  key={category}
                  applicationId={application.id}
                  documents={documents}
                  category={category}
                  title={title}
                  description={description}
                  onChanged={refresh}
                />
              ))}
            </div>
          </div>
          <FormFooter saving={saving} label="Save and continue" onBack={() => setStep(0)} />
        </form>
      )}

      {step === 2 && application && (
        <form onSubmit={saveFinancialDetails} className="entity-card">
          <SectionHeading
            icon={ShieldCheck}
            eyebrow="Step 1a"
            title="Financial institution details"
            description="Additional information is required for financial institutions, DABs, VASPs, exchanges and money service businesses."
          />
          <div className="entity-edd-note entity-edd-note-top">
            <ShieldCheck size={18} />
            <div>
              <strong>Enhanced due diligence will be required</strong>
              <span>Your application will be referred to our Compliance team. We will contact you about the EDD process.</span>
            </div>
          </div>
          <div className="entity-form-grid">
            <Input label="Type of financial institution" name="financial_institution_type" required defaultValue={application.financial_institution_type || ""} />
            <Input label="Regulatory registration or licence number" name="regulatory_registration_number" required defaultValue={application.regulatory_registration_number || ""} />
            <Input label="Competent authority" name="competent_authority" required defaultValue={application.competent_authority || ""} />
          </div>
          <div className="entity-subsection">
            <div><h3>Regulatory evidence</h3><p>Provide the current registration or licence.</p></div>
            <DocumentField
              applicationId={application.id}
              documents={documents}
              category="regulatory_licence"
              title="Regulatory registration or licence"
              description="Certificate, register extract or licence document"
              onChanged={refresh}
            />
          </div>
          <FormFooter saving={saving} label="Save and continue" onBack={() => setStep(1)} />
        </form>
      )}

      {step === 3 && application && (
        <div className="entity-card">
          <SectionHeading
            icon={UserRound}
            eyebrow="Step 2"
            title="Connected natural persons"
            description="Add every owner holding 10% or more equity or control, director, officer and authorised signatory."
          />
          <div className="entity-person-list">
            {people.map((person, index) => (
              <ConnectedPersonEditor
                key={person.id}
                person={person}
                index={index}
                documents={documents}
                applicationId={application.id}
                saving={saving}
                onSave={savePerson}
                onDelete={deletePerson}
                onDocumentsChanged={refresh}
              />
            ))}
            {draftPerson && (
              <ConnectedPersonEditor
                person={draftPerson}
                index={people.length}
                documents={documents}
                applicationId={application.id}
                saving={saving}
                onSave={savePerson}
                onDelete={deletePerson}
                onDocumentsChanged={refresh}
              />
            )}
          </div>
          {!draftPerson && (
            <button type="button" className="entity-add-person" onClick={() => setDraftPerson({ ...EMPTY_PERSON })}>
              <Plus size={16} /> Add connected person
            </button>
          )}
          <div className="entity-submit-note">
            <ShieldCheck size={18} />
            <p>
              After submission, the primary contact will complete identity verification here and each other connected
              person will receive a private verification invitation by email. All required checks must be completed
              before Compliance can approve the entity.
            </p>
          </div>
          <FormFooter
            saving={saving}
            label="Submit application"
            type="button"
            onSubmit={submit}
            onBack={() => setStep(application.is_financial_institution ? 2 : 1)}
          />
        </div>
      )}
    </OnboardingShell>
  );
}

function ConnectedPersonEditor({ person, index, documents, applicationId, saving, onSave, onDelete, onDocumentsChanged }) {
  const [draft, setDraft] = useState({ ...EMPTY_PERSON, ...person });
  useEffect(() => setDraft({ ...EMPTY_PERSON, ...person }), [person]);
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const toggleRole = (role) => update(
    "roles",
    draft.roles.includes(role) ? draft.roles.filter((item) => item !== role) : [...draft.roles, role]
  );

  return (
    <div className="entity-person-card">
      <div className="entity-person-header">
        <div><span>Connected person {index + 1}</span><strong>{draft.full_name || "New connected person"}</strong></div>
        <button type="button" onClick={() => onDelete(draft)} disabled={saving}><Trash2 size={16} /> Remove</button>
      </div>
      <div className="entity-role-grid">
        {PERSON_ROLES.map(([value, label]) => (
          <label key={value} className={draft.roles.includes(value) ? "selected" : ""}>
            <input type="checkbox" checked={draft.roles.includes(value)} onChange={() => toggleRole(value)} />
            <span><Check size={13} /> {label}</span>
          </label>
        ))}
      </div>
      <div className="entity-form-grid">
        <Input label="Full legal name" required value={draft.full_name} onChange={(e) => update("full_name", e.target.value)} />
        <Input label="Phone number" type="tel" required value={draft.phone} onChange={(e) => update("phone", e.target.value)} />
        <Input label="Email address" type="email" required value={draft.email} onChange={(e) => update("email", e.target.value)} />
        <CountrySelect label="Nationality" required value={draft.nationality_country_code || ""} onChange={(e) => update("nationality_country_code", e.target.value)} />
        <CountrySelect label="Country of residence" required value={draft.residence_country_code || ""} onChange={(e) => update("residence_country_code", e.target.value)} />
        <Input label="Date of birth" type="date" required value={draft.date_of_birth || ""} onChange={(e) => update("date_of_birth", e.target.value)} />
        <Input label="Tax identification number" required value={draft.tax_identification_number} onChange={(e) => update("tax_identification_number", e.target.value)} />
        <Input label="Ownership percentage" type="number" min="0" max="100" step="0.01" value={draft.ownership_percent ?? ""} onChange={(e) => update("ownership_percent", e.target.value)} hint="Required for beneficial owners." />
        <Textarea label="Residential address" required value={draft.residential_address} onChange={(e) => update("residential_address", e.target.value)} rows={3} />
        <Textarea label="Control description" value={draft.control_description || ""} onChange={(e) => update("control_description", e.target.value)} rows={3} hint="Describe control rights where they are not represented by equity ownership." />
      </div>
      <div className="entity-person-footer">
        <button type="button" className="entity-secondary" onClick={() => onSave(draft)} disabled={saving || !draft.roles.length}>
          {saving ? <Loader2 size={15} className="spin" /> : <Check size={15} />} Save person
        </button>
        {person.id ? (
          <DocumentField
            applicationId={applicationId}
            documents={documents}
            connectedPersonId={person.id}
            category="connected_person_government_id"
            title="Government-issued identification"
            description="Save the person, then upload an unexpired photo ID"
            onChanged={onDocumentsChanged}
          />
        ) : (
          <p className="entity-save-first">Save this person before uploading identification.</p>
        )}
      </div>
    </div>
  );
}

function FormFooter({ saving, label, onBack, type = "submit", onSubmit }) {
  return (
    <div className="entity-form-footer">
      {onBack ? <button type="button" className="entity-back" onClick={onBack}><ArrowLeft size={16} /> Back</button> : <span />}
      <button type={type} className="entity-primary" onClick={onSubmit} disabled={saving}>
        {saving ? <Loader2 size={16} className="spin" /> : null}
        {label} {!saving && <ArrowRight size={16} />}
      </button>
    </div>
  );
}

function OnboardingShell({ step, isFinancial, children }) {
  const stages = [
    [0, "Entity account"],
    [1, "Entity details"],
    ...(isFinancial ? [[2, "Financial details"]] : []),
    [3, "Connected persons"],
    [4, "Identity verification"],
    [5, "Compliance review"],
  ];
  return (
    <main className="entity-onboarding-page">
      <header className="entity-topbar">
        <Link to="/" className="entity-home-link" aria-label="Return to ByteStrike home">
          <img src={logo} alt="ByteStrike" />
        </Link>
        <div><ShieldCheck size={15} /><span>Secure entity onboarding</span></div>
      </header>
      <div className="entity-onboarding-layout">
        <aside>
          <p>Entity application</p>
          <h1>Business verification</h1>
          <span>Complete the required information. You can leave and return without losing saved progress.</span>
          <ol>
            {stages.map(([value, label], index) => (
              <li key={value} className={step === value ? "active" : step > value ? "complete" : ""}>
                <i>{step > value ? <Check size={13} /> : index + 1}</i>
                <div><strong>{label}</strong><small>{step > value ? "Completed" : step === value ? "In progress" : "Not started"}</small></div>
              </li>
            ))}
          </ol>
          <div className="entity-security-note"><ShieldCheck size={17} /><span>Documents are held in a private access-controlled repository.</span></div>
        </aside>
        <section>{children}</section>
      </div>
    </main>
  );
}

function AuthenticatedOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(undefined);
  const [accessChecked, setAccessChecked] = useState(false);
  const userId = session?.user?.id;
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/login", { replace: true });
      setSession(data.session || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) navigate("/login", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setAccessChecked(false);
      return () => { active = false; };
    }
    setAccessChecked(false);

    (async () => {
      try {
        const access = await getEntityAccessState(userId);
        if (!active) return;
        if (access.isAdmin) {
          const nextPath = safeNext(new URLSearchParams(location.search).get("next"));
          navigate(nextPath, { replace: true });
          return;
        }
      } catch (error) {
        // Do not grant an exemption when admin status cannot be verified. The
        // applicant can still use the normal onboarding flow.
        console.warn("[EntityOnboarding] admin exemption check failed:", error.message);
      }
      if (active) setAccessChecked(true);
    })();

    return () => { active = false; };
  }, [userId, location.search, navigate]);

  if (session === undefined || (session && !accessChecked)) return <div className="entity-page-loading"><Loader2 size={22} className="spin" /></div>;
  if (!session) return null;
  return (
    <AccountGate session={session}>
      <MfaGate session={session}>
        <EntityOnboardingFlow user={session.user} />
      </MfaGate>
    </AccountGate>
  );
}

export default AuthenticatedOnboarding;
