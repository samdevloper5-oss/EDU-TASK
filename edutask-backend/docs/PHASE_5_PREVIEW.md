## Phase 5 — Disputes & Admin Resolution (Design-Only Specification)

This document defines the Phase 5 dispute system requirements. It is design-only and does not include code.
It must remain aligned with:
- `BUSINESS_RULES.md`
- `STATE_TRANSITIONS.md`
- Phase 4B escrow + wallet ledger behavior (schema-derived escrow state, ledger-only balance changes)

---

## 1. Dispute Lifecycle

### 1.1 Who Can File a Dispute

1. Task poster (`tasks.poster_id`).
2. Paid task executor (`tasks.selected_executor_id`).
3. Volunteer assignee (`task_assignments.executor_id`).
4. System auto-resolution may create disputes only when rules allow (e.g., missing submission), but must still populate `disputes.filed_by_user_id` with a valid user party.

### 1.2 Allowed Task States for Filing

1. `tasks.status='under_review'`, OR
2. `tasks.status='completed'` **within 48 hours** of `tasks.completed_at`.

On filing, `tasks.status` MUST be set to `disputed`.

### 1.3 Dispute State Machine (Schema-Aligned)

Dispute states use `disputes.status`:
- `pending`
- `auto_resolved`
- `under_review`
- `resolved`
- `escalated`

Allowed transitions (per `STATE_TRANSITIONS.md`):
1. `pending` -> `auto_resolved`
2. `pending` -> `under_review`
3. `under_review` -> `resolved`
4. `under_review` -> `escalated`
5. `escalated` -> `resolved`

Terminal states: `auto_resolved`, `resolved`.

### 1.4 Time Windows and Enforcement

1. Filing window is enforced at dispute creation:
   - If `completed_at` is older than 48 hours, reject the dispute.
2. Dispute processing should not proceed if `disputes.status` is terminal.
3. Auto-resolution rules (e.g., confirmed missing submission) may skip manual review only when evidence is unambiguous.

---

## 2. Escrow Outcomes per Dispute Resolution

Escrow actions are derived from Phase 4B rules and `escrows.release_type`:

### 2.1 Full Release to Executor
- Allowed when dispute outcome favors executor.
- Set `escrows.release_type='dispute_resolution'`, set `released_at`, and move funds to executor via ledger.

### 2.2 Full Refund to Poster
- Allowed when dispute outcome favors poster.
- Set `escrows.release_type='dispute_resolution'`, set `released_at`, and return funds to poster via ledger.

### 2.3 Partial Split
- **Allowed only if policy explicitly permits** in Phase 5 (uses `disputes.admin_decision_fund_allocation` JSONB).
- Must be executed as multiple ledger transactions within a single SERIALIZABLE transaction.
- Each ledger operation must respect non-negative balance invariants.

### 2.4 When Escrow Must NOT Be Touched
- If the dispute is `auto_resolved` with no financial implication.
- If the task is a volunteer task (no escrow exists).
- If escrow has already been released/refunded (idempotency guard).

---

## 3. Admin Powers and Limits

### 3.1 Admin Powers
1. Assign or update `disputes.assigned_admin_id` (must be `role='admin'`).
2. Transition disputes to `under_review`, `resolved`, or `escalated`.
3. Write `admin_decision` and (optionally) `admin_decision_fund_allocation`.
4. Trigger escrow release/refund when dispute is resolved.
5. Update `tasks.status` from `disputed` to `completed` or `cancelled` based on decision.

### 3.2 Admin Limits
1. Admins must not alter immutable ledgers (`wallet_transactions`, `audit_logs`).
2. Admins must not bypass escrow idempotency checks.
3. Admins must not resolve disputes without writing `admin_decision`.

### 3.3 Atomicity Requirements
All of the following must be atomic in a single SERIALIZABLE transaction:
- `disputes.status` updates
- escrow `released_at` / `release_type`
- all ledger mutations (`wallet_transactions` + `wallets` updates)
- `tasks.status` transition out of `disputed`

---

## 4. Transaction Ownership Rules

1. `dispute.service.js` owns SERIALIZABLE transactions for:
   - dispute creation
   - auto-resolution
   - admin resolution
2. Escrow and wallet ledger helpers must be called **within** the same transaction owned by `dispute.service.js`.
3. Any async/manual admin actions must still execute the resolution in a single SERIALIZABLE transaction at commit time.

---

## 5. Phase 5 Safety Checklist

1. No double release/refund:
   - Escrow must be `released_at IS NULL` before any release/refund.
2. No negative balances:
   - Pre-checks + DB constraints (`wallets.balance`, `wallets.escrow_balance`) must hold.
3. No task state corruption:
   - `tasks.status` must move to `disputed` on filing and exit `disputed` only on resolution.
4. Idempotency:
   - Re-processing a resolved dispute must be rejected.
   - Re-processing a released/refunded escrow must be rejected.
5. Audit logging:
   - Dispute creation, auto-resolution, and admin resolution must be logged.
   - Escrow actions must be logged (`escrow_released`, `escrow_refunded`).

---

## 6. Out of Scope (Phase 5)

1. Schema changes or new tables.
2. New escrow types or transaction types.
3. Scheduled jobs for expiration (handled in a later phase).
4. External payment integrations.
5. Any modifications to Phase 4B ledger behavior.
