// Wallet service (materialized wallet model + ledger-authoritative journals).
// All money movement writes balanced ledger_entries and updates wallets.balance
// / wallets.escrow_balance atomically inside SERIALIZABLE transactions.

const { randomUUID } = require("crypto");
const { withSerializableTransaction } = require("../utils/transaction");
const walletRepo = require("../repositories/wallet.repo");
const userRepo = require("../repositories/user.repo");
const auditService = require("./audit.service");
const referralService = require("./referral.service");
const { ApiError } = require("../utils/http");
const {
  PAYMENT_PROCESSING_FEE_RATE,
  TASK_COMMISSION_RATE,
  MIN_WITHDRAWAL_BDT,
} = require("../constants/financial.constants");

function roundMoney(value) {
  return Number(Number(value).toFixed(4));
}

function assertPositiveAmount(amount) {
  if (amount == null || Number(amount) <= 0) {
    throw new ApiError(400, "invalid_amount", "amount must be a positive number.");
  }
}

function assertActiveUser(user) {
  if (!user || !user.id) {
    throw new ApiError(401, "unauthorized", "Authenticated user is required.");
  }
  if (user.is_active === false) {
    throw new ApiError(403, "user_inactive", "Inactive users cannot perform wallet actions.");
  }
  if (user.is_suspended === true) {
    throw new ApiError(403, "user_suspended", "Suspended users cannot perform wallet actions.");
  }
}

function normalizeUserInput(userOrUserId) {
  if (typeof userOrUserId === "string") {
    return { id: userOrUserId };
  }
  return userOrUserId;
}

function makeEntry({
  journal_id,
  entry_seq,
  wallet_id,
  escrow_id,
  user_id,
  account_code,
  direction,
  amount,
  external_reference = null,
  description = null,
  metadata = null,
  created_by = null,
}) {
  return {
    journal_id,
    entry_seq,
    wallet_id,
    escrow_id,
    user_id,
    account_code,
    direction,
    amount: roundMoney(amount),
    currency: "BDT",
    external_reference,
    description,
    metadata,
    created_by,
  };
}

function assertBalanced(entries) {
  const totals = entries.reduce(
    (acc, row) => {
      if (row.direction === "credit") {
        acc.credit += Number(row.amount);
      } else if (row.direction === "debit") {
        acc.debit += Number(row.amount);
      } else {
        throw new ApiError(
          500,
          "ledger_direction_invalid",
          "Ledger direction must be 'debit' or 'credit'."
        );
      }
      return acc;
    },
    { debit: 0, credit: 0 }
  );

  if (entries.length < 2) {
    throw new ApiError(
      500,
      "ledger_journal_invalid",
      "Each financial journal must have at least two entries."
    );
  }
  if (roundMoney(totals.debit) !== roundMoney(totals.credit)) {
    throw new ApiError(500, "ledger_unbalanced", "Ledger journal is unbalanced.");
  }
}

async function postBalancedJournal(client, entries) {
  assertBalanced(entries);
  return walletRepo.insertLedgerEntries(client, entries);
}

function calculateProcessingFee(amount) {
  return roundMoney(Number(amount) * PAYMENT_PROCESSING_FEE_RATE);
}

function calculateTaskCommission(amount) {
  return roundMoney(Number(amount) * TASK_COMMISSION_RATE);
}

function buildFeeMetadata(baseAmount, feeAmount) {
  return {
    platform_fee_rate: PAYMENT_PROCESSING_FEE_RATE,
    base_amount: roundMoney(baseAmount),
    fee_amount: roundMoney(feeAmount),
  };
}

async function getWallet(userOrUserId) {
  return withSerializableTransaction(async (client) => {
    const actor = normalizeUserInput(userOrUserId);
    if (!actor || !actor.id) {
      throw new ApiError(400, "invalid_user", "userId is required.");
    }
    const wallet = await walletRepo.getWalletByUserId(client, actor.id, false);
    if (!wallet) {
      throw new ApiError(404, "wallet_not_found", "Wallet not found for user.");
    }
    const pending = await walletRepo.getPendingWithdrawalSummary(client, actor.id);
    return {
      ...wallet,
      pending_withdrawal_total: pending.total,
      pending_withdrawal_count: pending.count,
    };
  });
}

