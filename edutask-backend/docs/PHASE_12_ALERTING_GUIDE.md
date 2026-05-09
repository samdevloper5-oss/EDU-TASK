# Phase 12 Alerting Guide

## Severity Levels
1. `SEV-1` Critical production risk (sustained 5xx, DB unavailable, repeated invariant violations).
2. `SEV-2` Degraded service (high latency, elevated rollback rate, high lock pressure).
3. `SEV-3` Early warning (rate-limit spikes, isolated slow-query increases).

## Alert Conditions
1. `SEV-1`
   - `http_5xx_total` slope indicates >2% error rate for 5m.
   - `/health` DB probe failures.
   - Any sustained increase in `negative_balance_attempt_total` with customer impact.
2. `SEV-2`
   - p95 latency above SLA threshold for 10m.
   - `transaction_rollbacks_total` spike correlated with lock contention.
   - `active_db_connections` above 80% of pool max for 10m.
3. `SEV-3`
   - `rate_limit_hits_total` sudden growth.
   - `idempotency_replay_total` abnormal growth.
   - slow query count growth without user-visible impact.

## Ownership & Escalation
1. Primary on-call: backend operations owner.
2. Secondary: database/platform owner.
3. Escalate from `SEV-2` to `SEV-1` if customer-impacting for >15m.

## Runbook References
1. DB outage: `docs/PHASE_12_RUNBOOK.md`
2. Lock contention: `docs/PHASE_12_RUNBOOK.md`
3. High error rate and rollback: `docs/PHASE_12_RUNBOOK.md`
