// Wallet and ledger repository (SQL-only).
// Business rules and invariants are enforced in services.

async function createWallet(client, user_id) {
  if (!user_id) {
    throw new Error("user_id is required to create a wallet.");
  }

  const result = await client.query(
    `
      INSERT INTO wallets (user_id)
      VALUES ($1)
      RETURNING *
    `,
    [user_id]
  );
  return result.rows[0] || null;
}

async function getWalletByUserId(client, user_id, forUpdate = false) {
  if (!user_id) {
    throw new Error("user_id is required to fetch wallet.");
  }

  const lock = forUpdate ? " FOR UPDATE" : "";
  const result = await client.query(
    `SELECT * FROM wallets WHERE user_id = $1${lock}`,
    [user_id]
  );
  return result.rows[0] || null;
}

async function getWalletById(client, wallet_id, forUpdate = false) {
  if (!wallet_id) {
    throw new Error("wallet_id is required to fetch wallet.");
  }

  const lock = forUpdate ? " FOR UPDATE" : "";
  const result = await client.query(
    `SELECT * FROM wallets WHERE id = $1${lock}`,
    [wallet_id]
  );
  return result.rows[0] || null;
}

async function armWalletBalanceMutationGuard(client) {
  await client.query(
    "SELECT set_config('app.allow_wallet_balance_update', 'on', true)"
  );
}

async function updateWalletBalance(client, wallet_id, balance, escrow_balance) {
  // DB trigger requires this guard flag for ledger-authoritative balance updates.
  await armWalletBalanceMutationGuard(client);
  const result = await client.query(
    `
      UPDATE wallets
      SET balance = $2,
          escrow_balance = $3
      WHERE id = $1
      RETURNING *
    `,
    [wallet_id, balance, escrow_balance]
  );
  return result.rows[0] || null;
}

async function insertLedgerEntries(client, entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("entries is required to insert ledger rows.");
  }

  const values = [];
  const placeholders = entries.map((entry, idx) => {
    const base = idx * 13;
    values.push(
      entry.journal_id,
      entry.entry_seq,
      entry.wallet_id ?? null,
      entry.escrow_id ?? null,
      entry.user_id ?? null,
      entry.account_code,
      entry.direction,
      entry.amount,
      entry.currency ?? "BDT",
      entry.external_reference ?? null,
      entry.description ?? null,
      entry.metadata ?? null,
      entry.created_by ?? null
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13})`;
  });

  const result = await client.query(
    `
      INSERT INTO ledger_entries (
        journal_id,
        entry_seq,
        wallet_id,
        escrow_id,
        user_id,
        account_code,
        direction,
        amount,
        currency,
        external_reference,
        description,
        metadata,
        created_by
      )
      VALUES ${placeholders.join(", ")}
      RETURNING *
    `,
    values
  );
  return result.rows;
}

async function listLedgerEntriesByTaskId(client, taskId) {
  const result = await client.query(
    `
      SELECT le.*
      FROM ledger_entries le
      JOIN escrows e ON e.id = le.escrow_id
      WHERE e.task_id = $1
      ORDER BY le.created_at DESC, le.entry_seq ASC
    `,
    [taskId]
  );
  return result.rows;
}

async function listLedgerEntriesByWalletId(
  client,
  walletId,
  { limit = 20, offset = 0 } = {}
) {
  const result = await client.query(
    `
      SELECT
        le.*,
        COUNT(*) OVER()::int AS total_count
      FROM ledger_entries le
      WHERE le.wallet_id = $1
      ORDER BY le.created_at DESC, le.entry_seq DESC
      LIMIT $2 OFFSET $3
    `,
    [walletId, limit, offset]
  );
  return result.rows;
}

async function createWithdrawalRequest(client, data) {
  const {
    user_id,
    wallet_id,
    amount,
    status = "pending",
    idempotency_key = null,
    metadata = null,
  } = data;

  const result = await client.query(
    `
      INSERT INTO withdrawal_requests (
        user_id,
        wallet_id,
        amount,
        status,
        idempotency_key,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [user_id, wallet_id, amount, status, idempotency_key, metadata]
  );
  return result.rows[0] || null;
}

async function getWithdrawalRequestById(client, requestId, forUpdate = false) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const result = await client.query(
    `SELECT * FROM withdrawal_requests WHERE id = $1${lock}`,
    [requestId]
  );
  return result.rows[0] || null;
}

async function updateWithdrawalRequestStatus(
  client,
  requestId,
  {
    status,
    approved_by_admin_id = null,
    external_reference = null,
    failure_reason = null,
  }
) {
  const result = await client.query(
    `
      UPDATE withdrawal_requests
      SET status = $2,
          approved_by_admin_id = COALESCE($3, approved_by_admin_id),
          external_reference = COALESCE($4, external_reference),
          failure_reason = $5,
          approved_at = CASE
            WHEN $2 IN ('approved', 'processing', 'paid', 'failed', 'cancelled')
              THEN COALESCE(approved_at, NOW())
            ELSE approved_at
          END,
          processed_at = CASE
            WHEN $2 IN ('paid', 'failed', 'cancelled')
              THEN COALESCE(processed_at, NOW())
            ELSE processed_at
          END
      WHERE id = $1
      RETURNING *
    `,
    [requestId, status, approved_by_admin_id, external_reference, failure_reason]
  );
  return result.rows[0] || null;
}

async function getOutstandingWithdrawalTotal(client, userId) {
  const result = await client.query(
    `
      SELECT COALESCE(SUM(amount), 0)::numeric AS total
      FROM withdrawal_requests
      WHERE user_id = $1
        AND status IN ('pending', 'approved', 'processing')
    `,
    [userId]
  );
  return result.rows[0] ? Number(result.rows[0].total || 0) : 0;
}

async function getPendingWithdrawalSummary(client, userId) {
  const result = await client.query(
    `
      SELECT
        COALESCE(SUM(amount), 0)::numeric AS total,
        COUNT(*)::int AS count
      FROM withdrawal_requests
      WHERE user_id = $1
        AND status IN ('pending', 'approved', 'processing')
    `,
    [userId]
  );
  return {
    total: result.rows[0] ? Number(result.rows[0].total || 0) : 0,
    count: result.rows[0] ? Number(result.rows[0].count || 0) : 0,
  };
}

async function listWithdrawalRequestsByUserId(
  client,
  userId,
  { status, limit = 20, offset = 0 } = {}
) {
  const values = [userId];
  const where = ["user_id = $1"];
  if (status) {
    values.push(status);
    where.push(`status = $${values.length}`);
  }
  values.push(limit);
  const limitParam = values.length;
  values.push(offset);
  const offsetParam = values.length;

  const result = await client.query(
    `
      SELECT
        wr.*,
        COUNT(*) OVER()::int AS total_count
      FROM withdrawal_requests wr
      WHERE ${where.join(" AND ")}
      ORDER BY wr.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `,
    values
  );
  return result.rows;
}

module.exports = {
  createWallet,
  getWalletByUserId,
  getWalletById,
  armWalletBalanceMutationGuard,
  updateWalletBalance,
  insertLedgerEntries,
  listLedgerEntriesByTaskId,
  listLedgerEntriesByWalletId,
  createWithdrawalRequest,
  getWithdrawalRequestById,
  updateWithdrawalRequestStatus,
  getOutstandingWithdrawalTotal,
  getPendingWithdrawalSummary,
  listWithdrawalRequestsByUserId,
};
