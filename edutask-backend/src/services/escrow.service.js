// Escrow service (Phase 4B - logical lock).
// Expected inputs: task identifiers, owner/executor identifiers, amounts.
// Related tables: escrows, tasks, wallets, ledger_entries, audit_logs.
// NOTE: Escrow service methods do NOT own transactions.
// They must be called inside a SERIALIZABLE transaction by the caller.

const { randomUUID } = require("crypto");
const walletRepo = require("../repositories/wallet.repo");
const escrowRepo = require("../repositories/escrow.repo");
const taskRepo = require("../repositories/task.repo");
const platformEarningsRepo = require("../repositories/platform_earnings.repo");
const walletService = require("./wallet.service");
const referralService = require("./referral.service");
const auditService = require("./audit.service");
const notificationService = require("./notification.service");
const { increment } = require("../middlewares/metrics.middleware");
const { TASK_COMMISSION_RATE } = require("../constants/financial.constants");
const {
  ESCROW_STATUS,
  ESCROW_RELEASE_TYPE,
  isEscrowLocked,
} = require("../constants/escrow.constants");

async function lockWalletsForUpdateInOrder(client, walletIds) {
  const uniqueOrdered = [...new Set(walletIds.filter(Boolean))].sort();
  const locked = new Map();

  for (const walletId of uniqueOrdered) {
    const wallet = await walletRepo.getWalletById(client, walletId, true);
    if (!wallet) {
      throw new Error("Wallet not found for escrow operation.");
    }
    locked.set(walletId, wallet);
  }

  return locked;
}

async function lockEscrowForTask(client, { taskId, ownerId, amount }) {
  if (!client) {
    throw new Error("DB client is required for escrow operations.");
  }
  if (!taskId || !ownerId) {
    throw new Error("taskId and ownerId are required to lock escrow.");
  }
  if (amount == null || Number(amount) <= 0) {
    throw new Error("amount must be a positive number.");
  }

  // Global financial lock order:
  // 1) escrows FOR UPDATE, 2) tasks FOR UPDATE, 3) wallets FOR UPDATE.
  const existing = await escrowRepo.getEscrowByTaskId(client, taskId, true);
  const task = await taskRepo.getTaskByIdForUpdate(client, taskId);
  if (!task) {
    throw new Error("Task not found.");
  }
  if (task.poster_id !== ownerId) {
    throw new Error("Only the task owner can lock escrow.");
  }
  if (task.task_type !== "paid") {
    throw new Error("Escrow is only applicable to paid tasks.");
  }

  if (existing) {
    if (!isEscrowLocked(existing)) {
      throw new Error("Escrow already released or refunded.");
    }
    if (Number(existing.amount) !== Number(amount)) {
      throw new Error("Escrow amount mismatch for existing escrow.");
    }
    return existing;
  }

  const ownerWallet = await walletRepo.getWalletByUserId(client, ownerId, false);
  if (!ownerWallet) {
    throw new Error("Owner wallet not found.");
  }

  const lockedWallets = await lockWalletsForUpdateInOrder(client, [ownerWallet.id]);
  const lockedOwnerWallet = lockedWallets.get(ownerWallet.id);

  const escrow = await escrowRepo.createEscrow(client, {
    task_id: taskId,
    poster_wallet_id: lockedOwnerWallet.id,
    amount,
    status: ESCROW_STATUS.LOCKED,
  });

  await walletService.applyEscrowLock(client, lockedOwnerWallet, amount, {
    relatedEscrowId: escrow.id,
    relatedTaskId: taskId,
  });

  await auditService.logEvent(client, {
    user_id: ownerId,
    action: "escrow_locked",
    entity_type: "escrow",
    entity_id: escrow.id,
  });

  return escrow;
}