async function listWalletTransactions(userOrUserId, { page = 1, limit = 20 } = {}) {
  return withSerializableTransaction(async (client) => {
    const actor = normalizeUserInput(userOrUserId);
    if (!actor || !actor.id) {
      throw new ApiError(400, "invalid_user", "userId is required.");
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const wallet = await walletRepo.getWalletByUserId(client, actor.id, false);
    if (!wallet) {
      throw new ApiError(404, "wallet_not_found", "Wallet not found for user.");
    }

    const rows = await walletRepo.listLedgerEntriesByWalletId(client, wallet.id, {
      limit: safeLimit,
      offset,
    });
    const total = rows.length > 0 ? rows[0].total_count : 0;

    return {
      rows: rows.map((row) => {
        const { total_count, ...entry } = row;
        return entry;
      }),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
      },
    };
  });
}

async function listWithdrawalRequests(userOrUserId, { page = 1, limit = 20, status } = {}) {
  return withSerializableTransaction(async (client) => {
    const actor = normalizeUserInput(userOrUserId);
    if (!actor || !actor.id) {
      throw new ApiError(400, "invalid_user", "userId is required.");
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;
    const normalizedStatus = status ? String(status).toLowerCase() : null;

    const rows = await walletRepo.listWithdrawalRequestsByUserId(client, actor.id, {
      status: normalizedStatus && normalizedStatus !== "all" ? normalizedStatus : undefined,
      limit: safeLimit,
      offset,
    });
    const total = rows.length > 0 ? Number(rows[0].total_count || 0) : 0;

    return {
      rows: rows.map((row) => {
        const { total_count, ...request } = row;
        return request;
      }),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
      },
    };
  });
}

// Escrow helpers. Called by escrow.service inside caller-owned transaction.
async function applyEscrowLock(client, wallet, amount, options = {}) {
  assertPositiveAmount(amount);
  const {
    relatedEscrowId = null,
    relatedTaskId = null,
    journalId = randomUUID(),
    journalSeqStart = 1,
    actorUserId = wallet.user_id,
  } = options;

  const balanceBefore = Number(wallet.balance);
  const escrowBefore = Number(wallet.escrow_balance);
  if (balanceBefore < Number(amount)) {
    throw new ApiError(
      409,
      "insufficient_wallet_balance",
      "Insufficient wallet balance to lock escrow."
    );
  }

  const balanceAfter = roundMoney(balanceBefore - Number(amount));
  const escrowAfter = roundMoney(escrowBefore + Number(amount));

  await postBalancedJournal(client, [
    makeEntry({
      journal_id: journalId,
      entry_seq: journalSeqStart,
      wallet_id: wallet.id,
      escrow_id: relatedEscrowId,
      user_id: wallet.user_id,
      account_code: "wallet_available",
      direction: "debit",
      amount,
      external_reference: relatedTaskId,
      description: "Escrow lock debit from available balance",
      created_by: actorUserId,
    }),
    makeEntry({
      journal_id: journalId,
      entry_seq: journalSeqStart + 1,
      wallet_id: wallet.id,
      escrow_id: relatedEscrowId,
      user_id: wallet.user_id,
      account_code: "wallet_escrow",
      direction: "credit",
      amount,
      external_reference: relatedTaskId,
      description: "Escrow lock credit to escrow balance",
      created_by: actorUserId,
    }),
  ]);

  await walletRepo.updateWalletBalance(client, wallet.id, balanceAfter, escrowAfter);
  return {
    journal_id: journalId,
    balance_after: balanceAfter,
    escrow_balance_after: escrowAfter,
  };
}

