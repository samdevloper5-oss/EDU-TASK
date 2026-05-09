# Phase 11 Load Test Harness

## Scope
This harness is observability/test-only. It does not alter business logic or schema.

## Prerequisites
1. Backend server running.
2. Reachable PostgreSQL.
3. Seeded IDs for paid-task and dispute load targets.
4. `npm install` completed (for `autocannon`).

## Commands
1. Throughput/latency load run:
```bash
npm run load:test
```

2. Collision run (10 admin resolution attempts on one dispute):
```bash
npm run load:collisions
```

## Environment Overrides
1. `LOAD_BASE_URL` (default `http://localhost:$PORT`)
2. `LOAD_TASK_ID`
3. `LOAD_DISPUTE_ID`
4. `LOAD_EXECUTOR_ID`
5. `LOAD_DURATION_SEC` (default `30`)
6. `LOAD_COLLISION_ADMINS` (default `10`)

## Expected Validation Goals
1. High-concurrency dispute and admin endpoints are stable under load.
2. Collision attempts show single-winner resolution behavior.
3. No deadlocks, no abnormal lock wait, no crash loop.
