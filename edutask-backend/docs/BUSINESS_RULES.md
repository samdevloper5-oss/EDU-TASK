## EDUTASK Business Rules Specification

This document defines the enforceable business rules for EDUTASK based on the existing PostgreSQL schema.  
No rule below assumes tables, columns, or enums that are not present in `database/schema.sql`.

---

## Part 1: Authentication & Authorization

### 1. Identity Model

1.1 **Primary Identifiers**
1. Email is the primary login and notification identifier and must be unique per user (`users.email UNIQUE`).
2. Phone number is a primary anti-fraud and recovery identifier and must be unique per user (`users.phone UNIQUE`).
3. Student ID is stored on `users.student_id` and is required at registration; it is not globally unique in the schema.
4. Each user has a stable UUID (`users.id UUID PRIMARY KEY`) used as the internal identity key across all tables.

1.2 **Profile Data**
1. Student-specific metadata is stored in `profiles` and linked 1:1 to `users` via `profiles.user_id UNIQUE REFERENCES users(id)`.
2. `profiles.institution` is stored in `profiles` for affiliation and display; student ID is stored only on `users`.
3. Reputation and activity metrics are stored in `profiles.reputation_score`, `profiles.completed_tasks_count`, and `profiles.volunteer_hours`.

1.3 **Trust Tier vs Authentication**
1. Authentication only confirms that a user has a valid credential (e.g., email + password / OAuth) and a corresponding `users` row.
2. Trust tier is represented by the `users.trust_tier` enum (`basic`, `verified`, `trusted`).
3. Trust tier affects limits, eligibility, and risk controls, but:
   - Does NOT affect whether a user can log in.
   - Does NOT affect whether a user can have an active account.

1.4 **Account State Flags**
1. `users.is_active` controls whether the account is logically active.
2. `users.is_suspended` controls whether the account is temporarily blocked from sensitive actions.
3. `users.email_verified` and `users.phone_verified` represent verification state for email and phone only.

---

### 2. Registration Rules

2.1 **Eligibility**
1. Any student can create an account; the database does not restrict sign-up beyond required fields.
2. Registration cannot be blocked by profile or identity verification; the schema explicitly supports unverified users (`verification_status` default, `email_verified=false`, `phone_verified=false`).

2.2 **Required Fields at Registration**
1. `users.email` (non-null, unique).
2. `users.phone` (non-null, unique).
3. `users.student_id` (non-null).
4. `profiles.full_name` (non-null).
5. `profiles.institution` (non-null).

2.3 **Optional Fields at Registration**
1. `profiles.department` (optional).
2. `profiles.bio` (optional).
3. `profiles.profile_image_url` (optional).
4. `profiles.verification_document_url` (optional).

2.4 **Student ID Uniqueness**
1. The schema does NOT enforce global uniqueness for `users.student_id`.
2. Any uniqueness or collision checks beyond required fields MUST be enforced at the service layer if desired.

2.5 **Default Trust Tier Assignment**
1. Upon successful registration, `users.trust_tier` MUST be set to `basic` (`DEFAULT 'basic'`).
2. No other trust tier may be assigned at registration time by default.

2.6 **Email and Phone Verification**
1. Newly created users have `users.email_verified = FALSE` and `users.phone_verified = FALSE`.
2. When email verification flow completes (handled outside DB), the system MUST:
   - Set `users.email_verified = TRUE`.
   - Write an `audit_logs` entry with `action='email_verified'` and `entity_type='user'`.
3. When phone verification flow completes, the system MUST:
   - Set `users.phone_verified = TRUE`.
   - Write an `audit_logs` entry with `action='phone_verified'` and `entity_type='user'`.
4. The schema does not store verification tokens; any token management is application-level or Phase-2 (Out of Scope).

2.7 **Account Activation**
1. A user row is considered created and active when:
   - `users.is_active = TRUE` (default) AND
   - A corresponding `profiles` row exists for that `user_id`.