async function applyEscrowReleaseFromPoster(client, wallet, amount, options = {}) {
  assertPositiveAmount(amount);
  const {
    relatedEscrowId = null,
    relatedTaskId = null,
    journalId = randomUUID(),
    journalSeqStart = 1,
    actorUserId = wallet.user_id,
  } = options;

  const balanceBefore = Number(wallet.balance);
  const escrowBefore = Number(wallet.escrow_balance);
  if (escrowBefore < Number(amount)) {
    throw new ApiError(
      409,
      "insufficient_escrow_balance",
      "Escrow balance is insufficient to release."
    );
  }

  const escrowAfter = roundMoney(escrowBefore - Number(amount));

  await postBalancedJournal(client, [
    makeEntry({
      journal_id: journalId,
      entry_seq: journalSeqStart,
      wallet_id: wallet.id,
      escrow_id: relatedEscrowId,
      user_id: wallet.user_id,
      account_code: "wallet_escrow",
      direction: "debit",
      amount,
      external_reference: relatedTaskId,
      description: "Escrow release debit from poster escrow balance",
      created_by: actorUserId,
    }),
    makeEntry({
      journal_id: journalId,
      entry_seq: journalSeqStart + 1,
      escrow_id: relatedEscrowId,
      user_id: wallet.user_id,
      account_code: "escrow_payable",
      direction: "credit",
      amount,
      external_reference: relatedTaskId,
      description: "Escrow release liability to executor",
      created_by: actorUserId,
    }),
  ]);

  await walletRepo.updateWalletBalance(client, wallet.id, balanceBefore, escrowAfter);
  return {
    journal_id: journalId,
    balance_after: balanceBefore,
    escrow_balance_after: escrowAfter,
  };
}

async function applyEscrowReleaseApproval(client, wallet, amount, options = {}) {
  assertPositiveAmount(amount);
  const {
    relatedEscrowId = null,
    relatedTaskId = null,
    journalId = randomUUID(),
    journalSeqStart = 1,
    actorUserId = wallet.user_id,
  } = options;

  const grossAmount = roundMoney(amount);
  const commissionAmount =
    options.commissionAmount != null
      ? roundMoney(options.commissionAmount)
      : calculateTaskCommission(grossAmount);
  const netAmount = roundMoney(grossAmount - commissionAmount);
  if (netAmount < 0) {
    throw new ApiError(500, "invalid_commission", "Commission cannot exceed gross amount.");
  }
  const balanceBefore = Number(wallet.balance);
  const balanceAfter = roundMoney(balanceBefore + netAmount);

  const entries = [
    makeEntry({
      journal_id: journalId,
      entry_seq: journalSeqStart,
      escrow_id: relatedEscrowId,
      user_id: wallet.user_id,
      account_code: "escrow_payable",
      direction: "debit",
      amount: grossAmount,
      external_reference: relatedTaskId,
      description: "Escrow release payable cleared",
      created_by: actorUserId,
    }),
    makeEntry({
      journal_id: journalId,
      entry_seq: journalSeqStart + 1,
      wallet_id: wallet.id,
      escrow_id: relatedEscrowId,
      user_id: wallet.user_id,
      account_code: "wallet_available",
      direction: "credit",
      amount: netAmount,
      external_reference: relatedTaskId,
      description: "Escrow release net credit to executor available balance",
      created_by: actorUserId,
    }),
  ];

  if (commissionAmount > 0) {
    entries.push(
      makeEntry({
        journal_id: journalId,
        entry_seq: journalSeqStart + 2,
        wallet_id: wallet.id,
        escrow_id: relatedEscrowId,
        user_id: wallet.user_id,
        account_code: "platform_fee_revenue",
        direction: "credit",
        amount: commissionAmount,
        external_reference: relatedTaskId,
        description: "Platform commission from escrow release",
        metadata: {
          commission_rate: TASK_COMMISSION_RATE,
          gross_amount: grossAmount,
          net_amount: netAmount,
        },
        created_by: actorUserId,
      })
    );
  }

  await postBalancedJournal(client, entries);

  await walletRepo.updateWalletBalance(
    client,
    wallet.id,
    balanceAfter,
    Number(wallet.escrow_balance)
  );
  await userRepo.incrementUserTotalEarnings(client, wallet.user_id, netAmount);
  return {
    journal_id: journalId,
    gross_amount: grossAmount,
    commission_amount: commissionAmount,
    net_amount: netAmount,
    balance_after: balanceAfter,
    escrow_balance_after: Number(wallet.escrow_balance),
  };
}

