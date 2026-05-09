const env = require("../config/env");

const PAYMENT_PROCESSING_FEE_RATE = 0.01;
const TASK_COMMISSION_RATE = Number(env.finance.platformFeePercentage) / 100;
const MIN_WITHDRAWAL_BDT = 100;
const REFERRAL_REWARD_AMOUNT = Number(env.finance.referralRewardAmount);

module.exports = {
  PAYMENT_PROCESSING_FEE_RATE,
  TASK_COMMISSION_RATE,
  MIN_WITHDRAWAL_BDT,
  REFERRAL_REWARD_AMOUNT,
};
