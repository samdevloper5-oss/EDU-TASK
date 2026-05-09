## EDUTASK API Contracts

All API contracts in this document:
- Are aligned with `database/schema.sql` and `BUSINESS_RULES.md`.
- Use REST-style semantics and are backend-agnostic.
- Assume authentication and authorization are enforced in the service layer.
- Treat `wallet_transactions`, `escrows`, `chat_messages`, and `audit_logs` as immutable once written.

For each endpoint:
- **Auth** refers to whether the user must be authenticated.
- **Role** refers to allowed values of `users.role` (`student`, `admin`).
- **State Preconditions** and **Failure Cases** MUST be enforced in service logic using the database as source of truth.

---

## 1. Authentication APIs

### 1.1 Register User

- **Endpoint**: `POST /auth/register`
- **Auth required**: No
- **Role allowed**: N/A (unauthenticated)

**Request Fields**
- `email` (string, required) — must be unique.
- `phone` (string, required) — must be unique.
- `full_name` (string, required).
- `institution` (string, required).
- `student_id` (string, required).
- `department` (string, optional).
- `bio` (string, optional).
- `profile_image_url` (string, optional).
- `verification_document_url` (string, optional).
- `credential` (string or provider token, required but NOT stored in this schema; handled by auth subsystem).

**Validation Rules**
- `email` must be a valid email format.
- `phone` must be a valid local/international phone format.
- `institution` and `student_id` must not be empty.
- Enforce uniqueness:
  - `users.email` unique.
  - `users.phone` unique.

**State Preconditions**
- None; user is unauthenticated and not yet present in `users`.

**Database Tables Touched**
- `users` (INSERT).
- `profiles` (INSERT).
- `wallets` (INSERT — wallet auto-creation).
- `audit_logs` (INSERT — registration and wallet creation).

**Side Effects**
- Create `users` row with:
  - `student_id` from request plus `role='student'`, `trust_tier='basic'`, `is_active=TRUE`, `is_suspended=FALSE`, `email_verified=FALSE`, `phone_verified=FALSE`.
- Create `profiles` row linked via `user_id`.
- Create `wallets` row for the new user with zero balances.
- Write `audit_logs` entries:
  - `action='user_registered'`.
  - `action='wallet_created'`.

**Failure Scenarios**
- `409 Conflict`:
  - Email already exists in `users.email`.
  - Phone already exists in `users.phone`.
  - `(institution, student_id)` already exists in `profiles`.
- `400 Bad Request`:
  - Missing required fields or invalid formats.
- `500 Internal Server Error`:
  - Failure creating any of `users`, `profiles`, or `wallets` in a single transaction.

---

### 1.2 Login User

- **Endpoint**: `POST /auth/login`
- **Auth required**: No
- **Role allowed**: N/A

**Request Fields**
- `identifier` (string, required) — email or phone.
- `credential` (string or provider token, required).

**Validation Rules**
- `identifier` must be non-empty.
- Resolve `identifier` to `users` row by:
  - Email match OR
  - Phone match.
- Verify credential via external auth subsystem (not in schema).

**State Preconditions**
- `users.is_active = TRUE`.
- If `users.is_suspended = TRUE`, login MAY be allowed for read-only access but no write actions (enforced in other endpoints).

**Database Tables Touched**
- `users` (UPDATE `last_login_at`).
- `audit_logs` (INSERT).

**Side Effects**
- On success:
  - Update `users.last_login_at`.
  - Insert `audit_logs` with `action='login_success'`.
- Issue access/refresh tokens at application level (not stored in DB).

**Failure Scenarios**
- `401 Unauthorized`:
  - Identifier does not map to a user.
  - Credential invalid.
- `403 Forbidden`:
  - `users.is_active = FALSE` (account deactivated).
- `500 Internal Server Error`:
  - Error updating `last_login_at` or writing `audit_logs`.

---

### 1.3 Logout User

- **Endpoint**: `POST /auth/logout`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- None (token/cookie-based).

**Validation Rules**
- Auth token must be valid at time of request.

**State Preconditions**
- Authenticated user exists in `users` and `is_active = TRUE`.

**Database Tables Touched**
- `audit_logs` (INSERT).

