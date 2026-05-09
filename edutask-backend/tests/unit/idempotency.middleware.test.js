const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { loadWithMocks } = require("../helpers/load-with-mocks");

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("idempotency middleware blocks replay by key", async () => {
  const middlewareModule = loadWithMocks(
    path.resolve(__dirname, "../../src/middlewares/idempotency.middleware.js"),
    {
      [path.resolve(__dirname, "../../src/config/env.js")]: {
        idempotency: { enabled: true },
      },
    }
  );

  const mw = middlewareModule.idempotencyMiddleware({ ttlMs: 5000 });
  let nextCalls = 0;
  const req = { headers: { "idempotency-key": "k1" } };
  const res1 = makeRes();
  const res2 = makeRes();

  mw(req, res1, () => {
    nextCalls += 1;
  });
  mw(req, res2, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
  assert.equal(res2.statusCode, 409);
  assert.equal(res2.body.error.code, "idempotency_replay");
});
