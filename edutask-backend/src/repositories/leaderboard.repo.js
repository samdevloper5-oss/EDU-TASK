async function listTopEarners(client, { fromDate = null, limit = 50, offset = 0 } = {}) {
  const params = [limit, offset];
  let dateCondition = "";
  if (fromDate) {
    params.push(fromDate);
    dateCondition = `AND t.completed_at >= $${params.length}`;
  }

  const result = await client.query(
    `
      SELECT
        u.id AS user_id,
        u.full_name,
        u.university_name,
        u.profile_picture_url,
        u.trust_score,
        COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.budget ELSE 0 END), 0)::numeric AS total_earnings,
        COUNT(*) FILTER (WHERE t.status = 'completed')::int AS completed_tasks,
        COUNT(*) OVER()::int AS total_count
      FROM users u
      LEFT JOIN tasks t
        ON t.selected_executor_id = u.id
       AND COALESCE(t.is_deleted, FALSE) = FALSE
      WHERE COALESCE(u.is_deleted, FALSE) = FALSE
      ${dateCondition}
      GROUP BY u.id, u.full_name, u.university_name, u.profile_picture_url, u.trust_score
      ORDER BY u.trust_score DESC, total_earnings DESC, completed_tasks DESC, u.created_at ASC
      LIMIT $1 OFFSET $2
    `,
    params
  );
  return result.rows;
}

module.exports = {
  listTopEarners,
};