2. Email/phone non-verification MUST NOT fully block login, but:
   - Certain high-risk actions (e.g., posting high-value paid tasks, initiating withdrawals) MUST require `email_verified` and `phone_verified` to be TRUE.
   - These checks MUST be enforced in the API/service layer using existing flags.

---

### 3. Login Rules

3.1 **Allowed Login Identifiers**
1. Users MAY log in using:
   - Email + credential.
   - Phone + credential.
2. The schema does not store password hashes or OAuth identities; these MUST be implemented outside this schema or via external identity provider (Phase-2).

3.2 **Login Security Constraints**
1. On successful login, the system MUST:
   - Update `users.last_login_at = NOW()`.
   - Optionally log `audit_logs` with `action='login_success'`, `entity_type='user'`, `entity_id=users.id`, plus `ip_address` and `user_agent`.
2. On failed login attempts, the system SHOULD:
   - Log `audit_logs` with `action='login_failed'`.
   - Increment in-memory or external counters for rate limiting (not stored in schema; Phase-2 if persisted).

3.3 **Failed Login Handling**
1. The schema does not track login attempt counts; brute-force protection MUST be implemented at API/gateway level (e.g., by IP, email, or phone).
2. If external logic decides to suspend an account due to abuse:
   - Set `users.is_suspended = TRUE`.
   - Log an `audit_logs` entry with `action='account_suspended'`.

3.4 **Suspended / Inactive Behavior**
1. If `users.is_active = FALSE`, the user MUST NOT be allowed to:
   - Create tasks.
   - Apply to tasks.
   - Receive or send funds.
2. If `users.is_suspended = TRUE`, the user MAY log in to view history but MUST NOT be allowed to:
   - Create or edit tasks.
   - Apply to tasks.
   - Submit work.
   - Initiate wallet transactions (including withdrawals).
3. All API endpoints must explicitly enforce these checks using `users.is_active` and `users.is_suspended`.

---

### 4. Session & Token Model

4.1 **Token Types**
1. **Access tokens**:
   - Short-lived tokens used to authenticate API calls.
   - Not stored in the database tables defined in `schema.sql`.
2. **Refresh tokens**:
   - Longer-lived tokens used to obtain new access tokens.
   - Not persisted in the current schema; any storage would require Phase-2 changes.

4.2 **Token Expiration (Logical Rules)**
1. Access tokens SHOULD be short-lived (e.g., ≤ 15 minutes). This is an application-level rule and not enforced by schema.
2. Refresh tokens SHOULD be longer-lived (e.g., ≤ 7 days) and SHOULD be rotated on use.

4.3 **Secure Storage Expectations**
1. Tokens MUST be stored in secure, HTTP-only cookies or equivalent mechanisms on the client side.
2. The database schema does not manage token storage; misuse is prevented by API and infrastructure configuration, not by DB.

4.4 **Logout Behavior**
1. Logout MUST:
   - Invalidate tokens at the application level (e.g., clearing cookies or server-side token blacklists if implemented).
   - Optionally log `audit_logs` with `action='logout'`.
2. The database schema does not contain per-session records; full session history is not currently persisted.

---

### 5. Role-Based Access Control (RBAC)

5.1 **Roles**
1. Roles are defined by `users.role` enum:
   - `student`
   - `admin`

5.2 **Student Capabilities**
1. Students MAY:
   - Own tasks via `tasks.poster_id`.
   - Apply to tasks via `task_applications`.
   - Be assigned to tasks via `tasks.selected_executor_id` (paid) or `task_assignments` (volunteer).
   - Own wallets via `wallets.user_id`.
   - File disputes via `disputes.filed_by_user_id`.
   - Exchange task-scoped chat messages via `chat_messages`.
2. Students MUST NEVER:
   - Directly modify other users’ rows in `users` or `profiles`.
   - Directly modify wallet balances; all changes MUST go through `wallet_transactions` + service logic.
   - Directly edit `wallet_transactions`, `escrows`, `disputes`, or `audit_logs` rows.

