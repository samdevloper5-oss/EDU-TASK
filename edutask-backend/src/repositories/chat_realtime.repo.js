async function getConversationByTaskId(client, taskId, forUpdate = false) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const result = await client.query(
    `SELECT * FROM conversations WHERE task_id = $1${lock}`,
    [taskId]
  );
  return result.rows[0] || null;
}

async function createConversation(client, data) {
  const { task_id, participant_one_id, participant_two_id } = data;
  const result = await client.query(
    `
      INSERT INTO conversations (
        task_id,
        participant_one_id,
        participant_two_id
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (task_id)
      DO UPDATE SET task_id = EXCLUDED.task_id
      RETURNING *
    `,
    [task_id, participant_one_id, participant_two_id]
  );
  return result.rows[0] || null;
}

async function getConversationById(client, conversationId) {
  const result = await client.query(
    "SELECT * FROM conversations WHERE id = $1",
    [conversationId]
  );
  return result.rows[0] || null;
}

async function listConversationsByUserId(client, userId, { limit = 20, offset = 0 } = {}) {
  const result = await client.query(
    `
      SELECT
        c.*,
        COUNT(*) OVER()::int AS total_count
      FROM conversations c
      WHERE c.participant_one_id = $1 OR c.participant_two_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset]
  );
  return result.rows;
}

async function createMessage(client, data) {
  const { conversation_id, sender_id, content } = data;
  const result = await client.query(
    `
      INSERT INTO conversation_messages (
        conversation_id,
        sender_id,
        content
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [conversation_id, sender_id, content]
  );
  return result.rows[0] || null;
}

async function listMessagesByConversationId(client, conversationId, { limit = 50, offset = 0 } = {}) {
  const result = await client.query(
    `
      SELECT
        m.*,
        COUNT(*) OVER()::int AS total_count
      FROM conversation_messages m
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [conversationId, limit, offset]
  );
  return result.rows;
}

async function markMessagesRead(client, conversationId, readerId) {
  const result = await client.query(
    `
      UPDATE conversation_messages
      SET is_read = TRUE
      WHERE conversation_id = $1
        AND sender_id <> $2
        AND is_read = FALSE
      RETURNING id
    `,
    [conversationId, readerId]
  );
  return result.rowCount;
}

async function countUnreadByUserId(client, userId) {
  const result = await client.query(
    `
      SELECT COUNT(*)::int AS unread_count
      FROM conversation_messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.is_read = FALSE
        AND m.sender_id <> $1
        AND (c.participant_one_id = $1 OR c.participant_two_id = $1)
    `,
    [userId]
  );
  return result.rows[0] ? Number(result.rows[0].unread_count) : 0;
}

module.exports = {
  getConversationByTaskId,
  createConversation,
  getConversationById,
  listConversationsByUserId,
  createMessage,
  listMessagesByConversationId,
  markMessagesRead,
  countUnreadByUserId,
};