**Side Effects**
- Invalidate tokens at application level.
- Insert `audit_logs` with `action='logout'`.

**Failure Scenarios**
- `401 Unauthorized`:
  - Missing or invalid auth token.

---

### 1.4 Verify Email

- **Endpoint**: `POST /auth/verify-email`
- **Auth required**: Yes (or via secure token mapping to user)
- **Role allowed**: `student`, `admin`

**Request Fields**
- `verification_token` (string, required) — application-specific, not stored in DB.

**Validation Rules**
- Token must validate to a specific `users.id` via application logic.

**State Preconditions**
- `users.email_verified = FALSE` for the target user.

**Database Tables Touched**
- `users` (UPDATE `email_verified`).
- `audit_logs` (INSERT).

**Side Effects**
- Set `users.email_verified = TRUE`.
- Insert `audit_logs` with `action='email_verified'`.

**Failure Scenarios**
- `400 Bad Request`:
  - Invalid or expired verification token.
- `409 Conflict`:
  - Email already verified.

---

### 1.5 Verify Phone

- **Endpoint**: `POST /auth/verify-phone`
- **Auth required**: Yes (or via secure OTP flow)
- **Role allowed**: `student`, `admin`

**Request Fields**
- `otp_code` (string, required) — validated outside DB.

**Validation Rules**
- OTP must be valid for the authenticated user’s `phone`.

**State Preconditions**
- `users.phone_verified = FALSE`.

**Database Tables Touched**
- `users` (UPDATE `phone_verified`).
- `audit_logs` (INSERT).

**Side Effects**
- Set `users.phone_verified = TRUE`.
- Insert `audit_logs` with `action='phone_verified'`.

**Failure Scenarios**
- `400 Bad Request`:
  - Invalid/expired OTP.
- `409 Conflict`:
  - Phone already verified.

---

## 2. Profile APIs

### 2.1 Get Own Profile

- **Endpoint**: `GET /profile/me`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- None.

**Validation Rules**
- Auth must map to a valid `users.id`.

**State Preconditions**
- User exists and `is_active = TRUE`.

**Database Tables Touched**
- `users` (SELECT).
- `profiles` (SELECT).

**Side Effects**
- None (read-only).

**Failure Scenarios**
- `401 Unauthorized`:
  - Invalid/missing auth token.
- `404 Not Found`:
  - No `profiles` row for this `user_id` (should not happen if registration flow is correct).

---

### 2.2 Update Profile

- **Endpoint**: `PUT /profile/me`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- Updatable fields:
  - `full_name` (string, optional).
  - `department` (string, optional).
  - `bio` (string, optional).
  - `profile_image_url` (string, optional).
  - `verification_document_url` (string, optional).
- Fields that CANNOT be changed via this API:
  - `institution` (profile) and `student_id` (user identity) require admin or separate process.

**Validation Rules**
- Validate field lengths and formats (e.g., URLs).

**State Preconditions**
- User exists, `is_active = TRUE`, `is_suspended = FALSE`.

**Database Tables Touched**
- `profiles` (UPDATE).
- `audit_logs` (INSERT).

**Side Effects**
- Update mutable profile fields.
- Insert `audit_logs` with `action='profile_updated'`.

**Failure Scenarios**
- `400 Bad Request`:
  - Attempt to modify `institution` or `student_id` through this endpoint.
- `403 Forbidden`:
  - `is_suspended = TRUE`.
- `404 Not Found`:
  - No profile found for current user.

---

### 2.3 View Public Profile

- **Endpoint**: `GET /profiles/{userId}`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `userId` (path, UUID, required).

**Validation Rules**
- `userId` must be valid UUID.

**State Preconditions**
- Target user exists and `is_active = TRUE`.

**Database Tables Touched**
- `profiles` (SELECT).
- `users` (SELECT minimal: `role`, `trust_tier`, `is_active`).

**Side Effects**
- None (read-only).

**Failure Scenarios**
- `404 Not Found`:
  - User or profile not found, or user inactive.

---

## 3. Task APIs

### 3.1 Create Task (Paid / Volunteer)

