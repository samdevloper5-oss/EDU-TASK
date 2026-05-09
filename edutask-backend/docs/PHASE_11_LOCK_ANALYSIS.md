# Phase 11 Lock Contention Analysis

## Objective
Detect lock pressure and contention risks under SERIALIZABLE transaction load.

## Observability Guardrails Added
1. `src/utils/transaction.js` now logs:
   - `serializable_transaction_slow` when transaction duration exceeds `SERIALIZABLE_TXN_WARN_MS`.
2. `src/config/db.js` already logs:
   - `slow_query_detected` when query duration exceeds `SLOW_QUERY_LOG_MS`.
   - `db_query_failed` on query failure.

## Pool Contention Guardrail
1. `src/config/db.js` now sets pool `max` from `PGPOOL_MAX`.
2. `src/config/env.js` validates `PGPOOL_MAX` as positive numeric value.

## Current Environment Result
1. No production-scale lock analysis executed in this session (load runner dependency not installed).
2. No deadlock signatures were observed in existing automated tests.

## Data Collection Plan (No Logic Change)
1. During load, aggregate counts of:
   - `serializable_transaction_slow`
   - `slow_query_detected`
   - `db_query_failed`
2. Correlate by `request_id` and endpoint.
3. Flag sustained spikes as lock-pressure incidents.

## Expected Findings to Validate
1. Single-winner pattern on collision paths.
2. Rollback behavior on losing contenders.
3. No repeated deadlock cycles under collision harness.
