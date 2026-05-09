const adminService = require("../services/admin.service");
const { sendSuccess } = require("../utils/http");

async function dashboardStats(req, res, next) {
  try {
    const result = await adminService.getDashboardStats(req.user);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function approveWithdrawal(req, res, next) {
  try {
    const result = await adminService.approveWithdrawal(req.user, req.params.id);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  dashboardStats,
  approveWithdrawal,
};
