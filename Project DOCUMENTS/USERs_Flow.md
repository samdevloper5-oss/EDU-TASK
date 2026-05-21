# EduTask — Website & User Flow Documentation

**Related docs:** [PRD](./PRD.md) · [TRD](./TRD.md) · [UI/UX Brief](./UI_UX_Design_Brief.md)

---

## 1. Route Architecture

```
/ (landing page — public)
├── /signin
├── /signup
├── /verify-otp
├── /forgot-password
├── /reset-password
├── /onboarding          ← Post-OTP profile completion (3 steps)
│
├── /dashboard           ← Protected
├── /tasks               ← Task marketplace
├── /tasks/[id]          ← Task detail + apply
├── /post-task           ← Post new task
├── /my-tasks            ← Posted & applied tasks
├── /chat                ← Conversation list
├── /chat/[taskId]       ← Task-specific chat room
├── /wallet              ← Balance, transactions, deposit
├── /leaderboard         ← Rankings
├── /profile             ← Own profile
├── /profile/[userId]    ← Public profile
│
└── /admin               ← Admin only
    ├── /admin/users
    ├── /admin/tasks
    ├── /admin/disputes
    └── /admin/verifications
```

---

## 2. Flow 1 — Registration & Onboarding

```
Landing → Sign Up (name, email, password)
  → POST /api/auth/signup → Supabase sends OTP
  → /verify-otp (6-digit code)
  → POST /api/auth/verify-otp → email_verified = true
  → /onboarding (3 steps):
      Step 1: photo, name, location
      Step 2: university, department, student ID, phone, ID photo upload
      Step 3: skills (min 1), referral code
  → POST /api/auth/complete-profile → profile_complete = true
  → /dashboard
```

---

## 3. Flow 2 — Sign In (Existing User)

```
/signin → supabase.auth.signInWithPassword
  IF email_verified = false → /verify-otp
  IF profile_complete = false → /onboarding
  IF is_banned = true → signOut + /signin?reason=banned
  IF all OK → /dashboard
```

---

## 4. Flow 3 — Task Poster Journey

```
Dashboard → /post-task → POST /api/tasks (status: open)
  → /my-tasks (Posted tab) → wait for applications
  → Notification: "New application"
  → View applicants → Hire worker
  → Check wallet_balance ≥ budget
  → POST /api/tasks/{id}/hire:
      wallet_balance -= budget, escrow_balance += budget
      status → in_progress, system message in chat
  → /chat/{taskId} → monitor work
  → Worker submits → status: under_review
  → Accept Work → escrow release → status: completed
  → Leave review → trust score updated
```

---

## 5. Flow 4 — Task Worker Journey

```
/tasks → filter/search → /tasks/{id} → Apply (proposal min 20 chars)
  → POST /api/tasks/{id}/apply
  → /my-tasks (Applied tab) → wait for hire
  → IF hired: notification + /chat/{taskId}
  → Submit work → POST /api/tasks/{id}/submit → under_review
  → IF accepted: wallet += (budget × 0.92), notification
  → Poster review → trust score update
```

---

## 6. Flow 5 — Wallet & Escrow (Demo)

```
/wallet → Available Balance | In Escrow | Total Earned

Add Demo Funds:
  → [+100] [+500] [+1000] buttons
  → POST /api/wallet/deposit { amount, method: 'demo' }
  → wallet_balance += amount, transaction record created

Escrow Lock (hire):
  → wallet_balance -= budget, escrow_balance += budget

Escrow Release (accept):
  → escrow_balance -= budget
  → worker.wallet_balance += (budget × 0.92)
  → platform_earnings += (budget × 0.08)

Withdraw:
  → POST /api/wallet/withdraw → balance -= amount (demo, instant)
```

---

## 7. Flow 6 — Real-Time Chat

```
/chat → list conversations (tasks where user is poster or worker)
/chat/{taskId}:
  → Load history on mount
  → Supabase Realtime: INSERT on messages where task_id=taskId
  → POST /api/messages to send
  → System messages: centered gray pills
  → Worker: "Submit Work" button
  → Poster (under_review): "Accept" / "Request Revision"
```

---

## 8. Escrow State Machine

```
Task created          → escrow_deposited: false, status: 'open'
Poster hires worker   → escrow_deposited: true,  status: 'in_progress'
                         poster.wallet_balance -= budget
                         poster.escrow_balance += budget
Worker submits        → status: 'under_review'
Poster accepts        → status: 'completed'
                         poster.escrow_balance -= budget
                         worker.wallet_balance += (budget × 0.92)
                         platform_earnings += (budget × 0.08)
```

---

*EduTask User Flows | May 2026*