async function applyEscrowRefund(client, wallet, amount, options = {}) {
  assertPositiveAmount(amount);
  const {
    relatedEscrowId = null,
    relatedTaskId = null,
    journalId = randomUUID(),
    journalSeqStart = 1,
    actorUserId = wallet.user_id,
  } = options;

  const balanceBefore = Number(wallet.balance);
  const escrowBefore = Number(wallet.escrow_balance);
  if (escrowBefore < Number(amount)) {
    throw new ApiError(
      409,
      "insufficient_escrow_balance",
      "Escrow balance is insufficient to refund."
    );
  }

  const balanceAfter = roundMoney(balanceBefore + Number(amount));
  const escrowAfter = roundMoney(escrowBefore - Number(amount));

  await postBalancedJournal(client, [
    makeEntry({
      journal_id: journalId,
      entry_seq: journalSeqStart,
      wallet_id: wallet.id,
      escrow_id: relatedEscrowId,
      user_id: wallet.user_id,
      account_code: "wallet_escrow",
      direction: "debit",
      amount,
      external_reference: relatedTaskId,
      description: "Escrow refund debit from escrow balance",
      created_by: actorUserId,
    }),
    makeEntry({
      journal_id: journalId,
      entry_seq: journalSeqStart + 1,
      wallet_id: wallet.id,
      escrow_id: relatedEscrowId,
      user_id: wallet.user_id,
      account_code: "wallet_available",
      direction: "credit",
      amount,
      external_reference: relatedTaskId,
      description: "Escrow refund credit to available balance",
      created_by: actorUserId,
    }),
  ]);

  await walletRepo.updateWalletBalance(client, wallet.id, balanceAfter, escrowAfter);
  return {
    journal_id: journalId,
    balance_after: balanceAfter,
    escrow_balance_after: escrowAfter,
  };
}

async function deposit(userOrUserId, amount, options = {}) {
  return withSerializableTransaction(async (client) => {
    const actor = normalizeUserInput(userOrUserId);
    assertActiveUser(actor);
    assertPositiveAmount(amount);

    const wallet = await walletRepo.getWalletByUserId(client, actor.id, true);
    if (!wallet) {
      throw new ApiError(404, "wallet_not_found", "Wallet not found for user.");
    }

    const baseAmount = roundMoney(amount);
    const feeAmount = calculateProcessingFee(baseAmount);
    const netAmount = roundMoney(baseAmount - feeAmount);
    if (netAmount <= 0) {
      throw new ApiError(
        400,
        "invalid_amount",
        "Amount is too low after platform fee deduction."
      );
    }

    const balanceBefore = Number(wallet.balance);
    const balanceAfter = roundMoney(balanceBefore + netAmount);
    const journalId = randomUUID();
    const entries = [
      makeEntry({
        journal_id: journalId,
        entry_seq: 1,
        wallet_id: wallet.id,
        user_id: actor.id,
        account_code: "external_funds",
        direction: "debit",
        amount: baseAmount,
        description: "External deposit source",
        created_by: actor.id,
      }),
      makeEntry({
        journal_id: journalId,
        entry_seq: 2,
        wallet_id: wallet.id,
        user_id: actor.id,
        account_code: "wallet_available",
        direction: "credit",
        amount: netAmount,
        description: "Wallet available credited by net deposit",
        metadata: buildFeeMetadata(baseAmount, feeAmount),
        created_by: actor.id,
      }),
    ];

    if (feeAmount > 0) {
      entries.push(
        makeEntry({
          journal_id: journalId,
          entry_seq: 3,
          wallet_id: wallet.id,
          user_id: actor.id,
          account_code: "platform_fee_revenue",
          direction: "credit",
          amount: feeAmount,
          description: "Platform fee from deposit",
          metadata: buildFeeMetadata(baseAmount, feeAmount),
          created_by: actor.id,
        })
      );
    }

    await postBalancedJournal(client, entries);
    await walletRepo.updateWalletBalance(
      client,
      wallet.id,
      balanceAfter,
      Number(wallet.escrow_balance)
    );

    await auditService.logEvent(client, {
      user_id: actor.id,
      action: "wallet_deposit",
      entity_type: "ledger_journal",
      entity_id: journalId,
      new_values: {
        base_amount: baseAmount,
        fee_amount: feeAmount,
        net_amount: netAmount,
      },
    });

    const response = {
      journal_id: journalId,
      wallet_id: wallet.id,
      balance_after: balanceAfter,
      amount: baseAmount,
      fee_amount: feeAmount,
      credited_amount: netAmount,
    };
    return response;
  }, { operation: "wallet_deposit" });
}

