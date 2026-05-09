# Phase 14 Go-Live Checklist

## Blocking Preconditions
1. Schema and service layer are aligned for financial tables (`wallet_transactions` vs `ledger_entries`).
2. Global lock order is consistent across all financial flows.
3. Serializable/deadlock retry policy is implemented and tested.
4. RLS policies are validated with student/admin JWT claims.
5. Service-role key is backend-only and rotated if previously exposed.

## Concurrency Validation
1. Parallel escrow release tests show no deadlock.
2. Parallel refund/release collision tests show single-winner behavior.
3. Retry-storm idempotency tests return deterministic replay responses.

## Load Validation
1. 100+ concurrent escrow locks
2. 100+ concurrent escrow releases
3. 100+ concurrent dispute updates
4. Metrics captured:
   - p50/p95/p99
   - error rate
   - rollback rate
   - deadlocks

## Backup and Recovery Validation
1. Backup snapshot restore drill completed.
2. PITR restore drill completed to timestamp target.
3. Post-restore reconciliation queries pass.
4. RPO/RTO targets documented and met.

## Final Operational Checks
1. `/health` and `/metrics` pass after deploy.
2. Slow-query and deadlock alerts are active.
3. Reconciliation query job is scheduled and monitored.

## Release Decision
Only GO if all items above are complete with recorded evidence.

