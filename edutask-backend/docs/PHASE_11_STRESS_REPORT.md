# Phase 11 Stress Report

## Stress Cases in Scope
1. DB pool exhaustion
2. SIGTERM during traffic
3. Job execution during shutdown
4. Idempotency key churn under load

## Current Validation State
1. Graceful shutdown path already exists (`SIGTERM`/`SIGINT` in `src/server.js`).
2. Pool max guardrail added (`PGPOOL_MAX`) to bound connection pressure.
3. Transaction timing guardrail added (`SERIALIZABLE_TXN_WARN_MS`).
4. Memory snapshot logging integrated in load runner (`load_test/run.js`).

## Execution Limits in This Session
1. Full stress execution not completed because load dependency (`autocannon`) is not installed in this environment.
2. Therefore, numeric stress outcomes are not finalized here.

## Failure-Safety Expectations (What to Verify Under Real Run)
1. On SIGTERM during load:
   - server stops accepting new requests
   - in-flight requests complete
   - DB pool closes cleanly
2. Under idempotency churn:
   - replayed keys are rejected consistently
3. Under contention:
   - one winning transaction, remaining transactions rollback
4. Under pool pressure:
   - error behavior is explicit and logged, with no process hang

## Safe Mitigations if Issues Appear
1. Increase `PGPOOL_MAX` conservatively.
2. Increase app replicas before increasing per-instance pool size.
3. Tune load profile pacing; do not change transactional semantics.
4. Use automation flags to pause non-critical jobs during incident response.