async function withdraw(userOrUserId, amount, options = {}) {
  return withSerializableTransaction(async (client) => {
    const actor = normalizeUserInput(userOrUserId);
    assertActiveUser(actor);
    assertPositiveAmount(amount);

    const baseAmount = roundMoney(amount);
    if (baseAmount < MIN_WITHDRAWAL_BDT) {
      throw new ApiError(
        400,
        "min_withdrawal_not_met",
        `Minimum withdrawal is ${MIN_WITHDRAWAL_BDT} BDT.`,
        { min_withdrawal_bdt: MIN_WITHDRAWAL_BDT }
      );
    }

    if (actor.email_verified !== true || actor.phone_verified !== true) {
      throw new ApiError(
        403,
        "withdrawal_verification_required",
        "Email and phone verification are required for withdrawals."
      );
    }

    const wallet = await walletRepo.getWalletByUserId(client, actor.id, true);
    if (!wallet) {
      throw new ApiError(404, "wallet_not_found", "Wallet not found for user.");
    }

    const feeAmount = calculateProcessingFee(baseAmount);
    const totalDebit = roundMoney(baseAmount + feeAmount);
    const balanceBefore = Number(wallet.balance);
    const outstandingTotal = await walletRepo.getOutstandingWithdrawalTotal(
      client,
      actor.id
    );
    const projected = roundMoney(outstandingTotal + totalDebit);
    if (projected > balanceBefore) {
      throw new ApiError(
        409,
        "insufficient_wallet_balance",
        "Outstanding withdrawals plus requested amount exceed available balance."
      );
    }
    if (totalDebit > balanceBefore) {
      throw new ApiError(
        409,
        "insufficient_wallet_balance",
        "Withdrawal amount plus fee exceeds available balance."
      );
    }

    const riskScore = calculateWithdrawalRisk(actor, baseAmount);
    const initialStatus = riskScore > 70 ? "under_review" : "approved";

    const request = await walletRepo.createWithdrawalRequest(client, {
      user_id: actor.id,
      wallet_id: wallet.id,
      amount: baseAmount,
      status: initialStatus,
      idempotency_key: options.idempotencyKey ?? null,
      metadata: {
        ...(options.metadata || {}),
        fee_amount: feeAmount,
        total_debit_preview: totalDebit,
        outstanding_total_after_request: projected,
        risk_score: riskScore,
        system_notes: initialStatus === "under_review" ? "High risk score. Needs manual check." : "Low risk. Auto-approved.",
      },
    });

    await auditService.logEvent(client, {
      user_id: actor.id,
      action: "withdrawal_requested",
      entity_type: "withdrawal_request",
      entity_id: request.id,
      new_values: {
        amount: baseAmount,
        fee_amount: feeAmount,
        status: initialStatus,
        risk_score: riskScore,
      },
    });

    return {
      withdrawal_request: request,
      amount: baseAmount,
      fee_amount: feeAmount,
      status: initialStatus,
    };
  }, { operation: "wallet_withdraw" });
}

function calculateWithdrawalRisk(user, amount) {
  let risk = 0;
  if (amount > 5000) risk += 30; // High amount
  if (!user.is_verified) risk += 50; // Unverified profile
  if (user.trust_score < 10) risk += 20; // Low trust score

  // Random small jitter to simulate "AI"
  risk += Math.floor(Math.random() * 10);

  return risk;
}

// Legacy compatibility wrappers retained for existing callers/tests.
async function createDeposit(user, amount, options = {}) {
  return deposit(user, amount, options);
}

async function requestWithdrawal(user, amount, options = {}) {
  return withdraw(user, amount, options);
}