async function releaseEscrow(client, { escrowId, executorId, releaseType }) {
  if (!client) {
    throw new Error("DB client is required for escrow operations.");
  }
  if (!escrowId || !executorId) {
    throw new Error("escrowId and executorId are required to release escrow.");
  }

  const escrow = await escrowRepo.getEscrowById(client, escrowId, true);
  if (!escrow) {
    throw new Error("Escrow not found.");
  }

  const effectiveReleaseType = releaseType || ESCROW_RELEASE_TYPE.APPROVAL;
  if (!isEscrowLocked(escrow)) {
    increment("escrow_double_release_attempt_total");
    if (escrow.release_type === effectiveReleaseType) {
      return escrow;
    }
    throw new Error("Escrow already released or refunded.");
  }

  const lockedTask = await taskRepo.getTaskByIdForUpdate(client, escrow.task_id);
  if (!lockedTask) {
    throw new Error("Task not found for escrow.");
  }

  const executorWallet = await walletRepo.getWalletByUserId(client, executorId, false);
  if (!executorWallet) {
    throw new Error("Executor wallet not found.");
  }

  const lockedWallets = await lockWalletsForUpdateInOrder(client, [
    escrow.poster_wallet_id,
    executorWallet.id,
  ]);
  const ownerWallet = lockedWallets.get(escrow.poster_wallet_id);
  const lockedExecutorWallet = lockedWallets.get(executorWallet.id);
  const journalId = randomUUID();

  // Ledger + wallet mutations happen before escrow state transition.
  // Everything remains atomic in the caller-owned SERIALIZABLE transaction.
  await walletService.applyEscrowReleaseFromPoster(client, ownerWallet, escrow.amount, {
    relatedEscrowId: escrow.id,
    relatedTaskId: escrow.task_id,
    journalId,
    journalSeqStart: 1,
  });
  const grossAmount = customAmount != null ? Number(customAmount) : Number(escrow.amount);
  const commissionAmount = Number((grossAmount * TASK_COMMISSION_RATE).toFixed(4));
  const netAmount = Number((grossAmount - commissionAmount).toFixed(4));

  const releaseResult = await walletService.applyEscrowReleaseApproval(
    client,
    lockedExecutorWallet,
    escrow.amount,
    {
      relatedEscrowId: escrow.id,
      relatedTaskId: escrow.task_id,
      journalId,
      journalSeqStart: 3,
      commissionAmount,
    }
  );

  await platformEarningsRepo.createPlatformEarning(client, {
    task_id: escrow.task_id,
    escrow_id: escrow.id,
    gross_amount: grossAmount,
    fee_amount: commissionAmount,
    net_amount: netAmount,
  });

  const updated = await escrowRepo.markEscrowReleased(client, {
    escrowId,
    executorWalletId: lockedExecutorWallet.id,
    releaseType: effectiveReleaseType,
    status: ESCROW_STATUS.RELEASED,
  });

  await auditService.logEvent(client, {
    user_id: executorId,
    action: "escrow_released",
    entity_type: "escrow",
    entity_id: escrowId,
    new_values: {
      gross_amount: grossAmount,
      commission_amount: commissionAmount,
      net_amount: netAmount,
      journal_id: releaseResult.journal_id,
    },
  });

  await notificationService.createNotificationInTransaction(client, {
    user_id: lockedExecutorWallet.user_id,
    type: "PAYMENT",
    title: "Escrow released",
    message: "Payment has been released to your wallet.",
    reference_id: updated.task_id,
    metadata: {
      escrow_id: updated.id,
      gross_amount: grossAmount,
      commission_amount: commissionAmount,
      net_amount: netAmount,
    },
  });

  const userRow = await client.query(
    "SELECT id, referred_by FROM users WHERE id = $1",
    [executorId]
  );
  const referralCandidate = userRow.rows[0];
  if (referralCandidate && referralCandidate.referred_by) {
    await referralService.creditReferralRewardInTransaction(client, {
      referrerUserId: referralCandidate.referred_by,
      referredUserId: referralCandidate.id,
      milestone: "first_completed_task",
      actorUserId: executorId,
    });
  }

  return updated;
}

