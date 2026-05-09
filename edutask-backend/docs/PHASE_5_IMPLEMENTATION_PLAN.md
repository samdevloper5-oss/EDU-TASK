## Phase 5 Implementation Plan — Disputes & Admin Resolution

This plan translates the approved Phase 5 design into a safe, ordered implementation roadmap.
No code is included. No schema changes are allowed.

---

## Ordered Sub-Phases

1. Dispute Creation (No Escrow)
2. Auto-Resolution (No Admin)
3. Admin Review (Read-Only)
4. Admin Resolution (Escrow-Affecting)

---

## 1) Dispute Creation (No Escrow)

### Services Involved
- `dispute.service.js` (primary)
- `task.service.js` (status change to `disputed`)
- `audit.service.js` (logging)

### Tables Touched
- `disputes` (INSERT)
- `tasks` (UPDATE `status='disputed'`)
- `audit_logs` (INSERT)

### Escrow/Wallet Mutation
- **Not allowed** in this sub-phase.

### Required Task and Dispute States
- Allowed task states: `under_review`, or `completed` within 48 hours.
- Dispute state created as `pending`.
- Task status set to `disputed`.

### Transaction Ownership Rules
- `dispute.service.js` owns a SERIALIZABLE transaction.
- Atomic operations:
  - Insert `disputes` row
  - Update `tasks.status` to `disputed`
  - Insert audit log

### Hard Stop Checkpoints
- Dispute creation rejects if:
  - Filing user is not a valid party
  - Task not in allowed states
  - 48-hour window exceeded
- `tasks.status` must be `disputed` when `disputes` row is created.
- Audit log entry must exist for dispute creation.

### Must NOT Implement Yet
- No escrow release/refund.
- No admin assignment or resolution.
- No auto-resolution logic.

### Failure & Rollback Expectations
- If any insert/update fails, the transaction rolls back and:
  - No dispute row exists
  - Task status remains unchanged
  - No audit log is written

---

## 2) Auto-Resolution (No Admin)

### Services Involved
- `dispute.service.js` (primary)
- `audit.service.js`

### Tables Touched
- `disputes` (UPDATE `status`, `auto_resolved`, `auto_resolution_reason`)
- `audit_logs` (INSERT)

### Escrow/Wallet Mutation
- **Not allowed** in this sub-phase.

### Required Task and Dispute States
- Dispute must be `pending`.
- Task must already be `disputed`.

### Transaction Ownership Rules
- `dispute.service.js` owns a SERIALIZABLE transaction.
- Atomic operations:
  - Update `disputes` to `auto_resolved`
  - Insert audit log

### Hard Stop Checkpoints
- Auto-resolution only allowed when evidence is unambiguous.
- No escrow or wallet mutations occur in this sub-phase.
- Dispute becomes terminal (`auto_resolved`).

### Must NOT Implement Yet
- No admin review/assignment.
- No escrow release/refund.
- No task status change out of `disputed`.

### Failure & Rollback Expectations
- If update fails, dispute remains `pending` and no audit log is written.

---

## 3) Admin Review (Read-Only)

### Services Involved
- `dispute.service.js` (read-only operations)

### Tables Touched
- `disputes` (SELECT)
- `tasks`, `submissions`, `chat_messages`, `wallet_transactions`, `escrows`, `reviews`, `audit_logs` (SELECT only)

### Escrow/Wallet Mutation
- **Not allowed** in this sub-phase.

### Required Task and Dispute States
- Dispute must be `pending` or `under_review`.
- Task must be `disputed`.

### Transaction Ownership Rules
- Read-only access; SERIALIZABLE transactions not required.
- No atomic write requirements.

### Hard Stop Checkpoints
- Admin review must not mutate any table.
- Admin assignment (if done) must respect `assigned_admin_id` admin constraint.

### Must NOT Implement Yet
- No dispute resolution.
- No escrow release/refund.
- No task state changes.

### Failure & Rollback Expectations
- Read-only failures do not alter state.

---

## 4) Admin Resolution (Escrow-Affecting)

### Services Involved
- `dispute.service.js` (primary)
- `escrow.service.js` (invoked within same transaction)
- `wallet.service.js` ledger helpers (invoked within same transaction)
- `audit.service.js`

### Tables Touched
- `disputes` (UPDATE status, admin_decision, fund allocation, resolved_at)
- `escrows` (UPDATE released_at, release_type)
- `wallet_transactions` (INSERT)
- `wallets` (UPDATE balances)
- `tasks` (UPDATE status out of `disputed`)
- `audit_logs` (INSERT)

### Escrow/Wallet Mutation
- **Allowed and required** when dispute resolution affects funds.
- Must use existing ledger helpers; no direct balance edits.

### Required Task and Dispute States
- Dispute must be `under_review` or `escalated`.
- Task must be `disputed`.

### Transaction Ownership Rules
- `dispute.service.js` owns a SERIALIZABLE transaction.
- Atomic operations:
  - Update `disputes` to `resolved`
  - Apply escrow release/refund
  - Apply all wallet ledger changes
  - Update `tasks.status` out of `disputed`
  - Insert audit log(s)

### Hard Stop Checkpoints
- Escrow must be `released_at IS NULL` before any release/refund.
- Wallet balances must remain non-negative.
- Dispute must not be re-processed once resolved.
- Task must exit `disputed` only when escrow and ledger changes succeed.

### Must NOT Implement Yet
- No new transaction types.
- No schema changes.
- No partial split unless policy explicitly permits and is defined in dispute decision payload.

### Failure & Rollback Expectations
- If any step fails, rollback ensures:
  - No dispute resolution is recorded
  - No escrow is released/refunded
  - No wallet balances are changed
  - Task remains `disputed`
  - No audit log is written for resolution

---

## Explicit Out-of-Scope (Phase 5)

1. Schema changes or new tables.
2. New escrow types or transaction types.
3. Scheduled jobs for expiration.
4. External payment integrations.
5. Any modification to Phase 4B ledger behavior.
