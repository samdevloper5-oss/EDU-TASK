// Dispute service (Phase 5.1 - dispute creation only).
// Business rules and state transitions are enforced here.

const { withSerializableTransaction } = require("../utils/transaction");
const disputeRepo = require("../repositories/dispute.repo");
const taskRepo = require("../repositories/task.repo");
const submissionRepo = require("../repositories/submission.repo");
const chatRepo = require("../repositories/chat.repo");
const escrowRepo = require("../repositories/escrow.repo");
const walletRepo = require("../repositories/wallet.repo");
const auditRepo = require("../repositories/audit.repo");
const auditService = require("./audit.service");
const notificationService = require("./notification.service");
const leaderboardService = require("./leaderboard.service");
const { getClient } = require("../config/db");
const escrowService = require("./escrow.service");
const {
  isEscrowLocked,
  ESCROW_RELEASE_TYPE,
} = require("../constants/escrow.constants");

const ALLOWED_DISPUTE_TYPES = [
  "scope_mismatch",
  "missing_submission",
  "deadline_violation",
];

async function createDispute(filer, { taskId, dispute_type, description, evidence }) {
  // Transaction boundary: dispute insert + task status update + audit log.
  return withSerializableTransaction(async (client) => {
    if (!filer || !filer.id) {
      throw new Error("Authenticated filer is required.");
    }
    if (filer.role !== "student") {
      throw new Error("Only students may file disputes.");
    }
    if (!taskId) {
      throw new Error("taskId is required.");
    }
    if (!description || String(description).trim().length === 0) {
      throw new Error("description is required.");
    }
    if (!ALLOWED_DISPUTE_TYPES.includes(dispute_type)) {
      throw new Error("Invalid dispute_type.");
    }

    const existing = await disputeRepo.getDisputeByTaskId(client, taskId, true);
    if (existing) {
      throw new Error("Dispute already exists for this task.");
    }

    const task = await taskRepo.getTaskById(client, taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    // State check: allowed only under_review, or completed within 48 hours.
    if (task.status === "completed") {
      if (!task.completed_at) {
        throw new Error("Task completed_at is required for dispute window.");
      }
      const completedAt = new Date(task.completed_at);
      const now = new Date();
      const windowMs = 48 * 60 * 60 * 1000;
      if (now.getTime() - completedAt.getTime() > windowMs) {
        throw new Error("Dispute window has expired.");
      }
    } else if (task.status !== "under_review") {
      throw new Error("Disputes can only be filed under_review or within 48 hours of completion.");
    }

    // Filer must be a valid party: poster, executor, or volunteer assignee.
    let isValidParty = task.poster_id === filer.id;
    if (!isValidParty && task.task_type === "paid") {
      isValidParty = task.selected_executor_id === filer.id;
    }
    if (!isValidParty && task.task_type === "volunteer") {
      const assignmentResult = await client.query(
        "SELECT 1 FROM task_assignments WHERE task_id = $1 AND executor_id = $2",
        [taskId, filer.id]
      );
      isValidParty = assignmentResult.rowCount > 0;
    }
    if (!isValidParty) {
      throw new Error("Only task participants may file disputes.");
    }

    const dispute = await disputeRepo.createDispute(client, {
      task_id: taskId,
      filed_by_user_id: filer.id,
      dispute_type,
      description,
      evidence,
    });

    // State transition: task -> disputed.
    await taskRepo.updateTaskStatus(client, taskId, "disputed");

    await auditService.logEvent(client, {
      user_id: filer.id,
      action: "dispute_created",
      entity_type: "dispute",
      entity_id: dispute.id,
    });

    return dispute;
  });
}

async function autoResolveDispute(systemActor, { disputeId }) {
  const aiModerator = require("./ai_moderator.service");

  return withSerializableTransaction(async (client) => {
    if (!systemActor || !systemActor.id) throw new Error("System actor required.");
    const dispute = await disputeRepo.getDisputeById(client, disputeId, true);
    if (!dispute || dispute.status !== "pending") throw new Error("Pending dispute not found.");

    const task = await taskRepo.getTaskById(client, dispute.task_id);
    if (!task) throw new Error("Task not found.");

    // Financial locks
    const escrow = await escrowRepo.getEscrowByTaskId(client, task.id, true);
    if (!escrow || !isEscrowLocked(escrow)) throw new Error("Escrow not found or unavailable.");

    // AI Analysis (Rule 16)
    const workerPercentage = await aiModerator.analyzeDispute(client, task.id);
    const releaseAmount = Number((Number(escrow.amount) * (workerPercentage / 100)).toFixed(4));
    const refundAmount = Number((Number(escrow.amount) - releaseAmount).toFixed(4));

    const explanation = `AI Auto-Resolution: Worker gets ${workerPercentage}% (${releaseAmount} BDT). Poster refunded ${refundAmount} BDT.`;

    // Process escrow split
    await escrowService.partialPayoutEscrow(client, {
      escrowId: escrow.id,
      releaseToExecutorAmount: releaseAmount,
      refundToPosterAmount: refundAmount,
      executorId: task.selected_executor_id,
    });

    // Update dispute status
    const updated = await disputeRepo.updateDisputeStatus(client, disputeId, {
      status: "resolved",
      admin_decision: explanation,
      auto_resolved: true,
      auto_resolution_reason: "AI_ANALYSIS",
    });

    // Finalize task status
    const nextTaskStatus = workerPercentage >= 50 ? "completed" : "cancelled";
    await taskRepo.updateTaskStatus(client, task.id, nextTaskStatus);

    await auditService.logEvent(client, {
      user_id: systemActor.id,
      action: "dispute_auto_resolved",
      entity_type: "dispute",
      entity_id: disputeId,
      new_values: { workerPercentage, releaseAmount, refundAmount },
    });

    await notificationService.createNotificationInTransaction(client, {
      user_id: task.poster_id,
      type: "COMPLETED",
      title: "Dispute auto-resolved",
      message: explanation,
      reference_id: task.id,
    });

    await notificationService.createNotificationInTransaction(client, {
      user_id: task.selected_executor_id,
      type: "COMPLETED",
      title: "Dispute auto-resolved",
      message: explanation,
      reference_id: task.id,
    });

    return updated;
  });
}

async function getDisputeContextForAdmin(adminUser, disputeId) {
  if (!adminUser || !adminUser.id) {
    throw new Error("Authenticated admin is required.");
  }
  if (adminUser.role !== "admin") {
    throw new Error("Only admins may access dispute context.");
  }
  if (!disputeId) {
    throw new Error("disputeId is required.");
  }

  const client = await getClient();
  try {
    const dispute = await disputeRepo.getDisputeById(client, disputeId, false);
    if (!dispute) {
      throw new Error("Dispute not found.");
    }
    if (!["pending", "under_review"].includes(dispute.status)) {
      throw new Error("Dispute is not in a reviewable state.");
    }

    const task = await taskRepo.getTaskById(client, dispute.task_id);
    if (!task) {
      throw new Error("Task not found for dispute.");
    }
    if (task.status !== "disputed") {
      throw new Error("Task must be in disputed state for admin review.");
    }

    const submission = await submissionRepo.getSubmissionByTaskId(
      client,
      task.id
    );
    const chatMessages = await chatRepo.listChatMessagesByTaskId(
      client,
      task.id
    );
    const escrow = await escrowRepo.getEscrowByTaskId(client, task.id);
    const ledgerEntries = await walletRepo.listLedgerEntriesByTaskId(
      client,
      task.id
    );
    const auditLogs = await auditRepo.listAuditLogsForEntities(client, [
      { entity_type: "task", entity_id: task.id },
      { entity_type: "dispute", entity_id: dispute.id },
    ]);

    return {
      dispute,
      task,
      submission,
      chat_messages: chatMessages,
      escrow,
      ledger_entries: ledgerEntries,
      audit_logs: auditLogs,
    };
  } finally {
    client.release();
  }
}

async function resolveDispute(adminUser, disputeId, payload) {
  // Transaction boundary: dispute resolution + escrow + ledger + task status + audit log.
  const resolvedDispute = await withSerializableTransaction(async (client) => {
    if (!adminUser || !adminUser.id) {
      throw new Error("Authenticated admin is required.");
    }
    if (adminUser.role !== "admin") {
      throw new Error("Only admins may resolve disputes.");
    }
    if (!disputeId) {
      throw new Error("disputeId is required.");
    }

    const { outcome, admin_decision, admin_decision_fund_allocation, executorId } =
      payload || {};

    if (!admin_decision || String(admin_decision).trim().length === 0) {
      throw new Error("admin_decision is required.");
    }

    if (admin_decision_fund_allocation) {
      throw new Error("Partial splits are not allowed in Phase 5.4.");
    }

    if (!["release", "refund", "none"].includes(outcome)) {
      throw new Error("Invalid outcome. Use 'release', 'refund', or 'none'.");
    }

    const dispute = await disputeRepo.getDisputeById(client, disputeId, true);
    if (!dispute) {
      throw new Error("Dispute not found.");
    }
    if (!["under_review", "escalated"].includes(dispute.status)) {
      throw new Error("Dispute is not in a resolvable state.");
    }

    // Global lock order for financial resolution:
    // 1) escrows FOR UPDATE, 2) tasks FOR UPDATE, 3) wallets FOR UPDATE (inside escrow.service).
    const escrow = await escrowRepo.getEscrowByTaskId(
      client,
      dispute.task_id,
      true
    );
    const lockedTask = await taskRepo.getTaskByIdForUpdate(client, dispute.task_id);
    if (!lockedTask) {
      throw new Error("Task not found for dispute.");
    }
    if (lockedTask.status !== "disputed") {
      throw new Error("Task must be in disputed state to resolve.");
    }

    if (lockedTask.task_type === "volunteer") {
      if (outcome !== "none") {
        throw new Error("Volunteer disputes cannot trigger escrow actions.");
      }
    }

    // Paid task: escrow must already be locked.
    if (lockedTask.task_type === "paid") {
      if (!escrow) {
        throw new Error("Escrow not found for paid task.");
      }
      if (!isEscrowLocked(escrow)) {
        throw new Error("Escrow already released or refunded.");
      }

      if (outcome === "release") {
        if (!executorId) {
          throw new Error("executorId is required for escrow release.");
        }
        await escrowService.releaseEscrow(client, {
          escrowId: escrow.id,
          executorId,
          releaseType: ESCROW_RELEASE_TYPE.DISPUTE_RESOLUTION,
        });
      } else if (outcome === "refund") {
        await escrowService.refundEscrow(client, {
          escrowId: escrow.id,
          releaseType: ESCROW_RELEASE_TYPE.DISPUTE_RESOLUTION,
        });
      } else {
        throw new Error("Paid task disputes must resolve with release or refund.");
      }
    }

    const resolved = await disputeRepo.resolveDispute(
      client,
      dispute.id,
      adminUser.id,
      admin_decision,
      admin_decision_fund_allocation
    );

    const nextTaskStatus = outcome === "refund" ? "cancelled" : "completed";
    await taskRepo.updateTaskStatus(client, lockedTask.id, nextTaskStatus);

    await auditService.logEvent(client, {
      user_id: adminUser.id,
      action: "dispute_resolved",
      entity_type: "dispute",
      entity_id: dispute.id,
    });

    await notificationService.createNotificationInTransaction(client, {
      user_id: dispute.filed_by_user_id,
      type: "COMPLETED",
      title: "Dispute resolved",
      message: "An admin resolved your dispute.",
      reference_id: lockedTask.id,
      metadata: {
        dispute_id: dispute.id,
        outcome,
        task_status: nextTaskStatus,
      },
    });

    return resolved;
  });
  await leaderboardService.invalidateLeaderboardCache();
  return resolvedDispute;
}

module.exports = {
  createDispute,
  autoResolveDispute,
  getDisputeContextForAdmin,
  resolveDispute,
};
