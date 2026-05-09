## EDUTASK State Transitions

This document defines the allowed state transitions for key entities in EDUTASK.
All states and transitions are grounded in the existing PostgreSQL schema and `BUSINESS_RULES.md`.

---

## 1. Task State Machine

**Database Field**: `tasks.status` (`task_status` enum)

**Possible States**
- `draft`
- `published`
- `application_open`
- `executor_selected`
- `in_progress`
- `under_review`
- `completed`
- `cancelled`
- `disputed`

### 1.1 Allowed Transitions

1. `NULL` → `draft`
   - **Trigger**: Task creation.
   - **Actor**: System (on insert), on behalf of poster (`tasks.poster_id`).

2. `draft` → `published`
   - **Trigger**: Poster publishes the task.
   - **Actor**: Poster (`tasks.poster_id`) or admin.
   - **Preconditions**:
     - Required fields set (`scope`, `deliverables`, `acceptance_criteria`, `deadline`).

3. `published` → `application_open`
   - **Trigger**: Poster opens task for applications (may be same call as publish, depending on design).
   - **Actor**: Poster or admin.
   - **Preconditions**:
     - For paid tasks: escrow locked in `escrows` and corresponding `wallet_transactions` exist.
     - For volunteer tasks: no escrow required.

4. `application_open` → `executor_selected`
   - **Trigger**: Poster selects executor(s).
   - **Actor**: Poster or admin.
   - **Preconditions**:
     - For paid tasks: one executor selected (`tasks.selected_executor_id`).
     - For volunteer tasks: at least one `task_assignments` row created.
   - **Notes**:
     - Some implementations may skip `executor_selected` and go directly to `in_progress` after selection.

5. `published` → `executor_selected`
   - **Trigger**: Poster selects executor(s) without an intermediate `application_open` period (e.g., direct invite).
   - **Actor**: Poster or admin.

6. `executor_selected` → `in_progress`
   - **Trigger**: Work starts (implicit at selection time or explicit start action).
   - **Actor**: System (on selection) or poster/admin.

7. `application_open` → `in_progress`
   - **Trigger**: Selection and work start combined; status advanced directly.
   - **Actor**: Poster or admin.

8. `in_progress` → `under_review`
   - **Trigger**: Executor submits work (paid tasks) or poster moves task to review.
   - **Actor**: Executor (via submission) or poster/admin.
   - **Preconditions**:
     - For paid tasks: a `submissions` row exists.

9. `under_review` → `completed`
   - **Trigger**:
     - Poster approves submission (paid tasks), OR
     - Auto-release triggers completion (system).
   - **Actor**:
     - Poster or admin (manual approval).
     - System (auto-approval/auto-release path).
   - **Preconditions**:
     - Escrow released and `reviews` row exists (paid tasks).

10. `in_progress` → `completed`
    - **Trigger**:
      - Poster marks volunteer task completed without a formal `under_review` state.
    - **Actor**: Poster or admin.

11. `draft` → `cancelled`
    - **Trigger**: Poster cancels a task before publishing.
    - **Actor**: Poster or admin.

12. `published` → `cancelled`
    - **Trigger**: Poster cancels before applications or work have meaningfully started.
    - **Actor**: Poster or admin.

13. `application_open` → `cancelled`
    - **Trigger**: Poster cancels while applications are open.
    - **Actor**: Poster or admin.

14. `executor_selected` → `cancelled`
    - **Trigger**: Poster or admin cancels before work is completed.
    - **Actor**: Poster or admin.
    - **Preconditions**:
      - For paid tasks: escrow refund rules must be executed.

15. `in_progress` → `cancelled`
    - **Trigger**: Poster or admin cancels in-progress task.
    - **Actor**: Poster or admin.
    - **Preconditions**:
      - For paid tasks: may require dispute or refund; business policy must decide; escrow handling required.

16. `under_review` → `disputed`
    - **Trigger**: Poster or executor files dispute.
    - **Actor**: Poster or executor (students).
    - **Preconditions**:
      - Dispute filing sets `tasks.status='disputed'`.

17. `completed` → `disputed`
    - **Trigger**: Late dispute filing allowed by policy (if within allowed time window).
    - **Actor**: Poster or executor.
    - **Notes**:
      - This is allowed only within 48 hours of `tasks.completed_at`; otherwise this transition is invalid.
      - Dispute filing sets `tasks.status='disputed'`.

18. `disputed` → `completed`
    - **Trigger**: Dispute resolved in a way that results in task completion.
    - **Actor**: Admin or system (auto-resolve).

