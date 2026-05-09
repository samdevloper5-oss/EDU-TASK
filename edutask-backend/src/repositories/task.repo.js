// Task repository (DB-only operations).
// No business rules here; it only executes SQL using the provided client.

async function createTask(client, data) {
  const {
    poster_id,
    task_type,
    title,
    description,
    scope,
    deliverables,
    acceptance_criteria,
    required_members,
    budget,
    deadline,
    review_window_hours,
    max_revisions,
    application_deadline,
    max_applicants,
    attachments,
    required_skills,
  } = data;

  const query = `
    INSERT INTO tasks (
      poster_id,
      task_type,
      title,
      description,
      scope,
      deliverables,
      acceptance_criteria,
      required_members,
      budget,
      deadline,
      review_window_hours,
      max_revisions,
      application_deadline,
      max_applicants,
      attachments,
      required_skills
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::jsonb)
    RETURNING *
  `;

  const values = [
    poster_id,
    task_type,
    title,
    description,
    scope,
    deliverables,
    acceptance_criteria,
    required_members ?? null,
    budget ?? null,
    deadline,
    review_window_hours ?? null,
    max_revisions ?? null,
    application_deadline ?? null,
    max_applicants ?? null,
    JSON.stringify(Array.isArray(attachments) ? attachments : []),
    JSON.stringify(Array.isArray(required_skills) ? required_skills : []),
  ];

  const result = await client.query(query, values);
  return result.rows[0];
}

async function getTaskById(client, taskId, includeDeleted = false) {
  const deletedFilter = includeDeleted ? "" : " AND COALESCE(is_deleted, FALSE) = FALSE";
  const result = await client.query(
    `SELECT * FROM tasks WHERE id = $1${deletedFilter}`,
    [taskId]
  );
  return result.rows[0] || null;
}

async function getTaskByIdForUpdate(client, taskId, includeDeleted = false) {
  const deletedFilter = includeDeleted ? "" : " AND COALESCE(is_deleted, FALSE) = FALSE";
  const result = await client.query(
    `SELECT * FROM tasks WHERE id = $1${deletedFilter} FOR UPDATE`,
    [taskId]
  );
  return result.rows[0] || null;
}

async function updateTaskStatus(client, taskId, status) {
  const result = await client.query(
    `UPDATE tasks
      SET status = $2,
          version = version + 1
      WHERE id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
      RETURNING *`,
    [taskId, status]
  );
  return result.rows[0] || null;
}

async function listTasks(client, filters) {
  const {
    status,
    task_type,
    min_budget,
    max_budget,
    skill,
    limit = 50,
    offset = 0,
    current_user_id = null,
  } = filters || {};

  const where = ["COALESCE(t.is_deleted, FALSE) = FALSE"];
  const values = [];

  if (status) {
    values.push(status);
    where.push(`status = $${values.length}`);
  }

  if (task_type) {
    values.push(task_type);
    where.push(`task_type = $${values.length}`);
  }

  if (min_budget != null) {
    values.push(min_budget);
    where.push(`budget >= $${values.length}`);
  }

  if (max_budget != null) {
    values.push(max_budget);
    where.push(`budget <= $${values.length}`);
  }

  if (skill) {
    values.push(skill);
    where.push(`
      EXISTS (
        SELECT 1
        FROM users skill_user
        WHERE skill_user.id = t.poster_id
          AND skill_user.skills ? $${values.length}
      )
    `);
  }

  values.push(limit);
  const limitParam = values.length;
  values.push(offset);
  const offsetParam = values.length;

  const whereClause = `WHERE ${where.join(" AND ")}`;

  const query = `
    SELECT
      t.*,
      COUNT(*) OVER()::int AS total_count,
      COALESCE(app_counts.applicant_count, 0)::int AS applicant_count,
      CASE
        WHEN $${values.length + 1}::uuid IS NULL THEN FALSE
        ELSE EXISTS (
          SELECT 1
          FROM task_applications self_app
          WHERE self_app.task_id = t.id
            AND self_app.applicant_id = $${values.length + 1}::uuid
        )
      END AS is_applied_by_current_user
    FROM tasks t
    LEFT JOIN (
      SELECT task_id, COUNT(*)::int AS applicant_count
      FROM task_applications
      GROUP BY task_id
    ) app_counts ON app_counts.task_id = t.id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  values.push(current_user_id);
  const result = await client.query(query, values);
  return result.rows;
}

async function listRecommendedCandidateTasks(client, userId, { limit = 100 } = {}) {
  const result = await client.query(
    `
      SELECT
        t.*,
        COALESCE(app_counts.applicant_count, 0)::int AS applicant_count,
        EXISTS (
          SELECT 1
          FROM task_applications ta
          WHERE ta.task_id = t.id
            AND ta.applicant_id = $1
        ) AS is_applied_by_current_user
      FROM tasks t
      LEFT JOIN (
        SELECT task_id, COUNT(*)::int AS applicant_count
        FROM task_applications
        GROUP BY task_id
      ) app_counts ON app_counts.task_id = t.id
      WHERE COALESCE(t.is_deleted, FALSE) = FALSE
        AND t.status = 'application_open'
        AND t.deadline > NOW()
        AND t.poster_id <> $1
      ORDER BY t.deadline ASC, t.created_at DESC
      LIMIT $2
    `,
    [userId, limit]
  );
  return result.rows;
}

module.exports = {
  createTask,
  getTaskById,
  getTaskByIdForUpdate,
  updateTaskStatus,
  listTasks,
  listRecommendedCandidateTasks,
};