5.3 **Admin Capabilities**
1. Admins are users with `users.role = 'admin'`.
2. Admins MAY:
   - View all entities required for mediation (tasks, disputes, wallet_transactions, chat_messages, audit_logs).
   - Set `users.is_suspended` and `users.is_active`.
   - Update `disputes.*` fields for resolution.
   - Perform wallet operations on behalf of the platform or to enforce dispute decisions, via creation of `wallet_transactions`.
3. The schema enforces that only admins can be assigned to disputes via the `admin_assignment` CHECK constraint.
   - Service logic MUST satisfy this by ensuring `disputes.assigned_admin_id` always refers to a user with `role='admin'`.

5.4 **API-Level Enforcement**
1. Every modifying API endpoint MUST:
   - Load `users.role`, `users.is_active`, and `users.is_suspended`.
   - Enforce role-based and state-based access rules before issuing any write to the DB.
2. The DB provides role flags but does not provide stored procedures for RBAC; enforcement is application-level.

---

### 6. Account State Transitions

6.1 **Active → Suspended**
1. Trigger conditions (e.g., fraud signals, repeated disputes) are determined by business logic (not stored in schema).
2. On suspension:
   - Set `users.is_suspended = TRUE`.
   - Log `audit_logs` with `action='account_suspended'` and a reason in `new_values`.

6.2 **Suspended → Reinstated**
1. Only admins may reinstate accounts.
2. On reinstatement:
   - Set `users.is_suspended = FALSE` (optionally `is_active = TRUE` if previously deactivated).
   - Log `audit_logs` with `action='account_reinstated'`.

6.3 **Verification State**
1. `profiles.verification_status` tracks external/student verification workflow (e.g., `'unverified'`, `'pending'`, `'verified'` – specific values are convention, not enforced by enum).
2. Changes to `verification_status` MUST:
   - Be recorded in `audit_logs`.
   - NOT block login or basic task participation; instead, they influence trust tier and limits.

6.4 **Trust Tier Upgrades (Manual Rules)**
1. Trust tier is stored in `users.trust_tier` and can be updated only through explicit actions (e.g., admin tools or controlled workflows).
2. Example minimum conditions (enforceable using existing columns, but applied in service layer):
   - Upgrade to `verified` MAY require:
     - `profiles.verification_status = 'verified'`, `email_verified = TRUE`, `phone_verified = TRUE`.
   - Upgrade to `trusted` MAY require:
     - `profiles.completed_tasks_count` and/or `profiles.volunteer_hours` above predefined thresholds, and no recent suspensions (checked via `audit_logs`).
3. The DB does NOT enforce any automatic trust tier transitions; all upgrades and downgrades MUST be triggered by application logic and recorded in `audit_logs`.

---

### 7. Security Rules

7.1 **Rate Limiting**
1. The schema does not store rate limit counters; rate limiting MUST be enforced at the API gateway or application layer.
2. When rate limiting decisions significantly affect a user (e.g., blocking), they SHOULD be logged in `audit_logs` with `action='rate_limit_blocked'`.

7.2 **Brute-Force Protection**
1. Failed logins MUST NOT cause any DB schema changes other than optional `audit_logs` entries.
2. Brute-force detection SHOULD rely on ephemeral counters outside the DB, with escalation to:
   - Set `users.is_suspended = TRUE` when thresholds are met.

7.3 **Device/IP Logging**
1. For critical actions (login, wallet operations, dispute creation, admin actions), the system SHOULD write `audit_logs` rows with:
   - `user_id`
   - `action`
   - `entity_type` and `entity_id` (if applicable)
   - `ip_address`
   - `user_agent`

7.4 **Audit Log Requirements**
1. `audit_logs` is immutable by convention: rows MUST NEVER be updated or deleted in normal operation.
2. Any schema-level deletes (e.g., GDPR data erasure) MUST be treated as exceptional processes with their own higher-level audits (Phase-2).
3. All security-sensitive changes (role changes, trust tier changes, wallet operations, dispute decisions) MUST produce corresponding `audit_logs` entries.

