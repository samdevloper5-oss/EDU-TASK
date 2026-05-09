// Profile repository (DB-only operations).
// No business rules here; it only executes SQL using the provided client.

const {
  PROFILE_VERIFICATION_STATUS,
} = require("../constants/profile.constants");

async function createProfile(client, data) {
  const {
    user_id,
    full_name,
    institution,
    department,
    bio,
    profile_image_url,
    verification_document_url,
    verification_status = PROFILE_VERIFICATION_STATUS.UNVERIFIED,
  } = data;

  if (!user_id || !full_name) {
    throw new Error("user_id and full_name are required.");
  }

  const query = `
    INSERT INTO profiles (
      user_id,
      full_name,
      institution,
      department,
      bio,
      profile_image_url,
      verification_document_url,
      verification_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    user_id,
    full_name,
    institution || null,
    department || null,
    bio || null,
    profile_image_url || null,
    verification_document_url || null,
    verification_status,
  ];

  const result = await client.query(query, values);
  return result.rows[0];
}

module.exports = {
  createProfile,
  async getProfileSummaryByUserId(client, userId) {
    const result = await client.query(
      `
        WITH task_stats AS (
          SELECT
            COUNT(*) FILTER (
              WHERE t.selected_executor_id = $1
                AND t.status = 'completed'
                AND COALESCE(t.is_deleted, FALSE) = FALSE
            )::int AS completed_task_count,
            COUNT(*) FILTER (
              WHERE t.selected_executor_id = $1
                AND t.status IN ('executor_selected', 'in_progress', 'under_review')
                AND COALESCE(t.is_deleted, FALSE) = FALSE
            )::int AS active_task_count,
            COUNT(*) FILTER (
              WHERE t.selected_executor_id = $1
                AND t.status IN ('completed', 'cancelled')
                AND COALESCE(t.is_deleted, FALSE) = FALSE
            )::int AS resolved_task_count
          FROM tasks t
        )
        SELECT
          u.id,
          u.email,
          u.full_name,
          u.university_name,
          u.department,
          u.student_id,
          u.location,
          u.phone,
          u.skills,
          u.profile_picture_url,
          u.role,
          u.is_verified,
          u.trust_score,
          u.total_earnings,
          p.bio,
          p.verification_status,
          COALESCE(ts.completed_task_count, 0) AS completed_task_count,
          COALESCE(ts.active_task_count, 0) AS active_task_count,
          COALESCE(ts.resolved_task_count, 0) AS resolved_task_count
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        CROSS JOIN task_stats ts
        WHERE u.id = $1
          AND COALESCE(u.is_deleted, FALSE) = FALSE
      `,
      [userId]
    );
    return result.rows[0] || null;
  },
};
