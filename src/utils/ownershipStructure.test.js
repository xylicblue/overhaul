import test from "node:test";
import assert from "node:assert/strict";
import { analyseOwnershipStructure } from "./ownershipStructure.js";

test("calculates effective ownership across parallel corporate branches", () => {
  const structure = [
    {
      id: "x", type: "entity", name: "Company X", percentage: 60, children: [
        { id: "a", type: "individual", name: "A", percentage: 50, connected_person_id: "a", children: [] },
        { id: "b", type: "individual", name: "B", percentage: 50, connected_person_id: "b", children: [] },
      ],
    },
    { id: "c", type: "individual", name: "C", percentage: 40, connected_person_id: "c", children: [] },
  ];
  const people = ["a", "b", "c"].map((id) => ({ id, roles: ["beneficial_owner"] }));
  const result = analyseOwnershipStructure(structure, people);
  assert.equal(result.complete, true);
  assert.deepEqual(result.naturalOwners.map((owner) => owner.effectivePercentage), [30, 30, 40]);
});

test("flags an incomplete intermediary and an unlinked material UBO", () => {
  const result = analyseOwnershipStructure([
    { id: "x", type: "entity", name: "Company X", percentage: 90, children: [] },
    { id: "a", type: "individual", name: "A", percentage: 10, connected_person_id: "", children: [] },
  ]);
  assert.equal(result.complete, false);
  assert.match(result.errors.join(" "), /Company X/);
  assert.match(result.errors.join(" "), /beneficial-owner record/);
});