19. `disputed` → `cancelled`
    - **Trigger**: Dispute resolution determines task should be cancelled.
    - **Actor**: Admin.

### 1.2 Invalid Transitions (Examples)

The following transitions MUST be treated as invalid and rejected by the service layer:
- Any transition that skips mandatory intermediate states when required by business rules, such as:
  - `draft` → `completed` (no valid path).
  - `draft` → `disputed`.
  - `cancelled` → any non-terminal state.
  - `completed` → any non-terminal state (unless clearly allowed via dispute policy).
- Transitions that conflict with escrow rules, e.g.:
  - Moving to `completed` for a paid task without handling escrow release.

---

## 2. Application State Machine

**Database Field**: `task_applications.status` (`application_status` enum)

**Possible States**
- `pending`
- `accepted`
- `rejected`
- `withdrawn`

### 2.1 Allowed Transitions

1. `NULL` → `pending`
   - **Trigger**: User submits an application for a task.
   - **Actor**: Student applicant.

2. `pending` → `accepted`
   - **Trigger**: Poster selects this application for execution.
   - **Actor**: Poster or admin.

3. `pending` → `rejected`
   - **Trigger**: Poster rejects applicant or auto-reject logic runs.
   - **Actor**: Poster, admin, or system (auto-reject when capacity reached or task closed).

4. `pending` → `withdrawn`
   - **Trigger**: Applicant withdraws their application before selection.
   - **Actor**: Student applicant.

5. `accepted` → `withdrawn`
   - **Trigger**: Applicant withdraws after acceptance (only if policy allows).
   - **Actor**: Student applicant.
   - **Note**: May require additional task-side logic (e.g., re-opening applications).

### 2.2 Invalid Transitions

Examples of invalid transitions:
- `rejected` or `withdrawn` → `pending` (no reactivation; user must apply again with a new row if policy allows).
- `accepted` → `rejected` (once accepted, subsequent rejection is modelled as task-level cancellation or separate policy, not status flip).
- Any status changes on applications after task is `completed` or `cancelled` (other than read-only changes for audit, which should not alter `status`).

---

## 3. Escrow State Machine

Escrow state is represented across:
- `escrows` table:
  - `task_id`
  - `amount`
  - `locked_at`
  - `released_at`
  - `release_type` (text: `'approval'`, `'auto_release'`, `'dispute_resolution'`, `'refund'` by convention)
- `wallet_transactions` associated via:
  - `transaction_type` enum (e.g., `escrow_lock`, `escrow_release_approval`, `escrow_release_auto`, `escrow_refund`)
  - `related_task_id`
  - `related_escrow_id`

### 3.1 Conceptual Escrow States

- `not_created` — No `escrows` row for the task.
- `locked` — `escrows` row exists, funds locked, `released_at IS NULL`.
- `released` — `released_at NOT NULL`, `release_type` in (`'approval'`, `'auto_release'`, `'dispute_resolution'`), funds moved out of escrow.
- `refunded` — `released_at NOT NULL`, `release_type='refund'`, funds returned to poster.

### 3.2 Allowed Transitions

1. `not_created` → `locked`
   - **Trigger**: Poster funds a paid task and escrow is created.
   - **Actor**: Student poster (via wallet operation) or admin.
   - **Implementation**:
     - Insert `escrows` row.
     - Insert `wallet_transactions` with `transaction_type='escrow_lock'`.

2. `locked` → `released` (approval)
   - **Trigger**: Poster approves submission.
   - **Actor**: Poster or admin.
   - **Implementation**:
     - Insert `wallet_transactions` with `transaction_type='escrow_release_approval'`.
     - Update `escrows.released_at` and `release_type='approval'`.

3. `locked` → `released` (auto-release)
   - **Trigger**: Review window expires without action; system auto-releases.
   - **Actor**: System.
   - **Implementation**:
     - Insert `wallet_transactions` with `transaction_type='escrow_release_auto'`.
     - Update `escrows.released_at` and `release_type='auto_release'`.

4. `locked` → `released` (dispute resolution)
   - **Trigger**: Dispute resolved by admin with fund allocation.
   - **Actor**: Admin (or system applying admin decision).
   - **Implementation**:
     - Insert appropriate `wallet_transactions` rows to allocate escrow according to `disputes.admin_decision_fund_allocation`.
     - Update `escrows.released_at` and `release_type='dispute_resolution'`.

