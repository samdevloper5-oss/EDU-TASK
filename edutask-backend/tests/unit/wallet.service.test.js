const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { loadWithMocks } = require("../helpers/load-with-mocks");

function loadWalletService(mocks) {
  return loadWithMocks(
    path.resolve(__dirname, "../../src/services/wallet.service.js"),
    mocks
  );
}

test("createDeposit inserts balanced ledger entries and updates wallet", async () => {
  const calls = [];
  const walletRepo = {
    getWalletByUserId: async () => ({ id: "w1", user_id: "u1", balance: "100.0000", escrow_balance: "0.0000" }),
    insertLedgerEntries: async (_client, entries) => {
      calls.push({ fn: "insertLedgerEntries", entries });
      return entries;
    },
    updateWalletBalance: async (_client, walletId, balance, escrowBalance) => {
      calls.push({ fn: "updateWalletBalance", walletId, balance, escrowBalance });
      return { id: walletId, balance, escrow_balance: escrowBalance };
    },
  };
  const auditService = {
    logEvent: async (_client, payload) => calls.push({ fn: "audit", action: payload.action }),
  };
  const transaction = {
    withSerializableTransaction: async (work) => work({ query: async () => ({ rows: [] }) }),
  };
  const service = loadWalletService({
    [path.resolve(__dirname, "../../src/repositories/wallet.repo.js")]: walletRepo,
    [path.resolve(__dirname, "../../src/services/audit.service.js")]: auditService,
    [path.resolve(__dirname, "../../src/utils/transaction.js")]: transaction,
  });

  const result = await service.createDeposit(
    { id: "u1", is_active: true, is_suspended: false },
    25
  );

  assert.equal(result.balance_after, 124.75);
  const journalCall = calls.find((c) => c.fn === "insertLedgerEntries");
  assert.ok(journalCall);
  assert.equal(journalCall.entries.length, 3);
  const debit = journalCall.entries.find((e) => e.direction === "debit");
  assert.equal(Number(debit.amount), 25);
  assert.equal(
    journalCall.entries
      .filter((e) => e.direction === "credit")
      .reduce((sum, e) => sum + Number(e.amount), 0),
    25
  );
  assert.match(calls.find((c) => c.fn === "audit").action, /wallet_deposit/);
});

test("processWithdrawal debits wallet and writes balanced journal", async () => {
  const calls = [];
  const walletRepo = {
    getWithdrawalRequestById: async () => ({
      id: "wr1",
      status: "approved",
      wallet_id: "w1",
      user_id: "u1",
      amount: "140.0000",
    }),
    getWalletById: async () => ({ id: "w1", user_id: "u1", balance: "200.0000", escrow_balance: "0.0000" }),
    insertLedgerEntries: async (_client, entries) => {
      calls.push({ fn: "insertLedgerEntries", entries });
      return entries;
    },
    updateWalletBalance: async (_client, walletId, balance, escrowBalance) => {
      calls.push({ fn: "updateWalletBalance", walletId, balance, escrowBalance });
      return { id: walletId, balance, escrow_balance: escrowBalance };
    },
    updateWithdrawalRequestStatus: async () => ({ id: "wr1", status: "paid" }),
  };
  const auditService = {
    logEvent: async (_client, payload) => calls.push({ fn: "audit", action: payload.action }),
  };
  const transaction = {
    withSerializableTransaction: async (work) => work({ query: async () => ({ rows: [] }) }),
  };
  const service = loadWalletService({
    [path.resolve(__dirname, "../../src/repositories/wallet.repo.js")]: walletRepo,
    [path.resolve(__dirname, "../../src/repositories/user.repo.js")]: {
      getUserById: async () => ({ id: "u1", referred_by: null }),
    },
    [path.resolve(__dirname, "../../src/services/referral.service.js")]: {
      creditReferralRewardInTransaction: async () => null,
    },
    [path.resolve(__dirname, "../../src/services/audit.service.js")]: auditService,
    [path.resolve(__dirname, "../../src/utils/transaction.js")]: transaction,
  });

  const result = await service.processWithdrawal(
    { id: "admin1", role: "admin", is_active: true, is_suspended: false },
    "wr1",
    {}
  );

  assert.equal(result.withdrawal_request.status, "paid");
  assert.equal(result.balance_after, 58.6);
  const journalCall = calls.find((c) => c.fn === "insertLedgerEntries");
  assert.ok(journalCall);
  assert.equal(journalCall.entries.length, 3);
  assert.equal(
    journalCall.entries.filter((e) => e.direction === "debit").length,
    1
  );
  assert.equal(
    journalCall.entries.filter((e) => e.direction === "credit").length,
    2
  );
});

test("applyEscrowLock rejects insufficient available balance", async () => {
  const service = loadWalletService({
    [path.resolve(__dirname, "../../src/repositories/wallet.repo.js")]: {},
    [path.resolve(__dirname, "../../src/services/audit.service.js")]: {},
    [path.resolve(__dirname, "../../src/utils/transaction.js")]: {
      withSerializableTransaction: async (work) => work({ query: async () => ({ rows: [] }) }),
    },
  });

  await assert.rejects(
    () =>
      service.applyEscrowLock(
        {},
        { id: "w1", user_id: "u1", balance: "10.0000", escrow_balance: "0.0000" },
        20
      ),
    /Insufficient wallet balance/
  );
});
