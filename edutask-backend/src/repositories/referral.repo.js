async function getUserByReferralCode(client, referralCode, forUpdate = false) {
  if (!referralCode) return null;
  const lock = forUpdate ? " FOR UPDATE" : "";
  const result = await client.query(
    `
      SELECT id, referral_code
      FROM users
      WHERE referral_code = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
      ${lock}
    `,
    [String(referralCode).trim().toUpperCase()]
  );
  return result.rows[0] || null;
}

async function updateUserReferralMetadata(client, userId, data) {
  const { referral_code, referred_by } = data;
  const result = await client.query(
    `
      UPDATE users
      SET referral_code = COALESCE($2, referral_code),
          referred_by = COALESCE($3, referred_by)
      WHERE id = $1
      RETURNING id, referral_code, referred_by
    `,
    [userId, referral_code || null, referred_by || null]
  );
  return result.rows[0] || null;
}

async function getReferralReward(client, referredUserId, milestone, forUpdate = false) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const result = await client.query(
    `
      SELECT *
      FROM referral_rewards
      WHERE referred_user_id = $1
        AND milestone = $2
      ${lock}
    `,
    [referredUserId, milestone]
  );
  return result.rows[0] || null;
}

async function createReferralReward(client, data) {
  const {
    referrer_user_id,
    referred_user_id,
    milestone,
    reward_amount,
    status = "credited",
    ledger_journal_id = null,
  } = data;
  const result = await client.query(
    `
      INSERT INTO referral_rewards (
        referrer_user_id,
        referred_user_id,
        milestone,
        reward_amount,
        status,
        ledger_journal_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (referred_user_id, milestone) DO NOTHING
      RETURNING *
    `,
    [
      referrer_user_id,
      referred_user_id,
      milestone,
      reward_amount,
      status,
      ledger_journal_id,
    ]
  );
  return result.rows[0] || null;
}

async function getReferralStatsByReferrer(client, referrerUserId) {
  const result = await client.query(
    `
      SELECT
        COUNT(*)::int AS total_referrals,
        COALESCE(SUM(rr.reward_amount), 0)::numeric AS reward_amount
      FROM users u
      LEFT JOIN referral_rewards rr
        ON rr.referred_user_id = u.id
      WHERE u.referred_by = $1
    `,
    [referrerUserId]
  );
  return result.rows[0] || { total_referrals: 0, reward_amount: 0 };
}

async function listReferralsByReferrer(client, referrerUserId, { limit = 20, offset = 0 } = {}) {
  const result = await client.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.created_at,
        COALESCE(SUM(rr.reward_amount), 0)::numeric AS reward_amount,
        COUNT(rr.id)::int AS reward_events,
        COUNT(*) OVER()::int AS total_count
      FROM users u
      LEFT JOIN referral_rewards rr ON rr.referred_user_id = u.id
      WHERE u.referred_by = $1
      GROUP BY u.id, u.full_name, u.email, u.created_at
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [referrerUserId, limit, offset]
  );
  return result.rows;
}

module.exports = {
  getUserByReferralCode,
  updateUserReferralMetadata,
  getReferralReward,
  createReferralReward,
  getReferralStatsByReferrer,
  listReferralsByReferrer,
};
