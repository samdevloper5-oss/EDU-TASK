// Dispute repository (DB-only operations).
// No business rules here; it only executes SQL using the provided client.

async function createDispute(client, data) {
  const { task_id, filed_by_user_id, dispute_type, description, evidence } = data;

  const query = `
    INSERT INTO disputes (
      task_id,
      filed_by_user_id,
      dispute_type,
      status,
      description,
      evidence
    )
    VALUES ($1, $2, $3, 'pending', $4, $5)
    RETURNING *
  `;

  const values = [
    task_id,
    filed_by_user_id,
    dispute_type,
    description,
    evidence || null,
  ];

  const result = await client.query(query, values);
  return result.rows[0];
}

async function getDisputeByTaskId(client, taskId, forUpdate = false) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const result = await client.query(
    `SELECT * FROM disputes WHERE task_id = $1${lock}`,
    [taskId]
  );
  return result.rows[0] || null;
}

async function getDisputeById(client, disputeId, forUpdate = false) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const result = await client.query(
    `SELECT * FROM disputes WHERE id = $1${lock}`,
    [disputeId]
  );
  return result.rows[0] || null;
}

async function updateDisputeAutoResolved(
  client,
  disputeId,
  autoResolutionReason
) {
  const result = await client.query(
    `
      UPDATE disputes
      SET status = 'auto_resolved',
          auto_resolved = TRUE,
          auto_resolution_reason = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [disputeId, autoResolutionReason]
  );
  return result.rows[0] || null;
}

async function resolveDispute(
  client,
  disputeId,
  adminUserId,
  adminDecision,
  adminDecisionFundAllocation
) {
  const result = await client.query(
    `
      UPDATE disputes
      SET status = 'resolved',
          assigned_admin_id = $2,
          admin_decision = $3,
          admin_decision_fund_allocation = $4,
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [disputeId, adminUserId, adminDecision, adminDecisionFundAllocation || null]
  );
  return result.rows[0] || null;
}

module.exports = {
  createDispute,
  getDisputeByTaskId,
  getDisputeById,
  updateDisputeAutoResolved,
  resolveDispute,
};