---

## Part 2: Core Business Rules

### 1. Task Lifecycle Rules

1.1 **Lifecycle States**
1. Tasks use `tasks.status` with the following allowed values: `draft`, `published`, `application_open`, `executor_selected`, `in_progress`, `under_review`, `completed`, `cancelled`, `disputed`.
2. The DB does not enforce transitions; they MUST be enforced by services.

1.2 **Creation and Drafting**
1. A new task MUST:
   - Be linked to a poster via `tasks.poster_id`.
   - Specify `task_type` (`paid` or `volunteer`).
   - Provide `scope`, `deliverables`, and `acceptance_criteria`.
   - Set a `deadline`.
2. Tasks SHOULD start as `status='draft'`.

1.2.1 **Task Ownership**
1. Only the user referenced by `tasks.poster_id` (the task owner) is allowed to:
   - Edit task fields (title, description, scope, deliverables, acceptance_criteria, deadlines, etc.).
   - Publish or unpublish a task.
   - Cancel a task (`tasks.status='cancelled'`).
   - Select executors for both paid (`tasks.selected_executor_id`) and volunteer tasks (`task_assignments` creation).
2. These ownership rules are NOT enforced by the database and MUST be enforced in the service layer using the authenticated user’s `users.id` compared against `tasks.poster_id`.

1.3 **Publishing and Application Opening**
1. A task MAY move from `draft` → `published` when required fields are present.
2. `published` → `application_open`:
   - For **paid tasks**, this SHOULD occur only after escrow is created and locked (`escrows` row exists and funds locked via `wallet_transactions`).
   - For **volunteer tasks**, no escrow is required.

1.4 **Executor Selection**
1. **Paid tasks**:
   - Exactly one executor is selected via `tasks.selected_executor_id`.
   - The corresponding `task_applications.status` for that user SHOULD be set to `accepted`; all others SHOULD be set to `rejected`.
2. **Volunteer tasks**:
   - Multiple executors are selected via `task_assignments` rows per `(task_id, executor_id)`.
   - The number of `task_assignments` per task MUST NOT exceed `tasks.required_members` (enforced in service logic using `UNIQUE (task_id, executor_id)` plus count checks).

1.5 **In-Progress, Review, and Completion**
1. When work has started:
   - `tasks.status` MUST be set to `in_progress`.
2. When a submission exists in `submissions`:
   - `tasks.status` MUST be set to `under_review`.
3. When the task is successfully finished (and funds released for paid tasks):
   - `tasks.status` MUST be set to `completed`.
   - `tasks.completed_at` SHOULD be filled.

1.6 **Cancellation Rules**
1. Cancellation is modeled via `tasks.status='cancelled'` and `tasks.cancelled_at` plus optional `cancellation_reason`.
2. Cancellation by poster is allowed only when:
   - No final submission exists (`submissions` absent or not final) AND
   - Task is not already `completed`, `cancelled`, or `disputed`.
3. For **paid tasks** with escrow locked:
   - Cancellation MUST trigger an escrow refund workflow (see Paid Task Rules).
4. All cancellations MUST be logged in `audit_logs` with `action='task_cancelled'`.

---

### 2. Paid Task Rules (Escrow-Enforced)

2.1 **Escrow Creation and Locking**
1. Escrow for a paid task is represented by a row in `escrows` with:
   - `task_id` (UNIQUE per task).
   - `poster_wallet_id`.
   - `amount`.
2. Funds are locked into escrow via `wallet_transactions`:
   - A transaction with `transaction_type='escrow_lock'`.
   - `balance_after = balance_before - amount`.
   - `escrow_balance_after = escrow_balance_before + amount`.
3. After escrow is locked:
   - `tasks.status` MAY move to `published` or `application_open`.

