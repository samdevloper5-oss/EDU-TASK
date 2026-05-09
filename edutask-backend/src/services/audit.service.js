// Audit service (business-rule-free logging orchestration).
// Uses repositories to persist audit logs inside existing transactions.

const auditRepo = require("../repositories/audit.repo");
const { increment } = require("../middlewares/metrics.middleware");

async function logEvent(
  client,
  { user_id, action, entity_type, entity_id, old_values, new_values }
) {
  if (!client) {
    throw new Error("DB client is required for audit logging.");
  }
  if (action === "escrow_released") {
    increment("escrow_release_total");
  } else if (action === "escrow_refunded") {
    increment("escrow_refund_total");
  } else if (action === "dispute_created") {
    increment("dispute_created_total");
  } else if (action === "dispute_resolved") {
    increment("dispute_resolved_total");
  } else if (action === "task_expired_auto_refund") {
    increment("automation_expire_total");
  }

  return auditRepo.insertAuditLog(client, {
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
  });
}

module.exports = {
  logEvent,
};
