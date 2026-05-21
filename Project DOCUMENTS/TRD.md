# EduTask — Technical Requirements Document (TRD)

**Related docs:** [PRD](./PRD.md) · [Backend Schema](./BACKEND_SCHEMA.md) · [Implementation Plan](./IMPLEMENTATION_PLAN.md)

---

## 1. Technology Stack

```
Frontend:    Next.js 15+ (App Router) + TypeScript (strict)
Styling:     TailwindCSS v4 + shadcn/ui components
Auth:        Supabase Auth (built-in OTP, session management, RLS)
Database:    Supabase PostgreSQL (hosted, free tier for prototype)
Storage:     Supabase Storage (avatars, student IDs, task files)
Realtime:    Supabase Realtime (Postgres Changes + Broadcast channels)
State:       Zustand v5 + React Query v5 (TanStack)
Forms:       React Hook Form + Zod validation
Icons:       Lucide React
Toasts:      Sonner
Deployment:  Vercel (frontend only — no separate backend server)
DNS:         Vercel DNS
```

---

## 2. Architecture Principle

**Single-server Supabase architecture.** No Express.js backend for the prototype. All API routes are Next.js API routes in `/app/api/`. All database access goes through Supabase client (anon key for user-authenticated operations, service role key for admin/trigger operations on the server only).

```
Browser
  ↓ HTTPS
Vercel Edge (Next.js)
  ├── /app/(auth)/        — Public auth pages
  ├── /app/(dashboard)/  — Protected dashboard pages (RSC)
  ├── /app/api/           — API routes (server-side, use service role)
  └── components/         — Client components
        ↓
  Supabase
  ├── Auth (OTP, sessions, JWT)
  ├── PostgreSQL (with RLS policies)
  ├── Storage (avatars, files)
  └── Realtime (messages, notifications)
```

---

## 3. Key Architectural Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | No Express Backend | Vercel can't run persistent Node.js processes; serverless is correct model |
| 2 | Supabase Auth OTP (No Resend) | Built-in email OTP — no DNS/domain setup needed |
| 3 | Supabase Realtime for Chat/Notifications | No Socket.IO or separate WebSocket server |
| 4 | Row Level Security on All Tables | Users only read/write own data; admin bypasses via service role |
| 5 | Demo Wallet (Server Truth) | Balance in PostgreSQL; "Add BDT" button increments via API |

---

## 4. Security Model

| Layer | Implementation |
|---|---|
| Auth | Supabase JWT, HttpOnly cookies, auto-refresh |
| Route Protection | Next.js middleware checks Supabase session |
| Data Access | Row Level Security on all tables |
| Admin Operations | Service role key (server-side env only, never NEXT_PUBLIC_) |
| Input Validation | Zod schemas on all API route inputs |
| File Uploads | Supabase Storage with path-scoped policies |
| Rate Limiting | In-memory rate limit on auth routes (prototype) |
| CSRF | SameSite=Strict cookies via Supabase |
| Security Headers | next.config.mjs headers array |
| Mass Assignment | Allowlist pattern on all UPDATE operations |

**Critical:** Never use `user_metadata` for authorization — use `users` table fields (`is_admin`, `profile_complete`).

---

## 5. Real-Time Architecture

Supabase Realtime configured for:

| Table | Event | Filter | Action |
|---|---|---|---|
| `messages` | INSERT | `task_id=eq.{taskId}` | Append message to chat UI |
| `notifications` | INSERT | `user_id=eq.{userId}` | Increment badge, show toast |
| `tasks` | UPDATE | poster or worker filter | Refresh task status |
| `users` | UPDATE | `id=eq.{userId}` | Refresh balance, trust score |

Enable Realtime in Supabase Dashboard → Database → Replication for: `messages`, `notifications`, `tasks`, `users`, `applications`.

---

## 6. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...         ← NEXT_PUBLIC_ prefix!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...             ← NO NEXT_PUBLIC_ prefix!
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=true
```

**NOT needed:** RESEND_API_KEY, SMTP credentials, NEXT_PUBLIC_API_BASE_URL

---

## 7. OTP Flow (Supabase Native)

```
signUp() → Supabase sends OTP email automatically
verifyOtp({ email, token, type: 'signup' }) → Session created
resend({ type: 'signup', email }) → New OTP sent
```

---

*EduTask TRD | May 2026*
