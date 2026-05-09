const { pool } = require("../config/db");
const walletService = require("../services/wallet.service");
const env = require("../config/env");
const logger = require("../config/logger");

async function autoProcessApprovedWithdrawals() {
    if (!env.automation.enabled) return;

    // Find all 'approved' withdrawal requests
    const result = await pool.query(
        `SELECT id FROM withdrawal_requests WHERE status = 'approved' FOR UPDATE SKIP LOCKED`
    );

    if (result.rows.length === 0) return;

    logger.info("auto_process_withdrawals_start", { count: result.rows.length });

    // System actor for auto-processing
    const systemAdmin = { id: "00000000-0000-0000-0000-000000000000", role: "admin", is_active: true };

    for (const row of result.rows) {
        try {
            await walletService.processWithdrawal(systemAdmin, row.id, {
                externalReference: `AUTO_PAYOUT_${Date.now()}_${row.id.slice(0, 8)}`,
            });
            logger.info("auto_process_withdrawal_success", { id: row.id });
        } catch (err) {
            logger.error("auto_process_withdrawal_failed", { id: row.id, message: err.message });
        }
    }
}

module.exports = { autoProcessApprovedWithdrawals };
