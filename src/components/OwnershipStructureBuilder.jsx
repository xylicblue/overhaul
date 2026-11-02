import React, { useMemo } from "react";
import { Building2, ChevronRight, Plus, Trash2, UserRound, UsersRound } from "lucide-react";
import {
  analyseOwnershipStructure,
  createOwnershipNode,
  removeOwnershipNode,
  updateOwnershipNode,
} from "../utils/ownershipStructure";

function OwnerNode({ node, depth, people, onChange, onRemove }) {
  const set = (key, value) => onChange(node.id, (current) => ({
    ...current,
    [key]: value,
    ...(key === "type" && value === "individual" ? { children: [] } : {}),
  }));
  const addChild = (type) => onChange(node.id, (current) => ({
    ...current,
    children: [...(current.children || []), createOwnershipNode(type)],
  }));

  return (
    <div className="ownership-node" style={{ "--ownership-depth": depth }}>
      <div className="ownership-node-head">
        <span className="ownership-node-icon">
          {node.type === "individual" ? <UserRound size={16} /> : <Building2 size={16} />}
        </span>
        <div>
          <strong>{node.name || (node.type === "individual" ? "Natural person" : "Corporate owner")}</strong>
          <small>{depth === 0 ? "Direct owner of the applicant" : `Ownership layer ${depth + 1}`}</small>
        </div>
        <button type="button" className="ownership-remove" onClick={() => onRemove(node.id)} aria-label="Remove owner">
          <Trash2 size={15} />
        </button>
      </div>

      <div className="ownership-node-grid">
        <label className="entity-field">
          <span>Owner type</span>
          <select value={node.type} onChange={(event) => set("type", event.target.value)}>
            <option value="entity">Company or legal arrangement</option>
            <option value="individual">Natural person</option>
          </select>
        </label>
        <label className="entity-field">
          <span>{node.type === "individual" ? "Legal name" : "Entity name"}</span>
          <input value={node.name || ""} onChange={(event) => set("name", event.target.value)} placeholder="Full legal name" />
        </label>
        <label className="entity-field">
          <span>Ownership in entity below</span>
          <div className="ownership-percent-input">
            <input type="number" min="0.01" max="100" step="0.01" value={node.percentage ?? ""} onChange={(event) => set("percentage", event.target.value)} placeholder="0.00" />
            <b>%</b>
          </div>
        </label>
        <label className="entity-field">
          <span>Jurisdiction</span>
          <input value={node.jurisdiction || ""} onChange={(event) => set("jurisdiction", event.target.value)} placeholder="Country or jurisdiction" />
        </label>
        {node.type === "individual" && (
          <label className="entity-field entity-field-wide">
            <span>Linked connected-person record</span>
            <select value={node.connected_person_id || ""} onChange={(event) => set("connected_person_id", event.target.value)}>
              <option value="">Select the matching beneficial owner</option>
              {people.filter((person) => person.roles?.includes("beneficial_owner")).map((person) => (
                <option key={person.id} value={person.id}>{person.full_name}</option>
              ))}
            </select>
            <small>Required when this person's effective ownership is 10% or more.</small>
          </label>
        )}
      </div>

      {node.type === "entity" && (
        <div className="ownership-children">
          <div className="ownership-children-head">
            <span><ChevronRight size={14} /> Owners of {node.name || "this entity"}</span>
            <div>
              <button type="button" onClick={() => addChild("entity")}><Plus size={13} /> Entity</button>
              <button type="button" onClick={() => addChild("individual")}><Plus size={13} /> Person</button>
            </div>
          </div>
          {(node.children || []).map((child) => (
            <OwnerNode
              key={child.id}
              node={child}
              depth={depth + 1}
              people={people}
              onChange={onChange}
              onRemove={onRemove}
            />
          ))}
          {!node.children?.length && <p className="ownership-empty">Add every owner of this entity until each branch reaches natural persons.</p>}
        </div>
      )}
    </div>
  );
}

export default function OwnershipStructureBuilder({ value, people, onChange, onSave, saving }) {
  const structure = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const analysis = useMemo(() => analyseOwnershipStructure(structure, people), [structure, people]);
  const changeNode = (nodeId, updater) => onChange(updateOwnershipNode(structure, nodeId, updater));
  const removeNode = (nodeId) => onChange(removeOwnershipNode(structure, nodeId));

  return (
    <section className="ownership-builder">
      <div className="ownership-builder-intro">
        <span className="ownership-builder-mark"><UsersRound size={18} /></span>
        <div>
          <h3>Ownership map</h3>
          <p>Map direct and indirect ownership through every intermediary until each branch reaches natural persons. Every entity layer must total 100%.</p>
        </div>
        <div className={`ownership-total ${Math.abs(analysis.directTotal - 100) <= 0.01 ? "is-complete" : ""}`}>
          <strong>{analysis.directTotal.toFixed(2)}%</strong>
          <small>Applicant mapped</small>
        </div>
      </div>

      <div className="ownership-actions">
        <button type="button" onClick={() => onChange([...structure, createOwnershipNode("entity")])}><Plus size={14} /> Direct entity owner</button>
        <button type="button" onClick={() => onChange([...structure, createOwnershipNode("individual")])}><Plus size={14} /> Direct natural owner</button>
      </div>

      <div className="ownership-tree">
        {structure.map((node) => (
          <OwnerNode key={node.id} node={node} depth={0} people={people} onChange={changeNode} onRemove={removeNode} />
        ))}
        {!structure.length && (
          <div className="ownership-empty-state">
            <Building2 size={22} />
            <strong>Start with the applicant's direct shareholders</strong>
            <p>Add companies and natural persons at the first ownership level.</p>
          </div>
        )}
      </div>

      {analysis.naturalOwners.length > 0 && (
        <div className="ownership-calculator">
          <div><strong>Effective ownership calculator</strong><small>Each result multiplies the percentages along its ownership path.</small></div>
          {analysis.naturalOwners.map((owner) => (
            <div key={owner.id} className="ownership-result">
              <span><b>{owner.name || "Unnamed person"}</b><small>{owner.path.join(" → ")}</small></span>
              <strong>{owner.effectivePercentage.toFixed(2)}%</strong>
            </div>
          ))}
        </div>
      )}

      {analysis.errors.length > 0 && (
        <div className="ownership-errors">
          {analysis.errors.slice(0, 5).map((error) => <p key={error}>{error}</p>)}
        </div>
      )}

      <div className="ownership-save-row">
        <p>Natural persons at or above the 10% threshold must be listed as beneficial owners and linked above.</p>
        <button type="button" onClick={onSave} disabled={saving || !analysis.complete}>{saving ? "Saving…" : "Save ownership map"}</button>
      </div>
    </section>
  );
}
