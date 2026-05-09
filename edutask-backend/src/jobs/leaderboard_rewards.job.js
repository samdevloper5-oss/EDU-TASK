const { pool } = require("../config/db");
const walletRepo = require("../repositories/wallet.repo");
const { randomUUID } = require("crypto");
const logger = require("../config/logger");
const env = require("../config/env");

async function awardLeaderboardRewards() {
    if (!env.automation.enabled) return;

    // Run only on the first day of the month
    const today = new Date();
    if (today.getDate() !== 1) return;

    logger.info("leaderboard_rewards_job_start");

    const systemUser = "00000000-0000-0000-0000-000000000000";

    // Using a simplified query to find top 10 earners of this month 
    // (In a real system, we'd look at the PREVIOUS month's performance)
    const topEarners = await pool.query(`
    SELECT id, full_name FROM users 
    WHERE role = 'student' AND COALESCE(is_deleted, FALSE) = FALSE
    ORDER BY total_earnings DESC LIMIT 10
  `);

    for (const user of topEarners.rows) {
        try {
            const wallet = await walletRepo.getWalletByUserId(pool, user.id);
            if (!wallet) continue;

            const journalId = randomUUID();
            const rewardAmount = 100;

            await pool.query('BEGIN');

            await walletRepo.insertLedgerEntries(pool, [
                {
                    journal_id: journalId,
                    entry_seq: 1,
                    wallet_id: wallet.id,
                    user_id: user.id,
                    account_code: "platform_reward_expense",
                    direction: "debit",
                    amount: rewardAmount,
                    currency: "BDT",
                    description: "Monthly Leaderboard Reward (Expense)",
                    created_by: systemUser,
                },
                {
                    journal_id: journalId,
                    entry_seq: 2,
                    wallet_id: wallet.id,
                    user_id: user.id,
                    account_code: "wallet_available",
                    direction: "credit",
                    amount: rewardAmount,
                    currency: "BDT",
                    description: "Monthly Leaderboard Reward",
                    created_by: systemUser,
                }
            ]);

            await walletRepo.updateWalletBalance(pool, wallet.id, Number(wallet.balance) + rewardAmount, Number(wallet.escrow_balance));

            await pool.query('COMMIT');
            logger.info("leaderboard_reward_success", { user_id: user.id, name: user.full_name });
        } catch (err) {
            await pool.query('ROLLBACK');
            logger.error("leaderboard_reward_failed", { user_id: user.id, message: err.message });
        }
    }
}

module.exports = { awardLeaderboardRewards };