2.2 **Escrow Enforcement**
1. While a task is in any of `application_open`, `executor_selected`, `in_progress`, or `under_review`, escrow funds MUST remain locked (no `escrow_refund` or release yet).
2. Only one `escrows` row per paid task is allowed (`task_id UNIQUE`).

2.3 **Fund Release (Approval Path)**
1. When a reviewer (poster) approves the submission:
   - A `reviews` row MUST exist with `outcome='approved'`.
   - A wallet release transaction MUST be created for the executor wallet:
     - `wallet_transactions.transaction_type='escrow_release_approval'`.
2. The corresponding `escrows` row MUST:
   - Set `released_at`.
   - Set `release_type='approval'`.
3. `tasks.status` MUST be set to `completed`.

2.4 **Auto-Release Conditions**
1. If `tasks.status='under_review'` and no review is recorded within `tasks.review_window_hours`:
   - The system MUST auto-release escrow in favor of the executor.
2. Auto-release is recorded by:
   - Setting `reviews.outcome='auto_released'` (if a synthetic review row is created).
   - Creating a `wallet_transactions` row with `transaction_type='escrow_release_auto'`.
   - Setting `escrows.release_type='auto_release'` and `released_at`.

2.5 **Refund Conditions**
1. If a task is cancelled before completion and a decision is made to refund the poster:
   - A `wallet_transactions` row with `transaction_type='escrow_refund'` MUST credit the poster’s wallet.
   - `escrows.release_type='refund'` MUST be set.
2. Partial refunds or split allocations are represented by multiple `wallet_transactions` rows referencing the same `escrows.id` in `related_escrow_id`.

2.6 **Platform Fee Timing**
1. The schema does NOT have a dedicated platform fee column.
2. Any platform fee MUST be represented as one or more `wallet_transactions` rows:
   - Debiting the user’s wallet (poster or executor).
   - Crediting a platform-owned wallet (a user row with a designated role or flag).
3. Fee application timing MUST coincide with escrow lock, release, or withdrawal, but the exact policy is enforced in service logic using existing fields.

---

### 3. Volunteer Task Rules

3.1 **Applications and Assignments**
1. Volunteer tasks have `tasks.task_type='volunteer'`.
2. Applications are stored in `task_applications` the same as paid tasks.
3. Selected volunteers are recorded in `task_assignments` with unique `(task_id, executor_id)`.

3.2 **Required Members Enforcement**
1. For volunteer tasks, `tasks.required_members` MUST be non-null and > 0.
2. The service layer MUST ensure:
   - The count of `task_assignments` per task NEVER exceeds `required_members`.

3.3 **Hour Logging Rules**
1. Volunteer participation time is tracked per assignment via `task_assignments.hours_logged`.
2. Aggregated volunteer hours per user are tracked in `profiles.volunteer_hours`.
3. Increments to `profiles.volunteer_hours` MUST correspond to:
   - Completed volunteer tasks where `tasks.status='completed'` and the student has an assignment row.

3.3.1 **Volunteer Submissions**
1. For **paid tasks**, formal work submission is required and represented by a row in `submissions` linked to the task and executor.
2. For **volunteer tasks**, formal submissions in `submissions` are NOT required unless explicitly defined in the task scope and implemented by the service layer.
3. Volunteer contribution is primarily tracked via:
   - `task_assignments.hours_logged` per volunteer, and
   - The task completion state (`tasks.status='completed'`).

3.4 **Certificate Eligibility**
1. `task_assignments.certificate_eligible` flags eligibility per task and executor.
2. Certificates MAY be issued only when:
   - The task is completed (`tasks.status='completed'`).
   - `certificate_eligible = TRUE`.
3. Certificate issuance events SHOULD be logged in `audit_logs` with `action='certificate_issued'`.

---

### 4. Submission & Review Rules

