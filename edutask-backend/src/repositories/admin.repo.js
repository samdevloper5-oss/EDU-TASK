async function getDashboardStats(client) {
  const result = await client.query(
    `
      WITH user_stats AS (
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (
            WHERE last_login_at >= NOW() - INTERVAL '30 days'
          )::int AS active_users
        FROM users
        WHERE COALESCE(is_deleted, FALSE) = FALSE
      ),
      task_stats AS (
        SELECT
          COUNT(*)::int AS total_tasks,
          COUNT(*) FILTER (
            WHERE status IN ('published', 'application_open', 'executor_selected', 'in_progress', 'under_review')
          )::int AS active_tasks
          ,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_tasks
        FROM tasks
        WHERE COALESCE(is_deleted, FALSE) = FALSE
      ),
      revenue_stats AS (
        SELECT COALESCE(SUM(amount), 0)::numeric AS total_revenue
        FROM ledger_entries
        WHERE account_code = 'platform_fee_revenue'
          AND direction = 'credit'
      ),
      withdrawal_stats AS (
        SELECT COALESCE(SUM(amount), 0)::numeric AS total_withdrawals
        FROM withdrawal_requests
        WHERE status = 'paid'
      ),
      platform_earnings_stats AS (
        SELECT
          COALESCE(SUM(fee_amount), 0)::numeric AS commission_total,
          COALESCE(SUM(fee_amount) FILTER (
            WHERE created_at >= NOW() - INTERVAL '7 days'
          ), 0)::numeric AS commission_weekly,
          COALESCE(SUM(fee_amount) FILTER (
            WHERE created_at >= NOW() - INTERVAL '30 days'
          ), 0)::numeric AS commission_monthly,
          COALESCE(AVG(gross_amount), 0)::numeric AS avg_task_value
        FROM platform_earnings
      )
      SELECT
        us.total_users,
        us.active_users,
        ts.total_tasks,
        ts.active_tasks,
        ts.completed_tasks,
        rs.total_revenue,
        ws.total_withdrawals,
        ps.commission_total,
        ps.commission_weekly,
        ps.commission_monthly,
        ps.avg_task_value
      FROM user_stats us
      CROSS JOIN task_stats ts
      CROSS JOIN revenue_stats rs
      CROSS JOIN withdrawal_stats ws
      CROSS JOIN platform_earnings_stats ps
    `
  );
  return result.rows[0] || null;
}

async function getTopEarners(client, limit = 5) {
  const result = await client.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.university_name,
        u.total_earnings
      FROM users u
      WHERE COALESCE(u.is_deleted, FALSE) = FALSE
      ORDER BY u.total_earnings DESC, u.created_at ASC
      LIMIT $1
    `,
    [limit]
  );
  return result.rows;
}

module.exports = {
  getDashboardStats,
  getTopEarners,
};
