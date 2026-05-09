## Final Go-Live Checklist (Fintech-Grade)

### 1. Secrets & Environment
- [ ] Rotate previously exposed database password and service-role key.
- [ ] Backend runtime uses `SUPABASE_DB_POOLER_URL` via `DATABASE_URL`.
- [ ] Migrations use `SUPABASE_DB_DIRECT_URL` only.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is present only in backend secret storage.
- [ ] Frontend uses only `SUPABASE_ANON_KEY`.
- [ ] `DB_SSL=true` in staging and production.

### 2. Database Hardening
- [ ] Run `npm run migrate:v2`.
- [ ] Run `npm run migrate:backfill`.
- [ ] Run `npm run migrate:hardening`.
- [ ] Apply RLS policies (`database/rls/supabase_rls_policies.sql`).
- [ ] Confirm FK policies are `ON DELETE RESTRICT` for financial relationships.
- [ ] Confirm delete guards are active on `wallets`, `ledger_entries`, `escrows`.

### 3. Financial Invariants
- [ ] Execute `database/ops/financial_invariant_checks.sql`.
- [ ] Verify all queries return zero rows.
- [ ] Verify `v_financial_reconciliation` shows zero deltas.

### 4. Concurrency & Reliability
- [ ] Run `npm run load:financial` with 100-case payloads.
- [ ] Confirm no deadlocks after bounded retries.
- [ ] Confirm no negative balances.
- [ ] Confirm journal imbalance query still returns zero rows.

### 5. Security Controls
- [ ] Financial mutation routes enforce auth + role checks.
- [ ] Idempotency middleware enabled on mutation routes.
- [ ] Financial mutation rate limiting enabled.
- [ ] Request validation middleware enabled for dispute create/resolve.
- [ ] Audit logs present for `escrow_released`, `escrow_refunded`, `dispute_resolved`.

### 6. Operational Readiness
- [ ] CI pipeline green (`lint`, `test`, coverage gates).
- [ ] Backup and PITR verified in Supabase.
- [ ] Rollback SQL tested in staging.
- [ ] Slow query and rollback/deadlock metrics monitored.
- [ ] Release window approved with rollback owner assigned.

