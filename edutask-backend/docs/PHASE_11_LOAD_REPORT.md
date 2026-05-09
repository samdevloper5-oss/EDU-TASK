# Phase 11 Load Report

## Scope
Performance/scalability validation only. No schema or business logic changes.

## Harness Added
1. `load_test/run.js` (autocannon scenarios)
2. `load_test/collisions.js` (high-contention admin resolution attempts)
3. `load_test/scenarios.js`
4. `load_test/README.md`

## Scenarios Configured
1. 50 concurrent dispute creations (`POST /tasks/:taskId/disputes`)
2. 20 concurrent admin resolutions (`POST /admin/disputes/:disputeId/resolve`)
3. 100 task reads/sec proxy scenario (`GET /health`)
4. Collision harness for 10 simultaneous admin resolution attempts

## Execution Status (Current Environment)
1. Unit/integration/concurrency test suite: executed and passing (`node --test`).
2. Load run command (`node load_test/run.js`): blocked because `autocannon` is not installed in current environment.

Observed failure:
```text
autocannon is required. Run: npm install
```

## Required to Complete Full Metrics
1. Install dependencies (`npm install`).
2. Run API server with seeded paid task + dispute IDs.
3. Set:
   - `LOAD_TASK_ID`
   - `LOAD_DISPUTE_ID`
   - `LOAD_EXECUTOR_ID`
4. Execute:
   - `npm run load:test`
   - `npm run load:collisions`

## Safety Notes
1. No runtime business logic was altered by the load harness.
2. Harness is external and does not bypass service invariants.
