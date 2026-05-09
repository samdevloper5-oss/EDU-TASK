const ESCROW_STATUS = Object.freeze({
  LOCKED: "locked",
  RELEASED: "released",
  REFUNDED: "refunded",
});

const ESCROW_RELEASE_TYPE = Object.freeze({
  APPROVAL: "approval",
  AUTO_RELEASE: "auto_release",
  DISPUTE_RESOLUTION: "dispute_resolution",
  REFUND: "refund",
});

function isEscrowLocked(escrow) {
  if (!escrow) {
    return false;
  }
  if (escrow.status) {
    return escrow.status === ESCROW_STATUS.LOCKED;
  }
  // Backward-compatible fallback before v2 migration cutover.
  return !escrow.released_at;
}

module.exports = {
  ESCROW_STATUS,
  ESCROW_RELEASE_TYPE,
  isEscrowLocked,
};
