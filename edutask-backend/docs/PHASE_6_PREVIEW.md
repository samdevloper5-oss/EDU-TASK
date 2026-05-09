## Phase 6 Design Overview

Phase 6 provides observability, operational visibility, and analytics for disputes. It is read-only and uses existing data to support dashboards, SLA tracking, and admin performance metrics. No changes to Phase 4B/5 behavior are introduced.

---

## Data Sources (Tables + Fields)

**Primary**
- `disputes`: `status`, `created_at`, `resolved_at`, `assigned_admin_id`, `auto_resolved`, `auto_resolution_reason`, `dispute_type`, `task_id`
- `tasks`: `status`, `task_type`, `poster_id`, `selected_executor_id`, `completed_at`
- `audit_logs`: `action`, `entity_type`, `entity_id`, `user_id`, `created_at`
- `users`: `id`, `role`
- `escrows`: `release_type`, `released_at`, `task_id`

**Supporting (read-only)**
- `wallet_transactions`: `transaction_type`, `related_task_id`, `related_escrow_id`, `created_at`
- `chat_messages`: `task_id`, `sent_at`
- `reviews`: `task_id`, `reviewed_at`, `outcome`
- `submissions`: `task_id`, `submitted_at`

---

## Metrics Definitions

**SLA Tracking**
- Time to first admin review: `first_under_review_time - disputes.created_at`
- Time in pending: `first_under_review_time - disputes.created_at`
- Time to resolution: `disputes.resolved_at - disputes.created_at`

**Backlog**
- Pending disputes count: `disputes.status='pending'`
- Under review count: `disputes.status='under_review'`
- Escalated count: `disputes.status='escalated'`

**Admin Performance**
- Disputes resolved per admin: count of `disputes.resolved_at` grouped by `assigned_admin_id`
- Median time to resolve per admin: median of `resolved_at - created_at` grouped by `assigned_admin_id`

**Dispute Quality Indicators**
- Auto-resolved rate: `disputes.auto_resolved = TRUE` / total disputes
- Dispute types distribution: group by `dispute_type`

---

## Read-Only Query Patterns

**SLA Metrics**
- `SELECT status, created_at, resolved_at FROM disputes WHERE created_at >= :from AND created_at < :to;`

**Backlog**
- `SELECT status, COUNT(*) FROM disputes GROUP BY status;`

**Admin Metrics**
- `SELECT assigned_admin_id, COUNT(*) FROM disputes WHERE status='resolved' GROUP BY assigned_admin_id;`
- `SELECT assigned_admin_id, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY resolved_at - created_at) FROM disputes WHERE status='resolved' GROUP BY assigned_admin_id;`

**Outcome Analysis**
- `SELECT e.release_type, COUNT(*) FROM escrows e JOIN disputes d ON d.task_id = e.task_id WHERE e.release_type='dispute_resolution' GROUP BY e.release_type;`

---

## SLA Reporting Rules & Exclusions

1. If a dispute is never moved to `under_review`, “time to first admin review” is undefined; such disputes must be reported as **unreviewed** or excluded from SLA averages.
2. SLA calculations must rely solely on the first transition to `status='under_review'`. `admin_viewed_dispute` is not guaranteed and must not be used.
3. Release vs refund reporting must use only escrows where `release_type='dispute_resolution'`. Wallet transactions must be filtered to those linked to that escrow.
4. Auto-resolved disputes must be excluded from manual SLA metrics and reported separately.

---

## Explicit Out-of-Scope

- Any schema changes or new tables.
- Any writes or modifications to disputes, tasks, escrows, wallets, or audit logs.
- Any new ledger or escrow transaction types.
- Any changes to Phase 4B or Phase 5 behavior.
- Any background jobs or async processing.
