# Phase 11 Throughput Benchmark

## Target Metrics
1. p50 / p95 / p99 latency per scenario
2. Error rate / non-2xx ratio
3. Request throughput (RPS)
4. Escrow/dispute collision success ratio

## Configured Benchmarks
1. `task_reads_100rps` (`GET /health`)
2. `dispute_create_50_concurrent`
3. `admin_resolve_20_concurrent`
4. `collisions` (10 admins resolving same dispute)

## Current Session Status
1. Benchmark runner is implemented.
2. Benchmark execution is pending in this environment due missing `autocannon` package install.

## Safe Benchmark Procedure
1. Run against staging with production-like DB settings.
2. Use real auth-enabled request context and seeded IDs.
3. Capture summaries emitted by `load_test/run.js` JSON output.

## Output Contract
Each scenario emits:
1. `requests`
2. `latency_p50_ms`
3. `latency_p95_ms`
4. `latency_p99_ms`
5. `errors`
6. `timeouts`
7. `non2xx`

## Interpretation Guardrail
Any throughput drop with rising `serializable_transaction_slow` / `slow_query_detected` should be treated as contention-driven, not correctness-driven.