4.1 **Valid Submission**
1. A submission is valid if:
   - A row exists in `submissions` for the `task_id` and `executor_id`.
   - `submission_content` is a non-empty string (required by `submissions.submission_content NOT NULL`).
2. Since `submissions.task_id` is UNIQUE, only one active submission record exists per task.
   - Revisions are represented via `revision_number` and `is_final` fields within that row.

4.2 **Review Window Enforcement**
1. After `submissions.submitted_at`, a review must be completed within `tasks.review_window_hours`.
2. If no `reviews` row exists within that period, auto-approval rules apply (see Paid Task Rules).

4.3 **Revision Limits**
1. The maximum allowed revisions are configured in `tasks.max_revisions`.
2. The service layer MUST enforce:
   - `submissions.revision_number` MUST NOT exceed `tasks.max_revisions`.

4.4 **Auto-Approval Behavior**
1. If no explicit review occurs in the review window:
   - A synthetic `reviews` row MAY be created with `outcome='auto_released'`.
   - Escrow funds MUST be auto-released (for paid tasks).
2. This auto-approval MUST be logged in `audit_logs` with `action='review_auto_released'`.

---

### 5. Wallet & Transaction Rules

5.1 **Wallet Invariants**
1. `wallets.balance` and `wallets.escrow_balance` MUST always be ≥ 0 (enforced by CHECK constraints).
2. All changes to balances MUST be justified by corresponding immutable `wallet_transactions` rows.

5.1.1 **Wallet Creation**
1. A `wallets` row MUST be automatically created for every new user immediately after successful registration.
2. Wallet creation MUST occur in the same overall registration flow before any task, application, or financial action is allowed for that user.
3. Wallet creation MUST be logged in `audit_logs` with:
   - `action='wallet_created'`,
   - `entity_type='wallet'`,
   - `entity_id=wallets.id`,
   - and `user_id` referencing the owner.

5.2 **Allowed Balance Changes**
1. The `valid_balance_transition` CHECK on `wallet_transactions` strictly constrains how balances can change per `transaction_type`.
2. The service layer MUST:
   - Compute `balance_before`, `balance_after`, `escrow_balance_before`, and `escrow_balance_after` correctly before inserting a transaction.

5.3 **Withdrawal Request Rules (Phase-1 Internal Ledger)**
1. A withdrawal request is represented as a `wallet_transactions` row with:
   - `transaction_type='withdrawal_request'`.
   - `status='pending'`.
2. Phase-1 withdrawals are:
   - Admin-reviewed.
   - Batch-processed.
3. No direct cash movement is modeled; the DB tracks only ledger changes.

5.4 **Withdrawal Processing Rules**
1. When a withdrawal is approved and processed:
   - A `wallet_transactions` row with `transaction_type='withdrawal_processed'` MUST be created.
   - The processed transaction MUST debit `wallets.balance` by the requested amount.
   - The corresponding `withdrawal_request` transaction’s `status` MUST be updated from `pending` to `completed` or `failed`.2. Any external payment execution (bKash/Nagad/bank) is **Phase-2 (Out of Scope)** with respect to this schema.

5.5 **Platform & Withdrawal Fees**
1. Any platform or withdrawal fee MUST be represented as one or more `wallet_transactions` rows as described in Paid Task Rules.
2. There is no dedicated fee field; any fee policy MUST be implemented solely via transactions and wallet balances.

---

### 6. Dispute Rules

6.1 **Who Can File Disputes**
1. Disputes are recorded in `disputes` with a single `task_id` (UNIQUE).
2. `disputes.filed_by_user_id` MUST be:
   - Either the task poster (`tasks.poster_id`), or
   - The executor (for paid tasks `tasks.selected_executor_id`; for volunteer tasks an `executor_id` from `task_assignments`).
3. This rule is enforceable via application logic using joins; the DB does not have a direct FK constraint beyond `filed_by_user_id REFERENCES users(id)`.
4. When a dispute is filed, the system MUST set `tasks.status='disputed'`.
5. Disputes may be filed only when:
   - `tasks.status='under_review'`, OR
   - `tasks.status='completed'` AND `NOW() <= tasks.completed_at + INTERVAL '48 hours'`.

