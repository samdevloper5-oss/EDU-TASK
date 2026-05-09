const walletService = require("../services/wallet.service");
const { sendSuccess, sendPaginatedSuccess } = require("../utils/http");
const { parsePagination } = require("../utils/pagination");

async function getWallet(req, res, next) {
  try {
    const wallet = await walletService.getWallet(req.user);
    return sendSuccess(res, wallet);
  } catch (error) {
    return next(error);
  }
}

async function listTransactions(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query, { limit: 20, maxLimit: 100 });
    const result = await walletService.listWalletTransactions(req.user, {
      page,
      limit,
    });
    return sendPaginatedSuccess(res, result.rows, result.pagination);
  } catch (error) {
    return next(error);
  }
}

async function listWithdrawals(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query, { limit: 20, maxLimit: 100 });
    const result = await walletService.listWithdrawalRequests(req.user, {
      page,
      limit,
      status: req.query && req.query.status ? req.query.status : undefined,
    });
    return sendPaginatedSuccess(res, result.rows, result.pagination);
  } catch (error) {
    return next(error);
  }
}

async function createDeposit(req, res, next) {
  try {
    const result = await walletService.deposit(req.user, req.body.amount, {
      idempotencyKey: req.headers["idempotency-key"] || null,
    });
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

async function createWithdrawal(req, res, next) {
  try {
    const result = await walletService.withdraw(req.user, req.body.amount, {
      idempotencyKey: req.headers["idempotency-key"] || null,
    });
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getWallet,
  listTransactions,
  listWithdrawals,
  createDeposit,
  createWithdrawal,
};
