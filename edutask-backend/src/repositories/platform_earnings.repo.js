async function createPlatformEarning(client, data) {
  const { task_id, escrow_id, gross_amount, fee_amount, net_amount } = data;
  const result = await client.query(
    `
      INSERT INTO platform_earnings (
        task_id,
        escrow_id,
        gross_amount,
        fee_amount,
        net_amount
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (task_id) DO NOTHING
      RETURNING *
    `,
    [task_id, escrow_id, gross_amount, fee_amount, net_amount]
  );
  return result.rows[0] || null;
}

async function getPlatformEarningByTaskId(client, taskId, forUpdate = false) {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const result = await client.query(
    `SELECT * FROM platform_earnings WHERE task_id = $1${lock}`,
    [taskId]
  );
  return result.rows[0] || null;
}

async function getRevenueSummary(client, { fromDate } = {}) {
  if (fromDate) {
    const result = await client.query(
      `
        SELECT
          COALESCE(SUM(gross_amount), 0)::numeric AS gross_amount,
          COALESCE(SUM(fee_amount), 0)::numeric AS fee_amount,
          COALESCE(SUM(net_amount), 0)::numeric AS net_amount
        FROM platform_earnings
        WHERE created_at >= $1
      `,
      [fromDate]
    );
    return result.rows[0] || null;
  }

  const result = await client.query(
    `
      SELECT
        COALESCE(SUM(gross_amount), 0)::numeric AS gross_amount,
        COALESCE(SUM(fee_amount), 0)::numeric AS fee_amount,
        COALESCE(SUM(net_amount), 0)::numeric AS net_amount
      FROM platform_earnings
    `
  );
  return result.rows[0] || null;
}

module.exports = {
  createPlatformEarning,
  getPlatformEarningByTaskId,
  getRevenueSummary,
};