6.2 **Allowed Dispute Types**
1. Dispute types are limited by the `dispute_type` enum:
   - `scope_mismatch`
   - `missing_submission`
   - `deadline_violation`
2. Subjective quality disputes (e.g., “low quality” without objective mismatch) are NOT modeled and MUST be rejected at API level.

6.3 **Evidence Sources**
1. Evidence comes from:
   - `tasks` (original scope, deliverables, acceptance criteria).
   - `submissions` (submission content and files).
   - `chat_messages` (task-scoped immutable communication).
   - `wallet_transactions` and `escrows` (financial history).
   - `reviews` (review outcomes and feedback).
   - `audit_logs` (timeline of key actions).
2. Additional metadata may be stored in `disputes.evidence` JSONB.

6.4 **Auto-Resolution**
1. `disputes.auto_resolved` and `disputes.auto_resolution_reason` capture automatic outcomes.
2. `disputes.status` transitions:
   - Initially `pending`.
   - May move directly to `auto_resolved` if rules are clear (e.g., confirmed missing submission).
   - Otherwise `under_review` → `resolved` or `escalated`.

6.5 **Dispute Rate Limits**
1. The schema does not store a per-user counter; rate limiting MUST be implemented using queries over `disputes`:
   - E.g., count recent disputes per `filed_by_user_id` in a time window.
2. If a user exceeds allowed rates, the system SHOULD:
   - Prevent new disputes.
   - Optionally log `audit_logs` with `action='dispute_rate_limited'`.

6.6 **Admin Decision Enforcement**
1. Admin decisions are stored in:
   - `disputes.admin_decision` (text explanation).
   - `disputes.admin_decision_fund_allocation` (JSONB structure).
2. Enforcing decisions MUST be done by:
   - Creating appropriate `wallet_transactions` rows to move funds from escrow to the poster and/or executor wallets.
   - Updating `escrows.release_type` to `dispute_resolution`.
   - Setting `disputes.status='resolved'` and `resolved_at`.

---

### 7. Reputation & Trust Tier Rules

7.1 **Reputation Increase Conditions**
1. Reputation is encoded in `profiles.reputation_score`.
2. Increment rules MUST be enforced by the service layer, but can be based on:
   - Completing paid tasks (`tasks.status='completed'` and participation as executor or poster).
   - Completing volunteer tasks and hours (`task_assignments.hours_logged` and `tasks.status='completed'`).

7.2 **Penalties**
1. Penalties (reputation decreases) MUST be explicit updates to `profiles.reputation_score`.
2. Triggers for penalties MAY include:
   - Dispute outcomes unfavorable to the user (poster or executor).
   - Task cancellations due to user fault.
3. All penalties MUST be logged in `audit_logs` with `action='reputation_changed'`.

7.3 **Volunteer vs Paid Weighting**
1. Because both `completed_tasks_count` and `volunteer_hours` are tracked, business rules MAY:
   - Apply higher weight to paid task completions.
   - Apply cumulative benefits for sustained volunteer hours.
2. Any weighting logic is computed outside the DB; the schema only stores raw counts and hours.

7.4 **Trust Tier Promotion (Manual)**
1. Trust tier is updated in `users.trust_tier`.
2. Promotions MUST be:
   - Performed by explicit actions (e.g., admin tools).
   - Based on thresholds using `profiles.reputation_score`, `completed_tasks_count`, `volunteer_hours`, and verification flags.
3. Every trust tier change MUST:
   - Update `users.trust_tier`.
   - Write an `audit_logs` entry with `action='trust_tier_changed'`.

---

## Part 3: System Safety Guarantees

### 1. Invariants That Must Never Break

