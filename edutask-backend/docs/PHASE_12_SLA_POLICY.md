# Phase 12 SLA Policy

## Scope
Operational thresholds for monitoring and alerting only. No business-rule changes.

## Global HTTP SLO Thresholds
1. `p95` HTTP latency: warn at `> 500ms`, critical at `> 1000ms` for 10 minutes.
2. HTTP error rate:
   - warn at `4xx + 5xx > 5%` of total requests for 10 minutes.
   - critical at `5xx > 2%` for 5 minutes.

## DB/Transaction Thresholds
1. Slow query threshold uses `SLOW_QUERY_LOG_MS`.
2. Slow serializable transaction threshold uses `SERIALIZABLE_TXN_WARN_MS`.
3. Active DB connections: warn when `active_db_connections` exceeds 80% of `PGPOOL_MAX`.

## Dispute Operations SLA
1. Dispute creation endpoint p95 under `750ms`.
2. Dispute resolution endpoint p95 under `1000ms`.
3. Operational review target (manual): under 24h from pending to under_review.

## Automation Job SLA
1. Expire-task automation execution loop should complete within 60s per run.
2. Any failed automation run must be visible in logs and retried by scheduler policy.

## Financial Invariant Alert Signals
Alert when any non-zero increase appears in:
1. `escrow_double_release_attempt_total`
2. `negative_balance_attempt_total`
3. `invalid_state_transition_attempt_total`
