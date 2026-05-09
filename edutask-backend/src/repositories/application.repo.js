// Application repository (DB-only operations).
// No business rules here; it only executes SQL using the provided client.

async function createApplication(client, data) {
  const { task_id, applicant_id, cover_letter } = data;

  const query = `
    INSERT INTO task_applications (task_id, applicant_id, cover_letter)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  const values = [task_id, applicant_id, cover_letter || null];
  const result = await client.query(query, values);
  return result.rows[0];
}

async function countApplicationsByTask(client, taskId) {
  const result = await client.query(
    "SELECT COUNT(*)::int AS total FROM task_applications WHERE task_id = $1",
    [taskId]
  );
  return result.rows[0] ? Number(result.rows[0].total) : 0;
}

async function getApplicationByTaskAndApplicant(client, taskId, applicantId) {
  const result = await client.query(
    "SELECT * FROM task_applications WHERE task_id = $1 AND applicant_id = $2",
    [taskId, applicantId]
  );
  return result.rows[0] || null;
}

async function listApplicationsByTask(client, taskId, { limit = 20, offset = 0 } = {}) {
  const result = await client.query(
    `
      SELECT
        ta.*,
        COUNT(*) OVER()::int AS total_count,
        u.full_name AS applicant_name,
        u.university_name AS applicant_university_name,
        u.profile_picture_url AS applicant_profile_picture_url
      FROM task_applications ta
      JOIN users u ON u.id = ta.applicant_id
      WHERE ta.task_id = $1
      ORDER BY ta.applied_at DESC
      LIMIT $2 OFFSET $3
    `,
    [taskId, limit, offset]
  );
  return result.rows;
}

module.exports = {
  createApplication,
  countApplicationsByTask,
  getApplicationByTaskAndApplicant,
  listApplicationsByTask,
};
