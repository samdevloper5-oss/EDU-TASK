# EduTask — Implementation Plan

**Related docs:** [PRD](./PRD.md) · [TRD](./TRD.md) · [Backend Schema](./BACKEND_SCHEMA.md)

---

## Phase 0 — Environment Setup (Day 1, 2 hours)

- [ ] Create Supabase project (pxktjtedpgolzjagkpob)
- [ ] Configure Auth: email confirmations ON, OTP expiry 600s
- [ ] Set Site URL and redirect URLs
- [ ] Link Vercel project to `edutask-frontend`
- [ ] Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`
- [ ] Confirm `npm install && npm run dev` starts

---

## Phase 1 — Critical Bug Fixes (Day 1, 3 hours)

- [ ] Fix middleware.ts: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Fix lib/supabase/server.ts: same key fix
- [ ] Fix lib/supabase/client.ts: remove silent fallback
- [ ] Fix lib/store/auth.store.ts: localStorage via createJSONStorage
- [ ] Fix lib/hooks/use-auth.ts: useMemo for supabase client
- [ ] Remove lib/auth/otp.ts and resend package
- [ ] Replace register → signup route (Supabase native OTP)
- [ ] Rewrite verify-otp and resend-otp routes
- [ ] Clean .env.example (no secrets, no RESEND)
- [ ] `npm run build` — 0 TypeScript errors

---

## Phase 2 — Database & Auth (Day 2, 4 hours)

- [ ] Run Schema 001–008 in Supabase SQL Editor
- [ ] Create storage buckets + RLS policies
- [ ] Enable Realtime for messages, notifications, tasks, users, applications
- [ ] Regenerate types/database.ts from Supabase
- [ ] Test signup → OTP → onboarding → dashboard end-to-end

---

## Phase 3 — Core API Routes (Day 3, 6 hours)

Build all routes with Zod validation, auth checks, supabaseAdmin for writes:

**Auth:** signup, verify-otp, resend-otp, complete-profile, forgot-password, reset-password

**Tasks:** GET/POST /api/tasks, GET /api/tasks/[id], apply, hire, submit, accept, revision, dispute

**Messages:** GET/POST /api/messages

**Wallet:** GET /api/wallet, deposit, withdraw, transactions

**Other:** leaderboard, notifications, reviews, profile/[userId], admin routes

---

## Phase 4 — Dashboard Pages (Day 4–5, 8 hours)

Wire all pages to real API routes. Replace mock data and direct client DB writes.

Key pages: dashboard, tasks, post-task, my-tasks, chat, wallet, leaderboard, profile, admin

New components: TrustScoreRing, TaskCard, ApplyModal, HireModal, ReviewModal, WithdrawModal

---

## Phase 5 — Auth Pages (Day 5, 3 hours)

- Signup → verify-otp → onboarding (3 steps) → dashboard
- Signin with demo account buttons
- Forgot/reset password via Supabase native flow

---

## Phase 6 — Seed Data & Demo Mode (Day 6, 2 hours)

- Create 5 demo users in Supabase Auth
- Run seed SQL with real UUIDs
- Add 6 demo marketplace tasks
- Demo mode banner + signin demo buttons

---

## Phase 7 — Polish & Mobile (Day 6–7, 4 hours)

- Loading skeletons, empty states, error boundaries
- Mobile bottom nav at 375px
- Security headers in next.config.mjs
- Landing page with real task/leaderboard preview

---

## Phase 8 — Deploy (Day 7–8, 2 hours)

- [ ] `npm run build` — clean
- [ ] `vercel --prod` from edutask-frontend
- [ ] Production env vars set
- [ ] Run verification checklist on production URL

---

## Files to Delete or Replace

| File | Action |
|---|---|
| `lib/auth/otp.ts` | DELETE |
| `lib/socket-service.ts` | DELETE |
| `lib/api.ts` | DELETE |
| `lib/app-context.tsx` | DELETE |
| `lib/mock-data.ts` | DELETE |
| `app/api/auth/register/route.ts` | REPLACE with signup |
| Orphaned `components/*-page.tsx` | DELETE |

---

## Verification Checklist

**Authentication**
- [ ] Sign up → OTP → verify → onboarding → dashboard
- [ ] Sign in verified user → dashboard
- [ ] /dashboard without auth → /signin

**Task Flow**
- [ ] Post → apply → hire → chat → submit → accept → review → leaderboard update

**Wallet**
- [ ] Add 100 BDT → balance updates → transaction recorded

**Real-time**
- [ ] Chat message appears instantly in 2 tabs
- [ ] Notification appears without refresh

**Build & Deploy**
- [ ] npm run build — 0 errors
- [ ] All pages work at 375px mobile

---

*EduTask Implementation Plan | May 2026*
