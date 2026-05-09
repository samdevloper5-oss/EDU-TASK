// Idempotency repository (DB-only operations).
// No business rules here; it only executes SQL using the provided client.

async function getByKeyForUpdate(client, { user_id, endpoint, idempotency_key }) {
  const result = await client.query(
    `
      SELECT *
      FROM idempotency_keys
      WHERE user_id = $1
        AND endpoint = $2
        AND idempotency_key = $3
      FOR UPDATE
    `,
    [user_id, endpoint, idempotency_key]
  );
  return result.rows[0] || null;
}

async function insertKey(
  client,
  { user_id, endpoint, idempotency_key, request_hash, status = "in_progress" }
) {
  const result = await client.query(
    `
      INSERT INTO idempotency_keys (
        user_id,
        endpoint,
        idempotency_key,
        request_hash,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [user_id, endpoint, idempotency_key, request_hash, status]
  );
  return result.rows[0] || null;
}

async function resetKey(
  client,
  { id, request_hash, status = "in_progress" }
) {
  const result = await client.query(
    `
      UPDATE idempotency_keys
      SET request_hash = $2,
          response_hash = NULL,
          status = $3,
          created_at = NOW(),
          expires_at = NOW() + INTERVAL '24 hours'
      WHERE id = $1
      RETURNING *
    `,
    [id, request_hash, status]
  );
  return result.rows[0] || null;
}

async function markCompleted(client, { id, response_hash }) {
  const result = await client.query(
    `
      UPDATE idempotency_keys
      SET status = 'completed',
          response_hash = $2
      WHERE id = $1
      RETURNING *
    `,
    [id, response_hash]
  );
  return result.rows[0] || null;
}

async function markFailed(client, { id, response_hash = null }) {
  const result = await client.query(
    `
      UPDATE idempotency_keys
      SET status = 'failed',
          response_hash = $2
      WHERE id = $1
      RETURNING *
    `,
    [id, response_hash]
  );
  return result.rows[0] || null;
}

module.exports = {
  getByKeyForUpdate,
  insertKey,
  resetKey,
  markCompleted,
  markFailed,
};
