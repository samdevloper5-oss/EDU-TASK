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

test("rate limiter allows up to max then returns 429", async () => {
  const middlewareModule = loadWithMocks(
    path.resolve(__dirname, "../../src/middlewares/rate_limit.middleware.js"),
    {
      [path.resolve(__dirname, "../../src/config/env.js")]: {
        rateLimit: { enabled: true },
      },
    }
  );

  const limiter = middlewareModule.createRateLimiter({
    windowMs: 60_000,
    max: 2,
    keyFn: middlewareModule.keyByIpAndUser,
    name: "test",
  });

  let passCount = 0;
  const req = { ip: "1.1.1.1", user: { id: "u1" }, headers: {} };
  const r1 = makeRes();
  const r2 = makeRes();
  const r3 = makeRes();

  limiter(req, r1, () => passCount++);
  limiter(req, r2, () => passCount++);
  limiter(req, r3, () => passCount++);

  assert.equal(passCount, 2);
  assert.equal(r3.statusCode, 429);
  assert.equal(r3.body.error.code, "rate_limited");
});
