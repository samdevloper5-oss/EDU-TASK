async function createNotification(client, data) {
  const {
    user_id,
    type,
    title,
    message,
    reference_id = null,
    metadata = {},
  } = data;

  const result = await client.query(
    `
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        reference_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      RETURNING *
    `,
    [user_id, type, title, message, reference_id, JSON.stringify(metadata || {})]
  );
  return result.rows[0] || null;
}

async function listNotificationsByUserId(client, userId, { limit = 20, offset = 0 } = {}) {
  const result = await client.query(
    `
      SELECT
        n.*,
        COUNT(*) OVER()::int AS total_count
      FROM notifications n
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset]
  );
  return result.rows;
}

async function markAllReadByUserId(client, userId) {
  const result = await client.query(
    `
      UPDATE notifications
      SET is_read = TRUE,
          read_at = COALESCE(read_at, NOW())
      WHERE user_id = $1
        AND is_read = FALSE
      RETURNING id
    `,
    [userId]
  );
  return result.rowCount;
}

async function countUnreadByUserId(client, userId) {
  const result = await client.query(
    `
      SELECT COUNT(*)::int AS unread_count
      FROM notifications
      WHERE user_id = $1
        AND is_read = FALSE
    `,
    [userId]
  );
  return result.rows[0] ? Number(result.rows[0].unread_count) : 0;
}

module.exports = {
  createNotification,
  listNotificationsByUserId,
  markAllReadByUserId,
  countUnreadByUserId,
};