- **Endpoint**: `POST /tasks`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `title` (string, required).
- `description` (string, required).
- `scope` (string, required).
- `deliverables` (string, required).
- `acceptance_criteria` (string, required).
- `task_type` (`'paid' | 'volunteer'`, required).
- `budget` (decimal, required if `task_type='paid'`, otherwise omitted/null).
- `deadline` (timestamp, required).
- `review_window_hours` (integer, optional; default from DB).
- `max_revisions` (integer, optional; default from DB).
- `required_members` (integer, required if `task_type='volunteer'`).
- `application_deadline` (timestamp, optional).

**Validation Rules**
- Enforce `valid_budget` and `valid_required_members` constraints at service level before DB insert.
- `deadline` and `application_deadline` must be in the future.

**State Preconditions**
- Authenticated user `is_active = TRUE`, `is_suspended = FALSE`.

**Database Tables Touched**
- `tasks` (INSERT).
- `audit_logs` (INSERT).

**Side Effects**
- Create new task with `poster_id = current user`, `status='draft'`.
- Insert `audit_logs` with `action='task_created'`.

**Failure Scenarios**
- `400 Bad Request`:
  - Invalid combinations for `task_type`, `budget`, `required_members`.
- `403 Forbidden`:
  - User suspended or inactive.

---

### 3.2 Publish Task

- **Endpoint**: `POST /tasks/{taskId}/publish`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `taskId` (path, UUID, required).

**Validation Rules**
- Task must belong to current user (`tasks.poster_id = current user.id`).

**State Preconditions**
- `tasks.status = 'draft'`.
- Required fields (scope, deliverables, acceptance_criteria, deadline) are non-null.
- For paid tasks: escrow either locked before setting `status='application_open'` (see next API) or handled in a subsequent call.

**Database Tables Touched**
- `tasks` (UPDATE).
- `audit_logs` (INSERT).

**Side Effects**
- Update `tasks.status` to `'published'`.
- Insert `audit_logs` with `action='task_published'`.

**Failure Scenarios**
- `403 Forbidden`:
  - Current user is not `tasks.poster_id`.
- `409 Conflict`:
  - Task is not in `draft` status.

---

### 3.3 View Task List

- **Endpoint**: `GET /tasks`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields (query)**
- Filters (optional):
  - `task_type` (`paid` / `volunteer`).
  - `status` (e.g., `published`, `application_open`).
  - Pagination parameters.

**Validation Rules**
- Only expose tasks with `status IN ('published','application_open','in_progress','under_review','completed')` for general listings.

**State Preconditions**
- None beyond auth.

**Database Tables Touched**
- `tasks` (SELECT).

**Side Effects**
- None.

**Failure Scenarios**
- `400 Bad Request`:
  - Invalid filter values.

---

### 3.4 View Task Details

- **Endpoint**: `GET /tasks/{taskId}`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `taskId` (path, UUID, required).

**Validation Rules**
- Check that `taskId` exists.

**State Preconditions**
- For normal students:
  - Can view tasks that are not soft-restricted by business policy (e.g., still allow viewing `draft` only by owner; enforced in service).

**Database Tables Touched**
- `tasks` (SELECT).
- Optionally `task_applications` (SELECT current user’s application).
- Optionally `task_assignments` for volunteer tasks.

**Side Effects**
- None.

**Failure Scenarios**
- `404 Not Found`:
  - Task does not exist or not visible to this user.

---

### 3.5 Apply to Task

- **Endpoint**: `POST /tasks/{taskId}/apply`
- **Auth required**: Yes
- **Role allowed**: `student`

**Request Fields**
- `taskId` (path, UUID, required).
- `cover_letter` (string, optional).

**Validation Rules**
- User cannot be the poster (`tasks.poster_id != current user.id`).
- Enforce unique application per `(task_id, applicant_id)` according to `unique_application`.

**State Preconditions**
- `tasks.status = 'application_open'`.
- Task not past `application_deadline`, if set.
- User `is_active = TRUE`, `is_suspended = FALSE`.

**Database Tables Touched**
- `task_applications` (INSERT).
- `audit_logs` (INSERT).
- `notifications` (INSERT to notify poster).

