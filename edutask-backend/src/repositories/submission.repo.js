// Submission repository (read-only additions for Phase 5.3).
// No business rules here; it only executes SQL using the provided client.

async function getSubmissionByTaskId(client, taskId) {
  const result = await client.query(
    "SELECT * FROM submissions WHERE task_id = $1",
    [taskId]
  );
  return result.rows[0] || null;
}

module.exports = {
  getSubmissionByTaskId,
};
