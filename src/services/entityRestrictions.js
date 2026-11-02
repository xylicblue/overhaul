import { supabase } from "../creatclient";

const ACTION_LABELS = {
  open_position: "opening a new position",
  close_position: "closing this position",
  margin_change: "changing position margin",
  collateral_deposit: "depositing collateral",
  collateral_withdrawal: "withdrawing collateral",
};

export async function getCurrentEntityTransactionPermissions() {
  const { data, error } = await supabase.rpc("current_entity_transaction_permissions");
  if (error) throw new Error(error.message || "Could not verify transaction permissions.");
  return data || {};
}

export async function assertEntityTransactionAllowed(action) {
  const permissions = await getCurrentEntityTransactionPermissions();
  if (permissions[action] === false) {
    const reason = permissions.reasons?.[action] || permissions.reason;
    throw new Error(reason || `Compliance has temporarily restricted ${ACTION_LABELS[action] || "this activity"}.`);
  }
  return permissions;
}
