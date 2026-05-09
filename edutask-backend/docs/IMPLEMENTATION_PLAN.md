## IMPLEMENTATION PLAN - EDUTASK MVP

### 1. Purpose of This Plan

1. This plan guides implementation from design artifacts to a production-ready EDUTASK MVP.
2. It translates `schema.sql`, `BUSINESS_RULES.md`, `API_CONTRACTS.md`, and `STATE_TRANSITIONS.md` into a safe build order.
3. It defines how to implement, not what to implement. It MUST NOT override any rule in the design documents.

---

### 2. Non-Negotiables

1. Business rules are enforced ONLY in services.
2. PostgreSQL transactions MUST wrap all wallet, escrow, and dispute mutations.
3. DB constraints in `schema.sql` are authoritative and must be respected as-is.

---

## 3. Safe Build Order (ONLY safe order)

**Phase 0 - Project & Environment Setup**
- Dependency: None.
- Goal: Stable repo, config, and local DB setup.

**Phase 1 - Foundation (DB + Core Identity/Wallet Services)**
- Dependency: Phase 0.
- Goal: DB access, repositories, transaction helper, audit logging utility, and core auth/user/wallet services.
- This phase establishes the only safe base for any later module.

**Phase 2 - Auth/Profile APIs and Middleware**
- Dependency: Phase 1.
- Goal: Wire auth and profile routes/controllers to services with RBAC and account-state checks.

**Phase 3 - Tasks & Applications (no money flow)**
- Dependency: Phase 2.
- Goal: Task lifecycle without escrow; applications and volunteer assignments.

**Phase 4 - Wallet Ledger + Escrow + Submissions/Reviews (Paid Tasks)**
- Dependency: Phase 3.
- Goal: Ledger correctness, escrow lock/release/refund, submissions/reviews, auto-release job.

**Phase 5 - Disputes & Admin Actions**
- Dependency: Phase 4.
- Goal: Dispute filing window, admin resolution, escrow allocation, and admin-only controls.

**Phase 6 - Chat, Notifications, Hardening, and Release Prep**
- Dependency: Phase 5.
- Goal: Chat, notifications, observability, tests, and production readiness.

---

## 4. Strict Module Dependencies

1. Repositories + DB transaction helper must exist before any service is implemented.
2. Auth/user/profile/wallet bootstrap must exist before any task or wallet flows.
3. Task lifecycle must exist before submissions/reviews and disputes.
4. Wallet ledger must exist before escrow; escrow must exist before paid-task approvals.
5. Disputes require tasks + submissions/reviews + escrow + wallet transactions.

---

## 5. Phase Details

### Phase 0 - Project & Environment Setup

**Objective**
- Create a reproducible environment and confirm `schema.sql` applies cleanly.

**Components**
- Env config, logging scaffolding, local PostgreSQL instance.

**What Must Be Tested Before Moving Forward**
- Migrations apply cleanly.
- DB connectivity verified.

---

### Phase 1 - Foundation (DB + Core Identity/Wallet Services)

**Objective**
- Provide DB access, repositories, transaction helper, audit logging utility, and core auth/user/wallet services.

**Components**
- DB connection pool and transaction helper.
- Repository layer for users, profiles, wallets, audit logs.
- Service layer foundations for auth, user, wallet.

**Database Tables Involved**
- `users`, `profiles`, `wallets`, `audit_logs`

**Phase 1 Required Functions (no code, just signatures/intent)**

`auth.service.js`
1. `registerUser(payload)` - validates input, calls user + wallet creation in a single transaction, writes audit logs.
2. `loginUser(identifier, credential)` - validates identity, updates `users.last_login_at`, writes audit log.
3. `logoutUser(userId)` - writes audit log and returns token invalidation intent (handled outside DB).
4. `verifyEmail(userId)` - sets `users.email_verified=TRUE`, writes audit log.
5. `verifyPhone(userId)` - sets `users.phone_verified=TRUE`, writes audit log.

