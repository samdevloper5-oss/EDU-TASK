// Chat repository (read-only additions for Phase 5.3).
// No business rules here; it only executes SQL using the provided client.

async function listChatMessagesByTaskId(client, taskId) {
  const result = await client.query(
    "SELECT * FROM chat_messages WHERE task_id = $1 ORDER BY sent_at ASC",
    [taskId]
  );
  return result.rows;
}

module.exports = {
  listChatMessagesByTaskId,
};
