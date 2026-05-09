// Request validation middleware for critical mutation endpoints.
// Kept dependency-free to avoid runtime drift across environments.

const { sendError } = require("../utils/http");
const { MIN_WITHDRAWAL_BDT } = require("../constants/financial.constants");

function badRequest(res, message, details = {}) {
  return sendError(res, {
    statusCode: 400,
    code: "validation_error",
    message,
    details,
  });
}

function validateDisputeCreate(req, res, next) {
  const { dispute_type, description } = req.body || {};
  const allowedTypes = new Set([
    "scope_mismatch",
    "missing_submission",
    "deadline_violation",
  ]);

  if (!allowedTypes.has(dispute_type)) {
    return badRequest(res, "dispute_type is invalid.");
  }
  if (!description || String(description).trim().length === 0) {
    return badRequest(res, "description is required.");
  }
  if (String(description).length > 2000) {
    return badRequest(res, "description exceeds max length.");
  }
  return next();
}

function validateDisputeResolution(req, res, next) {
  const { outcome, admin_decision, admin_decision_fund_allocation } =
    req.body || {};

  const allowedOutcomes = new Set(["release", "refund", "none"]);
  if (!allowedOutcomes.has(outcome)) {
    return badRequest(res, "outcome is invalid.");
  }
  if (!admin_decision || String(admin_decision).trim().length === 0) {
    return badRequest(res, "admin_decision is required.");
  }
  if (String(admin_decision).length > 2000) {
    return badRequest(res, "admin_decision exceeds max length.");
  }
  if (admin_decision_fund_allocation != null) {
    return badRequest(
      res,
      "admin_decision_fund_allocation is not allowed in current policy."
    );
  }
  return next();
}

function parseAmount(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(4));
}

function validateWalletDeposit(req, res, next) {
  const amount = parseAmount(req.body && req.body.amount);
  if (amount == null || amount <= 0) {
    return badRequest(res, "amount must be a positive number.");
  }
  req.body.amount = amount;
  return next();
}

function validateWalletWithdrawal(req, res, next) {
  const amount = parseAmount(req.body && req.body.amount);
  if (amount == null || amount <= 0) {
    return badRequest(res, "amount must be a positive number.");
  }
  if (amount < MIN_WITHDRAWAL_BDT) {
    return badRequest(
      res,
      `Minimum withdrawal is ${MIN_WITHDRAWAL_BDT} BDT.`,
      { min_withdrawal_bdt: MIN_WITHDRAWAL_BDT }
    );
  }
  req.body.amount = amount;
  return next();
}

module.exports = {
  validateDisputeCreate,
  validateDisputeResolution,
  validateWalletDeposit,
  validateWalletWithdrawal,
};