`user.service.js`
1. `createUserWithProfileAndWallet(payload)` - creates `users`, `profiles`, `wallets` in a single transaction.
2. `getUserById(userId)` - read user for auth and RBAC checks.
3. `setUserActive(userId, isActive)` - admin-only state change with audit log.
4. `setUserSuspended(userId, isSuspended)` - admin-only state change with audit log.
5. `updateVerificationFlags(userId, { emailVerified, phoneVerified })` - updates flags, writes audit logs.

`wallet.service.js`
1. `createWalletForUser(userId)` - creates wallet row (called during registration transaction).
2. `getWalletByUserId(userId)` - returns wallet and recent transactions for display.
3. `assertWalletOwnership(userId, walletId)` - guards future money flows.

**Business Rules Enforced**
- Uniqueness: `users.email`, `users.phone`.
- Required identity: `users.student_id` present.
- Wallet auto-creation on registration.
- Audit logs for registration, login, and verification.

**What Must Be Tested Before Moving Forward**
- Registration creates `users`, `profiles`, `wallets` atomically.
- Login updates `last_login_at` and writes audit log.
- Verification flips flags and writes audit logs.

---

### Phase 1 Readiness Checklist (Complete = Safe to Proceed)

- Auth system correctness: registration, login, logout, email/phone verification all execute successfully and enforce account state flags.
- User creation invariants: `users.email` and `users.phone` uniqueness enforced; `users.student_id` required; `profiles.user_id` unique and linked.
- Wallet auto-creation guarantees: every successful registration creates exactly one `wallets` row for the user.
- Transaction safety requirements: registration and wallet creation are executed in a single DB transaction with rollback on any failure.
- Logging and audit requirements: `audit_logs` entries exist for user registration, login success, and verification actions.

---

### Phase 2 - Auth/Profile APIs and Middleware

**Objective**
- Implement auth/profile routes/controllers with RBAC and account-state checks.

**Components**
- Auth middleware.
- Profile service usage for profile updates.

**APIs**
- Register, login, logout, verify email, verify phone.
- Get own profile, update profile, view public profile.

**What Must Be Tested Before Moving Forward**
- RBAC and account-state checks are enforced in services.

---

### Phase 3 - Tasks & Applications (no money flow)

**Objective**
- Implement task creation and application flows without escrow or wallet changes.

**Dependencies**
- Phase 2 auth + profile services.

---

### Phase 4 - Wallet Ledger + Escrow + Submissions/Reviews

**Objective**
- Implement wallet ledger, escrow lock/release/refund, submissions, reviews, auto-release job.

**Dependencies**
- Tasks and applications in Phase 3.

---

### Phase 4B Completion (Escrow + Ledger Only)

**What Is Implemented**
- Wallet ledger operations (deposit, withdrawal request/processing) using `wallet_transactions`.
- Escrow lock, release, and refund with schema-derived state (`released_at`, `release_type`).
- Task transitions enforce escrow lock for paid tasks (`application_open`, `in_progress`, `under_review`).
- Escrow release on `completed` and refund on `cancelled` for paid tasks.
- All escrow and wallet mutations are atomic under a single SERIALIZABLE transaction.
- All financial actions are audit logged.

**What Is Intentionally Deferred**
- Task expiration handling (scheduled job).
- Dispute handling and dispute-driven escrow release/refund.
- Submissions and review workflows.

**Guaranteed Invariants**
- `wallets.balance` and `wallets.escrow_balance` never go negative.
- Escrow state is derived from `escrows.released_at` and `escrows.release_type` only.
- No task status transition can occur without required escrow state for paid tasks.
- All task↔escrow↔wallet mutations are atomic and concurrency-safe.

---

### Phase 5 - Disputes & Admin Actions

**Objective**
- Implement dispute filing window, task status to `disputed`, admin resolution and escrow allocation.

**Dependencies**
- Escrow + reviews in Phase 4.

---

### Phase 6 - Chat, Notifications, Hardening, and Release Prep

**Objective**
- Implement chat and notifications, load/transaction tests, and production readiness.

---
