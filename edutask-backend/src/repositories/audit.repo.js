// Audit repository (DB-only operations).
// No business rules here; it only executes SQL using the provided client.

async function insertAuditLog(client, data) {
  const {
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
  } = data;

  if (!action || !entity_type) {
    throw new Error("action and entity_type are required for audit logs.");
  }

  const query = `
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      old_values,
      new_values,
      ip_address,
      user_agent
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    user_id || null,
    action,
    entity_type,
    entity_id || null,
    old_values || null,
    new_values || null,
    ip_address || null,
    user_agent || null,
  ];

  const result = await client.query(query, values);
  return result.rows[0];
}

async function listAuditLogsForEntities(client, entityFilters) {
  const values = [];
  const clauses = [];

  entityFilters.forEach((f) => {
    values.push(f.entity_type, f.entity_id);
    clauses.push(`(entity_type = $${values.length - 1} AND entity_id = $${values.length})`);
  });

  const whereClause = clauses.length ? `WHERE ${clauses.join(" OR ")}` : "";

  const query = `
    SELECT * FROM audit_logs
    ${whereClause}
    ORDER BY created_at DESC
  `;

  const result = await client.query(query, values);
  return result.rows;
}

module.exports = {
  insertAuditLog,
  listAuditLogsForEntities,
};
