async function insertRefreshToken(client, { user_id, token_hash, expires_at }) {
  const result = await client.query(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [user_id, token_hash, expires_at]
  );
  return result.rows[0] || null;
}

async function getRefreshTokenByHash(client, token_hash, forUpdate = false) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const result = await client.query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1${lock}`,
    [token_hash]
  );
  return result.rows[0] || null;
}

async function revokeRefreshToken(client, id) {
  const result = await client.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id]
  );
  return result.rows[0] || null;
}

async function blacklistToken(client, { token_hash, token_type, user_id, expires_at }) {
  const result = await client.query(
    `
      INSERT INTO token_blacklist (token_hash, token_type, user_id, expires_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (token_hash) DO NOTHING
      RETURNING *
    `,
    [token_hash, token_type, user_id || null, expires_at]
  );
  return result.rows[0] || null;
}

async function isTokenBlacklisted(client, token_hash) {
  const result = await client.query(
    `
      SELECT 1
      FROM token_blacklist
      WHERE token_hash = $1
        AND expires_at > NOW()
      LIMIT 1
    `,
    [token_hash]
  );
  return result.rowCount > 0;
}

module.exports = {
  insertRefreshToken,
  getRefreshTokenByHash,
  revokeRefreshToken,
  blacklistToken,
  isTokenBlacklisted,
};