5. `locked` → `refunded`
   - **Trigger**: Task is cancelled and business rules require full refund to poster.
   - **Actor**: Poster or admin.
   - **Implementation**:
     - Insert `wallet_transactions` with `transaction_type='escrow_refund'`.
     - Update `escrows.released_at` and `release_type='refund'`.

### 3.3 Invalid Transitions

- Any attempt to:
  - Change `amount` after escrow creation (must be immutable).
  - Move from `released` or `refunded` back to `locked` or `not_created`.
  - Release escrow multiple times (only one effective release per `escrows` row).

---

## 4. Dispute State Machine

**Database Field**: `disputes.status` (`dispute_status` enum)

**Possible States**
- `pending`
- `auto_resolved`
- `under_review`
- `resolved`
- `escalated`

### 4.1 Allowed Transitions

1. `NULL` → `pending`
   - **Trigger**: Dispute created for a task.
   - **Actor**: Poster or executor/assignee.

2. `pending` → `auto_resolved`
   - **Trigger**: System automatically resolves based on clear rules (e.g., confirmed missing submission or late delivery).
   - **Actor**: System.
   - **Implementation**:
     - Set `auto_resolved=TRUE`, `auto_resolution_reason`.
     - Set `status='auto_resolved'`.
     - Apply corresponding wallet/escrow actions if necessary.

3. `pending` → `under_review`
   - **Trigger**: Dispute requires admin review (no clear auto-resolution).
   - **Actor**: System or admin (assignment step).

4. `under_review` → `resolved`
   - **Trigger**: Admin issues final decision and it is applied.
   - **Actor**: Admin.
   - **Implementation**:
     - Populate `admin_decision`, `admin_decision_fund_allocation`, `resolved_at`.
     - Apply wallet/escrow movements as per decision.

5. `under_review` → `escalated`
   - **Trigger**: Dispute is escalated internally (e.g., to higher-level admin).
   - **Actor**: Admin.

6. `escalated` → `resolved`
   - **Trigger**: Higher-level admin issues decision and it is applied.
   - **Actor**: Admin.

### 4.2 Post-Resolution

1. `auto_resolved` → (terminal)
   - No further state changes; dispute is closed.

2. `resolved` → (terminal)
   - No further status changes allowed under normal operation.

### 4.3 Invalid Transitions

- `auto_resolved` → any other status (disputes are not reopened in normal operation).
- `resolved` → any other status.
- `escalated` → `pending` or `auto_resolved`.

---

## 5. Wallet Transaction Lifecycle

**Database Field**: `wallet_transactions.status` (`transaction_status` enum)

**Possible States**
- `pending`
- `completed`
- `failed`
- `cancelled`

Note: `wallet_transactions.transaction_type` determines the business meaning (e.g., `deposit`, `escrow_lock`, `withdrawal_request`, etc.). Most transaction types are created directly in `completed` state except for flows like withdrawals.

### 5.1 Allowed Status Transitions

1. `NULL` → `completed`
   - **Trigger**: One-step operations that immediately complete, such as:
     - `deposit`
     - `escrow_lock`
     - `escrow_release_approval`
     - `escrow_release_auto`
     - `escrow_refund`
   - **Actor**: Student, admin, or system depending on transaction type.

2. `NULL` → `pending`
   - **Trigger**: Operations that require later processing, such as:
     - `withdrawal_request`.
   - **Actor**: Student (requesting withdrawal) or admin (creating delayed transaction).

3. `pending` → `completed`
   - **Trigger**: Operation successfully processed (e.g., withdrawal processed by admin).
   - **Actor**: Admin or system.

4. `pending` → `failed`
   - **Trigger**: Operation cannot be completed (e.g., external payment failure).
   - **Actor**: Admin or system.

5. `pending` → `cancelled`
   - **Trigger**: Operation cancelled before processing is attempted/completed.
   - **Actor**: Admin or, if policy allows, the user who requested it.

### 5.2 System-Only Transitions

- Only the system or admin should:
  - Move `pending` withdrawal requests to `completed` or `failed`.
  - Create escrow-related transactions (`escrow_lock`, `escrow_release_*`, `escrow_refund`) and typically set them directly to `completed`.

### 5.3 Invalid Transitions

- `completed` → any other status (immutable once completed).
- `failed` → any other status.
- `cancelled` → any other status.
- Status changes that conflict with `valid_balance_transition` and resulting balances in `wallets`.

---

All transitions described above must be enforced at the service layer, using the database as the single source of truth and respecting immutability of `wallet_transactions`, `chat_messages`, and `audit_logs`, and the concurrency safeguards defined in the schema.