**Side Effects**
- Create `task_applications` row with `status='pending'`.
- Insert `audit_logs` with `action='task_applied'`.

**Failure Scenarios**
- `403 Forbidden`:
  - User is task poster or is suspended.
- `409 Conflict`:
  - Application already exists (`unique_application` violation).
- `409 Conflict`:
  - Task not in `application_open` or after `application_deadline`.

---

### 3.6 View Applications (Poster Only)

- **Endpoint**: `GET /tasks/{taskId}/applications`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `taskId` (path, UUID, required).

**Validation Rules**
- Current user must be `tasks.poster_id` or `users.role='admin'`.

**State Preconditions**
- Task exists.

**Database Tables Touched**
- `tasks` (SELECT).
- `task_applications` (SELECT).

**Side Effects**
- None.

**Failure Scenarios**
- `403 Forbidden`:
  - Non-owner, non-admin.
- `404 Not Found`:
  - Task or applications not found.

---

### 3.7 Select Executor(s)

- **Endpoint (Paid)**: `POST /tasks/{taskId}/select-executor`
- **Endpoint (Volunteer)**: `POST /tasks/{taskId}/select-volunteers`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `taskId` (path, UUID, required).
- For paid:
  - `executor_id` (UUID, required) — must match an applicant.
- For volunteer:
  - `executor_ids` (array of UUIDs, required) — must each match applicants.

**Validation Rules**
- Current user must own the task (`tasks.poster_id`).
- For paid:
  - Task `task_type='paid'`.
  - Only one executor.
- For volunteer:
  - Task `task_type='volunteer'`.
  - Total `task_assignments` count after insertion ≤ `tasks.required_members`.

**State Preconditions**
- `tasks.status` in `('published','application_open')`.

**Database Tables Touched**
- `tasks` (UPDATE `selected_executor_id`, `status` to `executor_selected` or `in_progress`).
- `task_applications` (UPDATE statuses to `accepted`/`rejected`).
- `task_assignments` (INSERT for volunteer).
- `audit_logs` (INSERT).
- `notifications` (INSERT to applicants).

**Side Effects**
- For paid:
  - Set `selected_executor_id`.
  - Change other applications to `rejected`.
- For volunteer:
  - Insert `task_assignments` rows.
- In both:
  - Insert `audit_logs` `action='executor_selected'` or `action='volunteers_selected'`.

**Failure Scenarios**
- `403 Forbidden`:
  - Non-owner tries to select executors.
- `409 Conflict`:
  - Task not in correct status.
  - Attempt to exceed `required_members` for volunteers.

---

### 3.8 Cancel Task

- **Endpoint**: `POST /tasks/{taskId}/cancel`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `taskId` (path, UUID, required).
- `reason` (string, optional).

**Validation Rules**
- Current user must be `tasks.poster_id` OR an admin enforcing cancellation.

**State Preconditions**
- `tasks.status` NOT IN (`'completed'`, `'cancelled'`, `'disputed'`).
- No final submission for paid tasks if business policy forbids late cancellation (checked via `submissions`).

**Database Tables Touched**
- `tasks` (UPDATE `status='cancelled'`, `cancelled_at`, `cancellation_reason`).
- `escrows` (SELECT/UPDATE if paid).
- `wallet_transactions` (INSERT for refund if applicable).
- `audit_logs` (INSERT).
- `notifications` (INSERT to executor/applicants).

**Side Effects**
- For paid tasks with escrow:
  - Trigger escrow refund path (see BUSINESS_RULES).
- Insert `audit_logs` `action='task_cancelled'`.

**Failure Scenarios**
- `403 Forbidden`:
  - Non-owner, non-admin.
- `409 Conflict`:
  - Task already completed/cancelled/disputed.

---

## 4. Submission & Review APIs (Paid Tasks)

### 4.1 Submit Work

- **Endpoint**: `POST /tasks/{taskId}/submit`
- **Auth required**: Yes
- **Role allowed**: `student`

**Request Fields**
- `taskId` (path, UUID, required).
- `submission_content` (string, required, non-empty).
- `submission_files` (array of file metadata, optional).
- `is_final` (boolean, optional).

**Validation Rules**
- Current user must be the selected executor:
  - `tasks.selected_executor_id = current user.id`.
