const test = require("node:test");
const assert = require("node:assert/strict");
const walletRepo = require("../../src/repositories/wallet.repo");

test("updateWalletBalance arms DB wallet mutation guard before update", async () => {
  const calls = [];
  const client = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (/UPDATE wallets/i.test(sql)) {
        return {
          rows: [{ id: "w1", balance: "90.0000", escrow_balance: "10.0000" }],
        };
      }
      return { rows: [] };
    },
  };

  const result = await walletRepo.updateWalletBalance(client, "w1", 90, 10);

  assert.equal(result.id, "w1");
  assert.match(calls[0].sql, /set_config\('app\.allow_wallet_balance_update', 'on', true\)/i);
  assert.match(calls[1].sql, /UPDATE wallets/i);
  assert.deepEqual(calls[1].params, ["w1", 90, 10]);
});
