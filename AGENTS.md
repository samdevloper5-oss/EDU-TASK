# EduTask — Agent Guide

## Stack
Next.js 16, TailwindCSS v4, shadcn/ui (new-york), Supabase SSR, TanStack Query v5, Zustand v5, React Hook Form + Zod.

## Architecture
- All DB access via Supabase (anon key on client, service role in API routes via `@/lib/supabase/admin`)
- Express backend (`edutask-backend/`) exists but is **NOT used** in prototype
- Route groups: `(auth)` (no wrapper), `(dashboard)` (sidebar + auth guard), `(admin)` (admin sidebar + guard)
- Supabase CLI project root: `edutask-frontend/`

## Design System
Design tokens are in `app/globals.css` — **do not override CSS variables inline without approval**.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#F8F8F7` | Page background |
| `--color-surface` | `#FFFFFF` | Cards/surfaces |
| `--color-primary` | `#4F46E5` | Buttons, links, accents |
| `--color-border` | `#E5E5E3` | Borders |
| `--color-text` | `#0F0F0F` | Body text |
| `--color-muted` | `#6B6B6B` | Secondary text |
| `--color-subtle` | `#A3A3A3` | Placeholder/labels |

Fonts: DM Sans (body via `font-sans`), Sora (headings via `font-heading` via `style={{ fontFamily: 'var(--font-heading)' }}`), JetBrains Mono (mono via `font-mono`).

Utility classes defined in globals.css: `.text-display`, `.text-heading`, `.text-label`, `.card`, `.btn-primary`, `.btn-ghost`, `.input`, `.page-enter`, `.animate-fade-up`, `.stagger-1` through `.stagger-6`.

Gradient accent pattern uses `bg-gradient-to-br from-primary/10 to-indigo-50` or similar. Card hover uses `hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300`.

## Key Commands

```bash
npm run dev                        # Starts both frontend + backend concurrently
npm --prefix edutask-frontend run dev   # Frontend only on :3000
npm --prefix edutask-frontend run build # Next.js build
npm --prefix edutask-frontend run lint  # ESLint
npm run test                       # Backend tests
```

## Import Paths
| Path | Module |
|------|--------|
| `@/utils/supabase/client` | Browser Supabase client |
| `@/utils/supabase/server` | Server Supabase client (SSR) |
| `@/lib/supabase/admin` | Service-role Supabase client (**server only**) |
| `@/lib/store/auth.store` | Zustand auth store |
| `@/lib/hooks/use-auth` | Auth hook (hydrates store from Supabase) |
| `@/lib/validations/*.schema` | Zod schemas for forms/API |
| `@/lib/queries/*` | TanStack Query wrappers |
| `@/lib/api-route` | `apiOk()`, `apiErr()`, `parseJsonBody()`, `parsePagination()` |
| `@/lib/utils` | `cn()`, `formatBDT()`, `truncate()`, `getDeadlineInfo()`, `sanitizeText()` |
| `@/types` | `User`, `Task`, `Application`, `Transaction`, `Message`, `Review`, `Notification`, `Database` |
| `@/components/ui/*` | shadcn/ui components (57 components) |

## API Conventions
- Response shape: `{ success: true, data }` or `{ success: false, error }`
- Helpers: `apiOk(data)`, `apiErr(msg, status)` in `@/lib/api-route`
- Pagination: `parsePagination(searchParams)` returns `{ page, limit, from, to }`
- Route params: `[GET/POST/PUT/DELETE]` handlers in `app/api/{resource}/route.ts`

## Supabase
- **Project ref:** `lahfflahtbmgckochhex` (EDU-TAKS)
- **Auth:** email OTP (6-digit, 3600s expiry)
- **Admin user:** `admin@edutask.bd` (is_admin=true, email_verified=true, profile_complete=true)
- **Storage buckets:** `avatars` (public), `student-ids` (private), `task-files` (private)
- **RLS on ALL tables** — never bypass with service_role from client
- **Auth from `users` table**, never from `user_metadata`
- **Realtime tables:** `messages`, `notifications`, `tasks`, `users`, `applications`
- **Migrations:** `edutask-frontend/supabase/migrations/20260519_full_schema_bootstrap.sql`
- `supabase/` dir is inside `edutask-frontend/`, not root

## Validation (Zod)
- `registerSchema`: password (min 8, uppercase + number)
- `completeProfileSchema`: phone (`01[3-9]XXXXXXXX`), skills array (min 1)
- `createTaskSchema`: budget 200–50000 BDT, title 10–100 chars, description 30+ chars
- `depositSchema`: amount 100–10000, method `bkash|nagad|demo`
- `withdrawSchema`: method `bkash|nagad`, phone `01[3-9]XXXXXXXX`
- `sendMessageSchema`: content max 5000 chars

## Vercel Deploy
```bash
cd edutask-frontend
vercel --prod --yes
```
**Project:** `edu-task` (`prj_cZj9BBZ51OQOE013UJeJM9447ghO`). Deploy from `edutask-frontend/`. URL: https://edu-task-gamma.vercel.app

### Required Vercel Env Vars
```
NEXT_PUBLIC_SUPABASE_URL=https://lahfflahtbmgckochhex.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
NEXT_PUBLIC_APP_URL=https://edu-task-gamma.vercel.app
NEXT_PUBLIC_DEMO_MODE=true
```

## Gotchas
- `@/lib/app-context.tsx` contains **legacy mock data** context — do not extend; use real Supabase + Zustand instead
- `styles/globals.css` is stale — the real CSS is `app/globals.css`
- Tailwind v4 uses `@import 'tailwindcss'` + `@theme` block, not v3 `@tailwind` directives or `tailwind.config`
- `postcss.config.mjs` uses `@tailwindcss/postcss` plugin (Tailwind v4 PostCSS plugin)
- Animations via `tw-animate-css` + custom `@keyframes` in globals.css
- Two Vercel projects exist: `edu-task` (active) and `edutask.bd` (old, custom domain not resolving)
- `.vercel` dirs in both root and `edutask-frontend/` — always deploy from `edutask-frontend/`
