const round = (value, places = 4) => {
  const scale = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * scale) / scale;
};

export function createOwnershipNode(type = "entity") {
  return {
    id: globalThis.crypto?.randomUUID?.() || `owner-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    name: "",
    percentage: "",
    jurisdiction: "",
    connected_person_id: "",
    children: [],
  };
}

export function updateOwnershipNode(nodes, nodeId, updater) {
  return (nodes || []).map((node) => {
    if (node.id === nodeId) return updater(node);
    return { ...node, children: updateOwnershipNode(node.children || [], nodeId, updater) };
  });
}

export function removeOwnershipNode(nodes, nodeId) {
  return (nodes || [])
    .filter((node) => node.id !== nodeId)
    .map((node) => ({ ...node, children: removeOwnershipNode(node.children || [], nodeId) }));
}

export function analyseOwnershipStructure(structure, connectedPeople = [], threshold = 10) {
  const errors = [];
  const naturalOwners = [];
  const seenIds = new Set();
  const peopleById = new Map((connectedPeople || []).map((person) => [person.id, person]));

  const walk = (nodes, parentEffective = 100, path = ["Applicant"], depth = 1) => {
    if (depth > 8) {
      errors.push("Ownership structures are limited to eight layers.");
      return;
    }
    const total = (nodes || []).reduce((sum, node) => sum + Number(node.percentage || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      errors.push(`${path.join(" → ")} is mapped to ${round(total, 2)}%; it must total 100%.`);
    }

    (nodes || []).forEach((node) => {
      if (!node?.id || seenIds.has(node.id)) errors.push("Every ownership entry must have a unique identifier.");
      if (node?.id) seenIds.add(node.id);
      if (!["entity", "individual"].includes(node?.type)) errors.push("Every owner must be an entity or a natural person.");
      if (!String(node?.name || "").trim()) errors.push("Name every entity and natural person in the ownership chain.");
      const percentage = Number(node?.percentage);
      if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
        errors.push(`${node?.name || "An owner"} needs a percentage between 0 and 100.`);
        return;
      }
      const effective = round(parentEffective * percentage / 100);
      const nextPath = [...path, String(node.name || "Unnamed owner")];

      if (node.type === "entity") {
        if (!(node.children || []).length) {
          errors.push(`Map the natural-person owners behind ${node.name || "each corporate shareholder"}.`);
        } else {
          walk(node.children, effective, nextPath, depth + 1);
        }
        return;
      }

      if ((node.children || []).length) errors.push(`${node.name || "A natural person"} cannot have another ownership layer.`);
      const person = peopleById.get(node.connected_person_id);
      if (effective >= threshold && (!person || !(person.roles || []).includes("beneficial_owner"))) {
        errors.push(`${node.name || "A natural person"} holds ${round(effective, 2)}% effectively and must be linked to a beneficial-owner record.`);
      }
      naturalOwners.push({
        id: node.id,
        name: node.name,
        connectedPersonId: node.connected_person_id || null,
        effectivePercentage: effective,
        directPercentage: percentage,
        path: nextPath.slice(1),
        requiresUboRecord: effective >= threshold,
      });
    });
  };

  if (!(structure || []).length) errors.push("Add the applicant's direct shareholders and map 100% of the ownership.");
  else walk(structure);

  return {
    directTotal: round((structure || []).reduce((sum, node) => sum + Number(node.percentage || 0), 0), 2),
    naturalOwners,
    errors: [...new Set(errors)],
    complete: errors.length === 0,
  };
}

export function ownershipPercentageForPerson(structure, connectedPersonId) {
  return analyseOwnershipStructure(structure, []).naturalOwners
    .filter((owner) => owner.connectedPersonId === connectedPersonId)
    .reduce((sum, owner) => sum + owner.effectivePercentage, 0);
}