async function refundEscrow(client, { escrowId, releaseType }) {
  if (!client) {
    throw new Error("DB client is required for escrow operations.");
  }
  if (!escrowId) {
    throw new Error("escrowId is required to refund escrow.");
  }

  const escrow = await escrowRepo.getEscrowById(client, escrowId, true);
  if (!escrow) {
    throw new Error("Escrow not found.");
  }

  const effectiveReleaseType = releaseType || ESCROW_RELEASE_TYPE.REFUND;
  if (!isEscrowLocked(escrow)) {
    increment("escrow_double_release_attempt_total");
    if (escrow.release_type === effectiveReleaseType) {
      return escrow;
    }
    throw new Error("Escrow already released or refunded.");
  }

  const lockedTask = await taskRepo.getTaskByIdForUpdate(client, escrow.task_id);
  if (!lockedTask) {
    throw new Error("Task not found for escrow.");
  }

  const lockedWallets = await lockWalletsForUpdateInOrder(client, [escrow.poster_wallet_id]);
  const ownerWallet = lockedWallets.get(escrow.poster_wallet_id);
  const journalId = randomUUID();

  await walletService.applyEscrowRefund(client, ownerWallet, escrow.amount, {
    relatedEscrowId: escrow.id,
    relatedTaskId: escrow.task_id,
    journalId,
    journalSeqStart: 1,
  });

  const updated = await escrowRepo.markEscrowRefunded(client, {
    escrowId,
    releaseType: effectiveReleaseType,
    status: ESCROW_STATUS.REFUNDED,
  });

  await auditService.logEvent(client, {
    user_id: ownerWallet.user_id,
    action: "escrow_refunded",
    entity_type: "escrow",
    entity_id: escrowId,
  });

  await notificationService.createNotificationInTransaction(client, {
    user_id: ownerWallet.user_id,
    type: "PAYMENT",
    title: "Escrow refunded",
    message: "Escrow was refunded back to your wallet.",
    reference_id: updated.task_id,
    metadata: {
      escrow_id: updated.id,
      amount: Number(escrow.amount),
    },
  });

  return updated;
}

async function partialPayoutEscrow(client, { escrowId, releaseToExecutorAmount, refundToPosterAmount, executorId }) {
  if (!client) throw new Error("DB client required.");
  const escrow = await escrowRepo.getEscrowById(client, escrowId, true);
  if (!escrow || !isEscrowLocked(escrow)) throw new Error("Escrow not found or not locked.");

  const executorWallet = await walletRepo.getWalletByUserId(client, executorId, false);
  const posterWallet = await walletRepo.getWalletById(client, escrow.poster_wallet_id, true);
  if (!executorWallet || !posterWallet) throw new Error("Wallet not found.");

  const journalId = randomUUID();

  // Part 1: Release to executor
  if (Number(releaseToExecutorAmount) > 0) {
    await walletService.applyEscrowReleaseFromPoster(client, posterWallet, releaseToExecutorAmount, {
      relatedEscrowId: escrow.id,
      relatedTaskId: escrow.task_id,
      journalId,
      journalSeqStart: 1,
    });

    // We already deducted the release portion from poster's escrow balance.
    // Now apply release to executor (gross amount is the release amount)
    await walletService.applyEscrowReleaseApproval(client, executorWallet, releaseToExecutorAmount, {
      relatedEscrowId: escrow.id,
      relatedTaskId: escrow.task_id,
      journalId,
      journalSeqStart: 3,
    });
  }

  // Part 2: Refund remaining to poster
  if (Number(refundToPosterAmount) > 0) {
    // Current wallet state might be updated. Refresh poster wallet for consistency if needed, 
    // but within same transaction we follow balance track.
    await walletService.applyEscrowRefund(client, posterWallet, refundToPosterAmount, {
      relatedEscrowId: escrow.id,
      relatedTaskId: escrow.task_id,
      journalId,
      journalSeqStart: 6,
    });
  }

  // Finalize escrow
  await escrowRepo.markEscrowReleased(client, {
    escrowId,
    executorWalletId: executorWallet.id,
    releaseType: ESCROW_RELEASE_TYPE.DISPUTE_RESOLUTION,
    status: ESCROW_STATUS.RELEASED,
  });

  return { success: true };
}

module.exports = {
  lockEscrowForTask,
  releaseEscrow,
  refundEscrow,
  partialPayoutEscrow,
};