- `submission_content` must be a non-empty string.
- `revision_number + 1` MUST NOT exceed `tasks.max_revisions`.

**State Preconditions**
- `tasks.task_type='paid'`.
- `tasks.status IN ('executor_selected','in_progress','under_review')`.

**Database Tables Touched**
- `submissions` (INSERT or UPDATE single row per task).
- `tasks` (UPDATE `status='under_review'`, `submitted_at`).
- `audit_logs` (INSERT).
- `notifications` (INSERT to poster).

**Side Effects**
- Create or update `submissions` row:
  - Increment `revision_number`.
  - Update `is_final` as requested.
- Insert `audit_logs` with `action='submission_created'` or `action='submission_updated'`.

**Failure Scenarios**
- `403 Forbidden`:
  - Current user is not selected executor.
- `409 Conflict`:
  - Revision limit exceeded.
- `400 Bad Request`:
  - `submission_content` empty.

---

### 4.2 Request Revision

- **Endpoint**: `POST /tasks/{taskId}/request-revision`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin` (poster or admin)

**Request Fields**
- `taskId` (path, UUID, required).
- `revision_request_details` (string, required).

**Validation Rules**
- Current user must be the poster for the task or an admin.
- Task must have an existing `submissions` row.

**State Preconditions**
- `tasks.status='under_review'`.
- `submissions.revision_number < tasks.max_revisions`.

**Database Tables Touched**
- `reviews` (INSERT or UPDATE with `outcome='revision_requested'`, `revision_request_details`).
- `tasks` (UPDATE `status='in_progress'` if returning to executor).
- `audit_logs` (INSERT).
- `notifications` (INSERT to executor).

**Side Effects**
- Mark that a revision has been requested.
- Insert `audit_logs` with `action='revision_requested'`.

**Failure Scenarios**
- `403 Forbidden`:
  - Non-poster, non-admin.
- `409 Conflict`:
  - No submission present or revision limit reached.

---

### 4.3 Approve Submission

- **Endpoint**: `POST /tasks/{taskId}/approve`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `taskId` (path, UUID, required).
- `feedback` (string, optional).

**Validation Rules**
- Current user must be `tasks.poster_id` or an admin.
- A `submissions` row must exist for `taskId`.

**State Preconditions**
- `tasks.status='under_review'`.
- Escrow exists for paid task in `escrows`.

**Database Tables Touched**
- `reviews` (INSERT with `outcome='approved'`).
- `tasks` (UPDATE `status='completed'`, `completed_at`).
- `wallet_transactions` (INSERT escrow release).
- `escrows` (UPDATE `released_at`, `release_type='approval'`).
- `audit_logs` (INSERT).
- `notifications` (INSERT to executor).

**Side Effects**
- Release escrow to executor’s wallet.
- Mark task as completed.
- Insert `audit_logs` with `action='submission_approved'`.

**Failure Scenarios**
- `403 Forbidden`:
  - Non-poster, non-admin.
- `409 Conflict`:
  - Task not in `under_review` or no escrow row.

---

### 4.4 Auto-Release (System-Triggered)

- **Endpoint**: System-triggered operation (no public HTTP endpoint; may be a scheduled job or event handler).

**Auth required**: System-only  
**Role allowed**: N/A

**State Preconditions**
- `tasks.status='under_review'`.
- Time since `submissions.submitted_at` > `tasks.review_window_hours`.
- No `reviews` row with final outcome.

**Database Tables Touched**
- `reviews` (INSERT with `outcome='auto_released'`).
- `wallet_transactions` (INSERT with `transaction_type='escrow_release_auto'`).
- `escrows` (UPDATE `released_at`, `release_type='auto_release'`).
- `tasks` (UPDATE `status='completed'`, `completed_at`).
- `audit_logs` (INSERT).
- `notifications` (INSERT to both poster and executor).

**Failure Scenarios**
- Logged internally; system must retry or alert ops if DB operations fail.

---

## 5. Volunteer APIs

### 5.1 Assign Volunteers

- **Endpoint**: `POST /tasks/{taskId}/assign-volunteers`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `taskId` (path, UUID, required).
- `executor_ids` (array of UUIDs, required).

**Validation Rules**
- Current user must be `tasks.poster_id` or admin.
- Task must have `task_type='volunteer'`.
- Each `executor_id` must:
  - Be a valid user.
  - Have applied (`task_applications` row).
- New assignments cannot exceed `tasks.required_members`.

**State Preconditions**
- `tasks.status IN ('published','application_open')`.

**Database Tables Touched**
- `task_assignments` (INSERT).
- `task_applications` (UPDATE statuses if used that way).
- `tasks` (UPDATE `status` to `in_progress` when first volunteers assigned).
- `audit_logs` (INSERT).
- `notifications` (INSERT).

**Side Effects**
- Volunteers are added as executors to task.
- `audit_logs` entry with `action='volunteers_assigned'`.

**Failure Scenarios**
- `403 Forbidden`:
  - Non-owner, non-admin.
- `409 Conflict`:
  - Exceeding `required_members`.

---

### 5.2 Log Volunteer Hours

- **Endpoint**: `POST /tasks/{taskId}/volunteer-hours`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `taskId` (path, UUID, required).
- `hours` (decimal, required, > 0).

**Validation Rules**
- For students:
  - Current user must have a `task_assignments` row for this `taskId`.
- `hours` must be within reasonable limits per request (anti-abuse).

**State Preconditions**
- `tasks.task_type='volunteer'`.
- `tasks.status IN ('in_progress','under_review','completed')` as allowed by policy.

**Database Tables Touched**
- `task_assignments` (UPDATE `hours_logged` for `(task_id, executor_id)`).
- Optionally `profiles` (UPDATE `volunteer_hours` aggregated by service).
- `audit_logs` (INSERT).

**Side Effects**
- Increments hours logged for volunteer.
- Optionally increments `profiles.volunteer_hours` for that user.

**Failure Scenarios**
- `403 Forbidden`:
  - User is not assigned volunteer.
- `409 Conflict`:
  - Task status does not allow logging hours (e.g., cancelled).

---

### 5.3 Mark Volunteer Task Completed

- **Endpoint**: `POST /tasks/{taskId}/complete-volunteer`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `taskId` (path, UUID, required).

**Validation Rules**
- Only `tasks.poster_id` or admin may mark completion.

**State Preconditions**
- `tasks.task_type='volunteer'`.
- `tasks.status IN ('in_progress','under_review')`.

**Database Tables Touched**
- `tasks` (UPDATE `status='completed'`, `completed_at`).
- `task_assignments` (UPDATE `certificate_eligible` as per policy).
- `profiles` (UPDATE `volunteer_hours`, `completed_tasks_count` as per service logic).
- `audit_logs` (INSERT).
- `notifications` (INSERT).

**Side Effects**
- Mark volunteer task as completed.
- Optionally flag eligible volunteers for certificates.

**Failure Scenarios**
- `403 Forbidden`:
  - Non-owner, non-admin.
- `409 Conflict`:
  - Task not in a completable state.

---

## 6. Wallet APIs

### 6.1 View Wallet

- **Endpoint**: `GET /wallet`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- None.

**State Preconditions**
- Wallet exists for current user (auto-created at registration).

**Database Tables Touched**
- `wallets` (SELECT).
- Optionally `wallet_transactions` (SELECT recent transactions).

**Side Effects**
- None.

**Failure Scenarios**
- `404 Not Found`:
  - No wallet row for user (indicates registration inconsistency).

---

### 6.2 Deposit (Internal Ledger Only)

- **Endpoint**: `POST /wallet/deposit`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `amount` (decimal, required, > 0).
- `description` (string, optional).

**Validation Rules**
- `amount` must be positive and within configured limits.

**State Preconditions**
- Wallet exists, `users.is_active = TRUE`, `is_suspended = FALSE`.

**Database Tables Touched**
- `wallets` (UPDATE balances).
- `wallet_transactions` (INSERT with `transaction_type='deposit'`).
- `audit_logs` (INSERT).

**Side Effects**
- Increase available `wallets.balance`.
- Record immutable transaction.

**Failure Scenarios**
- `409 Conflict`:
  - Inconsistent balances or violation of `valid_balance_transition`.
- `500 Internal Server Error`:
  - Failure to perform atomic wallet/transaction update.

---

### 6.3 Request Withdrawal

- **Endpoint**: `POST /wallet/withdrawals`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `amount` (decimal, required, > 0).
- `description` (string, optional).

**Validation Rules**
- `amount` must be ≤ available `wallets.balance`.

**State Preconditions**
- `users.email_verified = TRUE`.
- `users.phone_verified = TRUE`.
- `is_active = TRUE`, `is_suspended = FALSE`.

**Database Tables Touched**
- `wallets` (no immediate balance change, as withdrawal is not instant).
- `wallet_transactions` (INSERT with `transaction_type='withdrawal_request'`, `status='pending'`).
- `audit_logs` (INSERT).

**Side Effects**
- Create a pending withdrawal request in ledger.
- Notify admins via `notifications` (optional).

**Failure Scenarios**
- `400 Bad Request`:
  - Amount ≤ 0.
- `409 Conflict`:
  - Amount exceeds available balance.

---

### 6.4 Process Withdrawal (Admin)

- **Endpoint**: `POST /admin/wallet/withdrawals/{transactionId}/process`
- **Auth required**: Yes
- **Role allowed**: `admin`

**Request Fields**
- `transactionId` (path, UUID, required) — refers to a `wallet_transactions` row with `transaction_type='withdrawal_request'`.
- `approve` (boolean, required).
- `reason` (string, optional).

**Validation Rules**
- Target transaction must belong to a valid wallet and be `status='pending'`.

**State Preconditions**
- Admin user authenticated.

**Database Tables Touched**
- `wallet_transactions` (UPDATE status of request; INSERT new `withdrawal_processed` transaction on approval).
- `wallets` (UPDATE `balance` on approval).
- `audit_logs` (INSERT).

**Side Effects**
- On approval:
  - Decrease `wallets.balance` by requested amount.
  - Insert `wallet_transactions` with `transaction_type='withdrawal_processed'`.
- On rejection:
  - Set `status='failed'` for request transaction.
- Log action in `audit_logs`.

**Failure Scenarios**
- `403 Forbidden`:
  - Non-admin access.
- `409 Conflict`:
  - Transaction already processed or not in `pending` state.

---

## 7. Dispute APIs

### 7.1 Create Dispute

- **Endpoint**: `POST /tasks/{taskId}/disputes`
- **Auth required**: Yes
- **Role allowed**: `student`

**Request Fields**
- `taskId` (path, UUID, required).
- `dispute_type` (`scope_mismatch | missing_submission | deadline_violation`, required).
- `description` (string, required).
- `evidence` (JSON object, optional).

**Validation Rules**
- Current user must be either:
  - `tasks.poster_id`, or
  - Selected executor (`tasks.selected_executor_id` for paid, or an assigned volunteer for volunteer tasks).
- Only one dispute per task (`disputes.task_id UNIQUE`).
- Dispute type must be one of the enum values; subjective quality disputes not permitted.

**State Preconditions**`r`n- `tasks.status='under_review'`, OR`r`n- `tasks.status='completed'` AND `NOW() <= tasks.completed_at + INTERVAL '48 hours'`.

**Database Tables Touched**
- `disputes` (INSERT).
- `audit_logs` (INSERT).
- `notifications` (INSERT to other party and admins).

**Side Effects**
- Set `tasks.status='disputed'` and lock further sensitive transitions on task in business logic.
- Insert `audit_logs` with `action='dispute_created'`.

**Failure Scenarios**
- `403 Forbidden`:
  - User is neither poster nor executor/assignee.
- `409 Conflict`:
  - Existing dispute already present for task.

---

### 7.2 View Dispute

- **Endpoint**: `GET /tasks/{taskId}/disputes`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `taskId` (path, UUID, required).

**Validation Rules**
- Students can view disputes only if:
  - They are `filed_by_user_id`, or
  - They are the other party in the disputed task (poster or executor).
- Admins can view any dispute.

**State Preconditions**
- Dispute exists for `taskId`.

**Database Tables Touched**
- `disputes` (SELECT).

**Side Effects**
- None.

**Failure Scenarios**
- `403 Forbidden`:
  - User not a party to dispute, and not admin.
- `404 Not Found`:
  - No dispute for this task.

---

### 7.3 Admin Resolve Dispute

- **Endpoint**: `POST /admin/disputes/{disputeId}/resolve`
- **Auth required**: Yes
- **Role allowed**: `admin`

**Request Fields**
- `disputeId` (path, UUID, required).
- `admin_decision` (string, required).
- `admin_decision_fund_allocation` (JSON object, optional; describes how escrow should be split).

**Validation Rules**
- Dispute must be in `status IN ('pending','under_review','escalated')`.

**State Preconditions**
- Escrow exists for paid disputes.

**Database Tables Touched**
- `disputes` (UPDATE — `status`, `admin_decision`, `admin_decision_fund_allocation`, `resolved_at`, `assigned_admin_id`).
- `wallet_transactions` (INSERT — to reallocate escrow).
- `escrows` (UPDATE `released_at`, `release_type='dispute_resolution'`).
- `tasks` (UPDATE `status='completed'` or `cancelled` as decided).
- `audit_logs` (INSERT).
- `notifications` (INSERT).

**Side Effects**
- Allocate escrow between parties as per decision.
- Mark dispute as resolved.

**Failure Scenarios**
- `403 Forbidden`:
  - Non-admin.
- `409 Conflict`:
  - Dispute already resolved or auto-resolved.

---

## 8. Chat & Notification APIs

### 8.1 Send Task Message

- **Endpoint**: `POST /tasks/{taskId}/messages`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin` (but content from admins should be limited to support flows)

