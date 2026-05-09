## Phase 7 Implementation Plan — System Automation & Policy Enforcement (Design-Only)

This document defines Phase 7 automation at a design level only.  
No code, schema changes, or new tables are introduced.  
All behavior must remain compatible with Phase 4B escrow/wallet invariants and Phase 5 disputes.

---

## 1. Job Boundaries (Separated by Responsibility)

### 1.1 Task Expiration & Auto-Refund
**Purpose**  
Prevent paid tasks from stalling indefinitely when no submission or review occurs.

**Applies To**  
Paid tasks only.

**Trigger Conditions**  
- `in_progress` with no submission after `deadline`  
- `under_review` with no action after `review_window_hours`

**Outcome**  
- Task -> `cancelled`  
- Escrow -> refunded to poster  
- Audit log -> `task_expired_auto_refund`

**Notes**  
- Only applies when escrow is locked and unreleased.

---

### 1.2 Dispute SLA Escalation
**Purpose**  
Prevent disputes from remaining idle beyond SLA limits.

**Applies To**  
Disputes in `pending` or `under_review`.

**Trigger Conditions**  
- SLA threshold exceeded (configured outside the DB)

**Outcome**  
- `pending` -> `escalated`  
- Assign senior admin  
- Audit log -> `dispute_escalated`

**Notes**  
- No escrow or wallet movement.  
- Task remains `disputed`.

---

### 1.3 Optional Admin Load Balancing
**Purpose**  
Distribute disputes evenly across admins.

**Applies To**  
Unassigned disputes or escalations.

**Outcome**  
- Update `assigned_admin_id` based on active load  
- Audit log -> `admin_assigned` (optional)

**Notes**  
- No dispute status change required.  
- Read-only metrics can inform assignment decisions.

---

### 1.4 Notification Triggers (Non-Critical)
**Purpose**  
Provide operational visibility without blocking core transactions.

**Events**  
- Task expired  
- Dispute escalated  
- Admin assigned

**Behavior**  
- Fire-and-forget  
- Failure must not block primary transactions  
- Log only if successful

---

## 2. Idempotency Rules

### 2.1 Global Guarantees
- All jobs must be safe to re-run.
- Jobs must check current state before acting.
- Escrow must never be released/refunded more than once.

### 2.2 Job Preconditions & Guards

**Task Expiration & Auto-Refund**  
- Task must still be `in_progress` or `under_review`.  
- Escrow must exist and be locked (`released_at IS NULL`).  
- If task already cancelled or escrow already released/refunded, no-op.

**Dispute SLA Escalation**  
- Dispute must be `pending` or `under_review`.  
- If already `escalated`, no-op.  
- If resolved or auto_resolved, no-op.

**Admin Load Balancing**  
- Only assign if `assigned_admin_id` is NULL or reassignment is explicitly allowed.  
- If already assigned and not escalated, no-op.

**Notifications**  
- Trigger only once per event (dedupe in application layer).  
- If already delivered, no-op.

---

## 3. Transaction & Failure Handling

### 3.1 SERIALIZABLE Transactions Required
- Task expiration & auto-refund  
- Dispute escalation (if it writes dispute state or admin assignment)  
- Admin assignment updates

### 3.2 Atomic Rollback Requirements
For each job, all related writes must succeed or none should persist:

**Task Expiration & Auto-Refund**  
- Task status change  
- Escrow refund  
- Wallet ledger mutations  
- Audit log

**Dispute Escalation**  
- Dispute status update  
- Admin assignment  
- Audit log

**Admin Load Balancing**  
- Assignment update  
- Audit log (if written)

### 3.3 Failure Handling Policy
- On any error, rollback fully.
- Retriable errors should be re-attempted by the scheduler.
- Non-retriable errors should log and exit without side effects.

---

## 4. Audit & Observability

### 4.1 Required Audit Events
- `task_expired_auto_refund`  
- `dispute_escalated`

### 4.2 Optional Audit Events
- `admin_assigned` (if assignment logic runs)

### 4.3 Logging vs Metrics
- Audit logs capture authoritative state changes.  
- Metrics can be computed from audit logs and base tables without writes.

---

## 5. Explicit Non-Goals

Phase 7 will NOT:
- Introduce new ledger or escrow transaction types.
- Modify Phase 4B or Phase 5 behavior.
- Perform manual money handling or external payouts.
- Implement partial escrow splits or discretionary overrides.
- Add schema changes, new tables, or background jobs beyond the defined automation.
