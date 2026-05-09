const crypto = require("crypto");

function defaultHeaders() {
  return {
    "content-type": "application/json",
    "x-request-id": `load-${crypto.randomUUID()}`,
  };
}

function makeDisputeBody(taskId, n) {
  return JSON.stringify({
    taskId,
    dispute_type: "scope_mismatch",
    description: `load-test dispute ${n}`,
    evidence: { source: "phase11_load_test" },
  });
}

function makeResolveBody(outcome, executorId) {
  return JSON.stringify({
    outcome,
    admin_decision: `phase11 ${outcome}`,
    executorId,
  });
}

module.exports = {
  defaultHeaders,
  makeDisputeBody,
  makeResolveBody,
};
