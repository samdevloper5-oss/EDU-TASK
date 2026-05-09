const { withSerializableTransaction } = require("../utils/transaction");
const adminRepo = require("../repositories/admin.repo");
const walletRepo = require("../repositories/wallet.repo");
const walletService = require("./wallet.service");
const auditService = require("./audit.service");
const { ApiError } = require("../utils/http");

async function getDashboardStats(adminUser) {
  if (!adminUser || adminUser.role !== "admin") {
    throw new ApiError(403, "forbidden", "Only admins can access dashboard stats.");
  }

  return withSerializableTransaction(async (client) => {
    const base = await adminRepo.getDashboardStats(client);
    const topEarners = await adminRepo.getTopEarners(client, 5);
    return {
      totalUsers: Number(base.total_users || 0),
      activeUsers: Number(base.active_users || 0),
      totalTasks: Number(base.total_tasks || 0),
      activeTasks: Number(base.active_tasks || 0),
      taskCompletionRate:
        Number(base.total_tasks || 0) === 0
          ? 0
          : Number(((Number(base.completed_tasks || 0) / Number(base.total_tasks || 0)) * 100).toFixed(2)),
      totalRevenue: Number(base.total_revenue || 0),
      totalWithdrawals: Number(base.total_withdrawals || 0),
      commissionTotal: Number(base.commission_total || 0),
      commissionWeekly: Number(base.commission_weekly || 0),
      commissionMonthly: Number(base.commission_monthly || 0),
      averageTaskValue: Number(base.avg_task_value || 0),
      top5Earners: topEarners.map((row) => ({
        id: row.id,
        full_name: row.full_name,
        university_name: row.university_name,
        total_earnings: Number(row.total_earnings || 0),
      })),
    };
  }, { operation: "admin_dashboard_stats" });
}

async function approveWithdrawal(adminUser, withdrawalId) {
  if (!adminUser || adminUser.role !== "admin") {
    throw new ApiError(403, "forbidden", "Only admins can approve withdrawals.");
  }

  await withSerializableTransaction(async (client) => {
    const existing = await walletRepo.getWithdrawalRequestById(client, withdrawalId, true);
    if (!existing) {
      throw new ApiError(404, "withdrawal_not_found", "Withdrawal request not found.");
    }
    if (existing.status !== "pending") {
      throw new ApiError(
        409,
        "withdrawal_invalid_state",
        "Only pending withdrawals can be approved."
      );
    }

    await walletRepo.updateWithdrawalRequestStatus(client, withdrawalId, {
      status: "approved",
      approved_by_admin_id: adminUser.id,
    });

    await auditService.logEvent(client, {
      user_id: adminUser.id,
      action: "withdrawal_approved",
      entity_type: "withdrawal_request",
      entity_id: withdrawalId,
      new_values: { status: "approved" },
    });
  }, { operation: "admin_withdrawal_approve" });

  // Process in a second serializable call to preserve existing wallet flow semantics.
  // This keeps compatibility with current withdrawal posting service.
  return walletService.processWithdrawal(adminUser, withdrawalId);
}

module.exports = {
  getDashboardStats,
  approveWithdrawal,
};
