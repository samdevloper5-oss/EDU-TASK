// Escrow repository (DB-only operations).
// No business rules here; it only executes SQL using the provided client.

async function getEscrowByTaskId(client, taskId, forUpdate = false) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const result = await client.query(
    `SELECT * FROM escrows WHERE task_id = $1${lock}`,
    [taskId]
  );
  return result.rows[0] || null;
}

async function getEscrowById(client, escrowId, forUpdate = false) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const result = await client.query(
    `SELECT * FROM escrows WHERE id = $1${lock}`,
    [escrowId]
  );
  return result.rows[0] || null;
}

async function createEscrow(
  client,
  { task_id, poster_wallet_id, amount, status = "locked" }
) {
  const result = await client.query(
    `
      INSERT INTO escrows (task_id, poster_wallet_id, amount, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [task_id, poster_wallet_id, amount, status]
  );
  return result.rows[0] || null;
}

async function markEscrowReleased(
  client,
  { escrowId, executorWalletId, releaseType, status = "released" }
) {
  const result = await client.query(
    `
      UPDATE escrows
      SET status = $4,
          released_at = NOW(),
          release_type = $3,
          executor_wallet_id = $2
      WHERE id = $1
      RETURNING *
    `,
    [escrowId, executorWalletId, releaseType, status]
  );
  return result.rows[0] || null;
}

async function markEscrowRefunded(
  client,
  { escrowId, releaseType, status = "refunded" }
) {
  const result = await client.query(
    `
      UPDATE escrows
      SET status = $3,
          released_at = NOW(),
          release_type = $2
      WHERE id = $1
      RETURNING *
    `,
    [escrowId, releaseType, status]
  );
  return result.rows[0] || null;
}

module.exports = {
  getEscrowByTaskId,
  getEscrowById,
  createEscrow,
  markEscrowReleased,
  markEscrowRefunded,
};