**Request Fields**
- `taskId` (path, UUID, required).
- `message_text` (string, optional; if attachments-only, must be empty string to satisfy NOT NULL).
- `file_attachments` (JSON array, optional — allowed only for evidence-like files).

**Validation Rules**
- User must be:
  - Task poster (`tasks.poster_id`), or
  - Selected executor (`tasks.selected_executor_id`) for paid tasks, or
  - Assigned volunteer for volunteer tasks (`task_assignments`).
- At least one of `message_text` or `file_attachments` must be provided; if attachments-only, send `message_text=""`.

**State Preconditions**
- Chat is enabled only after executor selection (or volunteer assignment) and before archival:
  - Task not in terminal archived state (enforced in service layer).

**Database Tables Touched**
- `chat_messages` (INSERT).
- `notifications` (INSERT to other participants).

**Side Effects**
- Append immutable chat message for task.

**Failure Scenarios**
- `403 Forbidden`:
  - User is not a participant in the task.
- `400 Bad Request`:
  - Empty message and no attachments.

---

### 8.2 Fetch Task Messages

- **Endpoint**: `GET /tasks/{taskId}/messages`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `taskId` (path, UUID, required).
- Pagination query params (optional).

**Validation Rules**
- Only participants (poster, executor(s)) and admins may view chat.

**State Preconditions**
- Task exists.

**Database Tables Touched**
- `chat_messages` (SELECT by `task_id` ordered by `sent_at`).

**Side Effects**
- None.

**Failure Scenarios**
- `403 Forbidden`:
  - Non-participant, non-admin.

---

### 8.3 Fetch Notifications

- **Endpoint**: `GET /notifications`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- Pagination / filters (e.g., unread only).

**Database Tables Touched**
- `notifications` (SELECT by `user_id`).

**Side Effects**
- None.

**Failure Scenarios**
- None beyond generic errors.

---

### 8.4 Mark Notification Read

- **Endpoint**: `POST /notifications/{notificationId}/read`
- **Auth required**: Yes
- **Role allowed**: `student`, `admin`

**Request Fields**
- `notificationId` (path, UUID, required).

**Validation Rules**
- Notification must belong to the current user.

**State Preconditions**
- `notifications.is_read = FALSE`.

**Database Tables Touched**
- `notifications` (UPDATE `is_read=TRUE`, `read_at`).

**Side Effects**
- Mark notification as read.

**Failure Scenarios**
- `403 Forbidden`:
  - Attempt to modify someone else’s notification.
- `404 Not Found`:
  - Notification does not exist.














