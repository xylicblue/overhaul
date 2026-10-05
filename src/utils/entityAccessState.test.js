import test from "node:test";
import assert from "node:assert/strict";
import { entityAccessFreshnessMs, normalizeEntityAccessState } from "./entityAccessState.js";

test("approved membership remains complete when the current JWT is temporarily aal1", () => {
  const access = normalizeEntityAccessState({
    onboarding_complete: false,
    membership_found: true,
    mfa_complete: false,
    application: { id: "application-1", status: "approved" },
  });

  assert.equal(access.onboardingComplete, true);
  assert.equal(access.membershipFound, true);
  assert.equal(access.mfaComplete, false);
});

test("an unapproved application is never promoted by the client normalizer", () => {
  const access = normalizeEntityAccessState({
    onboarding_complete: false,
    membership_found: false,
    application: { id: "application-1", status: "under_review" },
  });

  assert.equal(access.onboardingComplete, false);
});

test("approved access uses the longer cache window", () => {
  assert.equal(entityAccessFreshnessMs({ onboardingComplete: true }), 5 * 60_000);
  assert.equal(entityAccessFreshnessMs({ onboardingComplete: false }), 15_000);
});