async function processWithdrawal(adminUser, withdrawalRequestId, options = {}) {
  return withSerializableTransaction(async (client) => {
    assertActiveUser(adminUser);
    if (adminUser.role !== "admin") {
      throw new ApiError(403, "forbidden", "Only admins may process withdrawals.");
    }

    const request = await walletRepo.getWithdrawalRequestById(
      client,
      withdrawalRequestId,
      true
    );
    if (!request) {
      throw new ApiError(404, "withdrawal_not_found", "Withdrawal request not found.");
    }
    if (request.status !== "approved") {
      throw new ApiError(
        409,
        "withdrawal_already_processed",
        "Withdrawal request must be approved before processing."
      );
    }

    const wallet = await walletRepo.getWalletById(client, request.wallet_id, true);
    if (!wallet) {
      throw new ApiError(
        404,
        "wallet_not_found",
        "Wallet not found for withdrawal request."
      );
    }

    const baseAmount = roundMoney(request.amount);
    if (baseAmount < MIN_WITHDRAWAL_BDT) {
      throw new ApiError(
        400,
        "min_withdrawal_not_met",
        `Minimum withdrawal is ${MIN_WITHDRAWAL_BDT} BDT.`,
        { min_withdrawal_bdt: MIN_WITHDRAWAL_BDT }
      );
    }

    const feeAmount = calculateProcessingFee(baseAmount);
    const totalDebit = roundMoney(baseAmount + feeAmount);
    const balanceBefore = Number(wallet.balance);
    if (totalDebit > balanceBefore) {
      throw new ApiError(
        409,
        "insufficient_wallet_balance",
        "Insufficient wallet balance to process withdrawal."
      );
    }
    const balanceAfter = roundMoney(balanceBefore - totalDebit);
    const journalId = randomUUID();
    const entries = [
      makeEntry({
        journal_id: journalId,
        entry_seq: 1,
        wallet_id: wallet.id,
        user_id: request.user_id,
        account_code: "wallet_available",
        direction: "debit",
        amount: totalDebit,
        external_reference: options.externalReference ?? null,
        description: "Withdrawal debit (amount + fee) from available balance",
        metadata: buildFeeMetadata(baseAmount, feeAmount),
        created_by: adminUser.id,
      }),
      makeEntry({
        journal_id: journalId,
        entry_seq: 2,
        wallet_id: wallet.id,
        user_id: request.user_id,
        account_code: "external_payout",
        direction: "credit",
        amount: baseAmount,
        external_reference: options.externalReference ?? null,
        description: "Withdrawal external payout liability",
        metadata: buildFeeMetadata(baseAmount, feeAmount),
        created_by: adminUser.id,
      }),
    ];
    if (feeAmount > 0) {
      entries.push(
        makeEntry({
          journal_id: journalId,
          entry_seq: 3,
          wallet_id: wallet.id,
          user_id: request.user_id,
          account_code: "platform_fee_revenue",
          direction: "credit",
          amount: feeAmount,
          description: "Platform fee from withdrawal",
          metadata: buildFeeMetadata(baseAmount, feeAmount),
          created_by: adminUser.id,
        })
      );
    }

    await postBalancedJournal(client, entries);
    await walletRepo.updateWalletBalance(
      client,
      wallet.id,
      balanceAfter,
      Number(wallet.escrow_balance)
    );

    const updatedRequest = await walletRepo.updateWithdrawalRequestStatus(
      client,
      request.id,
      {
        status: "paid",
        approved_by_admin_id: adminUser.id,
        external_reference: options.externalReference ?? null,
        failure_reason: null,
      }
    );

    await auditService.logEvent(client, {
      user_id: adminUser.id,
      action: "withdrawal_processed",
      entity_type: "withdrawal_request",
      entity_id: updatedRequest.id,
      new_values: {
        amount: baseAmount,
        fee_amount: feeAmount,
        total_debited: totalDebit,
      },
    });

    const userRecord = await userRepo.getUserById(client, request.user_id, true);
    if (userRecord && userRecord.referred_by) {
      await referralService.creditReferralRewardInTransaction(client, {
        referrerUserId: userRecord.referred_by,
        referredUserId: request.user_id,
        milestone: "first_withdrawal",
        actorUserId: adminUser.id,
      });
    }

    return {
      withdrawal_request: updatedRequest,
      journal_id: journalId,
      balance_after: balanceAfter,
      fee_amount: feeAmount,
      total_debited: totalDebit,
    };
  }, { operation: "wallet_process_withdrawal" });
}

// Explicit service names requested for escrow integration.
async function holdEscrow(client, wallet, amount, options = {}) {
  return applyEscrowLock(client, wallet, amount, options);
}

async function releaseEscrow(client, wallet, amount, options = {}) {
  return applyEscrowReleaseApproval(client, wallet, amount, options);
}

module.exports = {
  getWallet,
  listWalletTransactions,
  listWithdrawalRequests,
  deposit,
  withdraw,
  holdEscrow,
  releaseEscrow,
  createDeposit,
  requestWithdrawal,
  processWithdrawal,
  applyEscrowLock,
  applyEscrowReleaseApproval,
  applyEscrowReleaseFromPoster,
  applyEscrowRefund,
};
