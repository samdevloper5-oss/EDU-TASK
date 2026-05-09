const { randomUUID } = require("crypto");
const { withSerializableTransaction } = require("../utils/transaction");
const referralRepo = require("../repositories/referral.repo");
const walletRepo = require("../repositories/wallet.repo");
const auditService = require("./audit.service");
const { ApiError } = require("../utils/http");
const { REFERRAL_REWARD_AMOUNT } = require("../constants/financial.constants");

function normalizeCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function generateReferralCode(namePart, userId) {
  const base = (namePart || "EDU")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase();
  const suffix = String(userId || "")
    .replace(/-/g, "")
    .slice(0, 6)
    .toUpperCase();
  return `${base}${suffix}` || `EDU${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function ensureUserReferralCode(client, user) {
  if (user.referral_code) {
    return user.referral_code;
  }
  const proposed = generateReferralCode(user.full_name, user.id);
  const updated = await referralRepo.updateUserReferralMetadata(client, user.id, {
    referral_code: proposed,
  });
  return updated ? updated.referral_code : proposed;
}

async function attachReferralToNewUser(client, { userId, referralCode }) {
  const normalized = normalizeCode(referralCode);
  if (!normalized) {
    return null;
  }
  const referrer = await referralRepo.getUserByReferralCode(client, normalized, true);
  if (!referrer) {
    throw new ApiError(400, "invalid_referral_code", "Referral code is invalid.");
  }
  if (referrer.id === userId) {
    throw new ApiError(400, "invalid_referral_code", "Self referral is not allowed.");
  }
  await referralRepo.updateUserReferralMetadata(client, userId, {
    referred_by: referrer.id,
  });
  return referrer.id;
}

async function creditReferralRewardInTransaction(client, {
  referrerUserId,
  referredUserId,
  milestone,
  rewardAmount = REFERRAL_REWARD_AMOUNT,
  actorUserId = referredUserId,
}) {
  if (!referrerUserId || rewardAmount <= 0) {
    return null;
  }

  const existing = await referralRepo.getReferralReward(
    client,
    referredUserId,
    milestone,
    true
  );
  if (existing) {
    return existing;
  }

  const referrerWallet = await walletRepo.getWalletByUserId(client, referrerUserId, true);
  if (!referrerWallet) {
    throw new ApiError(404, "referrer_wallet_not_found", "Referrer wallet not found.");
  }

  const amount = Number(Number(rewardAmount).toFixed(4));
  const journalId = randomUUID();
  await walletRepo.insertLedgerEntries(client, [
    {
      journal_id: journalId,
      entry_seq: 1,
      wallet_id: referrerWallet.id,
      escrow_id: null,
      user_id: referrerUserId,
      account_code: "platform_referral_expense",
      direction: "debit",
      amount,
      currency: "BDT",
      external_reference: referredUserId,
      description: `Referral reward payout for ${milestone}`,
      metadata: { milestone, referred_user_id: referredUserId },
      created_by: actorUserId,
    },
    {
      journal_id: journalId,
      entry_seq: 2,
      wallet_id: referrerWallet.id,
      escrow_id: null,
      user_id: referrerUserId,
      account_code: "wallet_available",
      direction: "credit",
      amount,
      currency: "BDT",
      external_reference: referredUserId,
      description: `Referral reward credited (${milestone})`,
      metadata: { milestone, referred_user_id: referredUserId },
      created_by: actorUserId,
    },
  ]);

  await walletRepo.updateWalletBalance(
    client,
    referrerWallet.id,
    Number(referrerWallet.balance) + amount,
    Number(referrerWallet.escrow_balance)
  );

  const rewardRow = await referralRepo.createReferralReward(client, {
    referrer_user_id: referrerUserId,
    referred_user_id: referredUserId,
    milestone,
    reward_amount: amount,
    status: "credited",
    ledger_journal_id: journalId,
  });

  await auditService.logEvent(client, {
    user_id: referrerUserId,
    action: "referral_reward_credited",
    entity_type: "referral_reward",
    entity_id: rewardRow ? rewardRow.id : null,
    new_values: { milestone, amount, referred_user_id: referredUserId, journal_id: journalId },
  });

  return rewardRow;
}

async function getMyReferrals(user, { page = 1, limit = 20 } = {}) {
  if (!user || !user.id) {
    throw new ApiError(401, "unauthorized", "Authentication required.");
  }

  return withSerializableTransaction(async (client) => {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const offset = (safePage - 1) * safeLimit;
    const rows = await referralRepo.listReferralsByReferrer(client, user.id, {
      limit: safeLimit,
      offset,
    });
    const total = rows.length > 0 ? Number(rows[0].total_count || 0) : 0;
    const stats = await referralRepo.getReferralStatsByReferrer(client, user.id);
    return {
      rows: rows.map((row) => {
        const { total_count, ...rest } = row;
        return rest;
      }),
      stats: {
        total_referrals: Number(stats.total_referrals || 0),
        reward_amount: Number(stats.reward_amount || 0),
      },
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
      },
    };
  }, { operation: "referral_list_me" });
}

async function getMyReferralStats(user) {
  if (!user || !user.id) {
    throw new ApiError(401, "unauthorized", "Authentication required.");
  }
  return withSerializableTransaction(async (client) => {
    const stats = await referralRepo.getReferralStatsByReferrer(client, user.id);
    return {
      total_referrals: Number(stats.total_referrals || 0),
      reward_amount: Number(stats.reward_amount || 0),
    };
  }, { operation: "referral_stats_me" });
}

module.exports = {
  normalizeCode,
  ensureUserReferralCode,
  attachReferralToNewUser,
  creditReferralRewardInTransaction,
  getMyReferrals,
  getMyReferralStats,
};
