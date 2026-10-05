export function normalizeEntityAccessState(data) {
  const membershipFound = data?.membership_found === true;
  const application = data?.application || null;
  const approvedMembership = membershipFound && application?.status === "approved";

  return {
    isAdmin: data?.is_admin === true,
    // Compliance approval and MFA are separate controls. Older versions of
    // the RPC returned onboarding_complete=false whenever the current JWT was
    // aal1, even though the entity membership remained approved.
    onboardingComplete: data?.onboarding_complete === true || approvedMembership,
    collectionComplete: data?.collection_complete === true,
    application,
    schemaAvailable: data?.schema_available !== false,
    membershipFound,
    mfaComplete: data?.mfa_complete === true,
    memberType: data?.member_type || null,
    entityRoles: data?.entity_roles || [],
  };
}

export function entityAccessFreshnessMs(access) {
  // Pending applications refresh quickly so a new approval appears promptly.
  // Approved memberships are stable and can be reused across ordinary route,
  // focus and visibility events without repeatedly calling PostgREST.
  return access?.isAdmin || access?.onboardingComplete ? 5 * 60_000 : 15_000;
}
