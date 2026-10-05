import test from "node:test";
import assert from "node:assert/strict";
import { isNotificationForUser } from "./notificationAudience.js";

test("global notifications are visible to every signed-in user", () => {
  assert.equal(isNotificationForUser({ recipient_id: null }, "user-a"), true);
});

test("targeted notifications are visible only to their recipient", () => {
  assert.equal(isNotificationForUser({ recipient_id: "user-a" }, "user-a"), true);
  assert.equal(isNotificationForUser({ recipient_id: "user-a" }, "admin-b"), false);
});

test("notifications are not exposed without an authenticated user", () => {
  assert.equal(isNotificationForUser({ recipient_id: null }, null), false);
});