1.1 **Financial Invariants**
1. `wallets.balance >= 0` and `wallets.escrow_balance >= 0` at all times.
2. Every change in balances MUST correspond to exactly one `wallet_transactions` row with a valid `valid_balance_transition`.
3. Escrow amounts in `escrows.amount` MUST equal the net locked funds corresponding to `escrow_lock` minus any `escrow_refund` and release transactions.

1.2 **Identity & Uniqueness Invariants**
1. `users.email` and `users.phone` MUST remain unique.
2. `users.student_id` MUST be present but is not globally unique in the schema.
3. Each user MUST have at most one `profiles` row and one `wallets` row.

1.3 **Lifecycle Invariants**
1. A paid task with an `escrows` row MUST NOT have its escrow funds arbitrarily moved without corresponding `wallet_transactions`.
2. A dispute (`disputes`) MUST reference a valid `tasks` row and `filed_by_user_id`.

---

### 2. Atomic Actions

2.1 **Wallet and Escrow Operations**
1. Any update that changes `wallets.balance` or `wallets.escrow_balance` MUST:
   - Occur inside a single database transaction.
   - Use `SELECT ... FOR UPDATE` on the affected `wallets` rows.
   - Prefer `SERIALIZABLE` isolation level as documented in the schema comments.

2.2 **Task + Escrow + Transaction Coordination**
1. Creating or cancelling a paid task and its escrow MUST:
   - Be handled in one transaction if they occur together (e.g., lock funds and create `escrows` row).
2. Dispute resolution MUST:
   - Update `disputes`, `escrows`, and create all necessary `wallet_transactions` in a single transaction.

---

### 3. Race-Condition Prevention Rules

3.1 **Optimistic Locking**
1. Tables with `version` columns (`users`, `profiles`, `tasks`, `task_applications`, `task_assignments`, `submissions`, `reviews`, `wallets`, `escrows`, `disputes`) MUST use the `version` field for optimistic locking at the service layer.
2. Update operations SHOULD include `WHERE version = :old_version` and rely on triggers to increment `version`.

3.2 **Pessimistic Locking for Balances**
1. For wallet and escrow operations, services MUST:
   - Lock relevant `wallets` rows using `SELECT ... FOR UPDATE`.
   - Commit or roll back all related `wallet_transactions` and wallet updates atomically.

---

### 4. Logging Requirements

4.1 **Actions That Must Always Be Logged**
1. The following MUST result in an `audit_logs` row:
   - User registration.
   - Login success and optionally login failure.
   - Account suspension and reinstatement.
   - Trust tier changes.
   - Task creation, cancellation, and completion.
   - Dispute creation, auto-resolution, and admin resolution.
   - Any wallet operation that changes balance or escrow.
   - Certificate issuance.

4.2 **Log Integrity**
1. `audit_logs` rows are immutable by policy:
   - No UPDATE or DELETE in normal operations.
2. Any rare maintenance or legal operations touching logs MUST be separately audited (Phase-2).

---

### 5. Data Immutability Rules

5.1 **What Must NEVER Be Editable**
1. `wallet_transactions`:
   - Once inserted, MUST NEVER be updated or deleted, except under extraordinary, audited maintenance procedures.
2. `chat_messages`:
   - Messages MUST NEVER be updated or deleted; they serve as task-bound evidence.
   - `chat_messages.message_text` is NOT NULL; if a message contains only attachments, the API MUST send `message_text=''` (empty string).
3. `audit_logs`:
   - MUST NEVER be updated or deleted in normal operation.

5.2 **Chat as Evidence**
1. All `chat_messages` are:
   - Task-scoped via `task_id`.
   - Immutable (no update triggers, no deletion allowed).
2. Chat messages MUST be considered primary evidence during disputes alongside `tasks`, `submissions`, `wallet_transactions`, `escrows`, and `audit_logs`.

---

This BUSINESS_RULES specification is fully grounded in the existing EDUTASK PostgreSQL schema and is intended to be enforceable through a combination of database constraints and strictly implemented service-layer logic.


