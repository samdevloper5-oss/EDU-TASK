const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { loadWithMocks } = require("../helpers/load-with-mocks");

function loadEscrowService(mocks) {
  return loadWithMocks(
    path.resolve(__dirname, "../../src/services/escrow.service.js"),
    mocks
  );
}

test("releaseEscrow is idempotent when already released with same type", async () => {
  const walletRepo = {
    getWalletByUserId: async () => {
      throw new Error("should not be called");
    },
    getWalletById: async () => {
      throw new Error("should not be called");
    },
  };
  const walletService = {
    applyEscrowReleaseFromPoster: async () => {},
    applyEscrowReleaseApproval: async () => {},
  };
  const auditService = { logEvent: async () => {} };
  const service = loadEscrowService({
    [path.resolve(__dirname, "../../src/repositories/wallet.repo.js")]: walletRepo,
    [path.resolve(__dirname, "../../src/services/wallet.service.js")]: walletService,
    [path.resolve(__dirname, "../../src/services/audit.service.js")]: auditService,
  });

  const existing = {
    id: "esc_1",
    released_at: new Date().toISOString(),
    release_type: "dispute_resolution",
  };
  const client = {
    async query() {
      return { rows: [existing] };
    },
  };

  const result = await service.releaseEscrow(client, {
    escrowId: "esc_1",
    executorId: "user_exec",
    releaseType: "dispute_resolution",
  });

  assert.equal(result.id, "esc_1");
});

test("refundEscrow locks escrow, updates release_type and applies refund", async () => {
  const calls = [];
  const walletRepo = {
    getWalletById: async () => ({ id: "w_poster", user_id: "u_poster", balance: 10, escrow_balance: 50 }),
  };
  const walletService = {
    applyEscrowRefund: async (client, wallet, amount) => {
      calls.push({ fn: "applyEscrowRefund", wallet: wallet.id, amount: Number(amount) });
    },
  };
  const auditService = {
    logEvent: async (_client, payload) => {
      calls.push({ fn: "audit", action: payload.action });
    },
  };
  const service = loadEscrowService({
    [path.resolve(__dirname, "../../src/repositories/wallet.repo.js")]: walletRepo,
    [path.resolve(__dirname, "../../src/services/wallet.service.js")]: walletService,
    [path.resolve(__dirname, "../../src/services/audit.service.js")]: auditService,
  });

  let queryCount = 0;
  const client = {
    async query(sql) {
      queryCount += 1;
      if (queryCount === 1) {
        assert.match(sql, /FOR UPDATE/);
        return { rows: [{ id: "esc_1", poster_wallet_id: "w_poster", amount: "25", released_at: null }] };
      }
      return { rows: [{ id: "esc_1", release_type: "dispute_resolution" }] };
    },
  };

  const updated = await service.refundEscrow(client, {
    escrowId: "esc_1",
    releaseType: "dispute_resolution",
  });

  assert.equal(updated.id, "esc_1");
  assert.deepEqual(calls, [
    { fn: "applyEscrowRefund", wallet: "w_poster", amount: 25 },
    { fn: "audit", action: "escrow_refunded" },
  ]);
});

test("releaseEscrow debits poster escrow and credits executor in one flow", async () => {
  const calls = [];
  const walletRepo = {
    getWalletByUserId: async (_client, userId) => ({
      id: userId === "u_exec" ? "w_exec" : "w_poster",
      user_id: userId,
      balance: 0,
      escrow_balance: 30,
    }),
    getWalletById: async (_client, walletId) => ({
      id: walletId,
      user_id: walletId === "w_exec" ? "u_exec" : "u_poster",
      balance: walletId === "w_exec" ? 5 : 100,
      escrow_balance: walletId === "w_exec" ? 0 : 30,
    }),
  };
  const walletService = {
    applyEscrowReleaseFromPoster: async (_client, wallet, amount) => {
      calls.push({ fn: "poster_release", wallet: wallet.id, amount: Number(amount) });
    },
    applyEscrowReleaseApproval: async (_client, wallet, amount) => {
      calls.push({ fn: "executor_credit", wallet: wallet.id, amount: Number(amount) });
      return { journal_id: "j_1" };
    },
  };
  const auditService = {
    logEvent: async (_client, payload) => {
      calls.push({ fn: "audit", action: payload.action });
    },
  };
  const service = loadEscrowService({
    [path.resolve(__dirname, "../../src/repositories/wallet.repo.js")]: walletRepo,
    [path.resolve(__dirname, "../../src/services/wallet.service.js")]: walletService,
    [path.resolve(__dirname, "../../src/services/audit.service.js")]: auditService,
  });

  let count = 0;
  const client = {
    async query(sql) {
      count += 1;
      if (/FROM escrows .*FOR UPDATE/i.test(sql)) {
        assert.match(sql, /FROM escrows .*FOR UPDATE/i);
        return { rows: [{ id: "esc_2", task_id: "task_2", poster_wallet_id: "w_poster", amount: "30", released_at: null }] };
      }
      if (/FROM tasks WHERE id = \$1/i.test(sql)) {
        assert.match(
          sql,
          /FROM tasks WHERE id = \$1(?: AND COALESCE\(is_deleted, FALSE\) = FALSE)? FOR UPDATE/i
        );
        return { rows: [{ id: "task_2" }] };
      }
      if (/UPDATE escrows/i.test(sql)) {
        return { rows: [{ id: "esc_2", task_id: "task_2", release_type: "approval" }] };
      }
      if (/SELECT id, referred_by FROM users/i.test(sql)) {
        return { rows: [{ id: "u_exec", referred_by: null }] };
      }
      return { rows: [] };
    },
  };

  const released = await service.releaseEscrow(client, {
    escrowId: "esc_2",
    executorId: "u_exec",
    releaseType: "approval",
  });

  assert.equal(released.id, "esc_2");
  assert.deepEqual(calls, [
    { fn: "poster_release", wallet: "w_poster", amount: 30 },
    { fn: "executor_credit", wallet: "w_exec", amount: 30 },
    { fn: "audit", action: "escrow_released" },
  ]);
});
