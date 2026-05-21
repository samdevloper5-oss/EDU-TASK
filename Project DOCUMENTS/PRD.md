# EduTask — Product Requirements Document (PRD)

> **Scope:** Fully functional prototype — not an MVP. Every core feature runs on real data with real logic. Wallet is demo-only. Supabase Auth handles OTP natively.

**Related docs:** [TRD](./TRD.md) · [User Flows](./USERs_Flow.md) · [UI/UX Brief](./UI_UX_Design_Brief.md) · [Backend Schema](./BACKEND_SCHEMA.md) · [Implementation Plan](./IMPLEMENTATION_PLAN.md)

---

## 1. Executive Product Overview

### What EduTask Is

EduTask is Bangladesh's first verified student-exclusive academic task marketplace. Students post academic and creative micro-tasks, hire other students to complete them, earn money, and build a verified reputation — all within an escrow-protected, identity-verified ecosystem.

### Why It Exists

**Problem A — Students need help:** Assignments, presentations, research papers, coding projects, design work. Currently solved via unverified Facebook groups, WhatsApp chats, or expensive professional freelancing platforms.

**Problem B — Students want to earn:** Skilled students have no structured, trustworthy local platform to monetize abilities among peers. International platforms (Fiverr, Upwork) are inaccessible without bank cards and foreign currency.

### Prototype Goal

Investors and expo judges should be able to:

1. Register as a student and get OTP-verified via Supabase Auth
2. Browse a real task marketplace with real filtering
3. Post a task and set a budget
4. Apply to a task with a proposal
5. Get hired, enter chat, and submit work
6. Release escrow payment (simulated)
7. Leave a review that updates the worker's trust score
8. See the leaderboard update in real time

---

## 2. Vision Statement

> EduTask transforms Bangladesh's student community into a trusted peer economy where academic skill becomes real income and every transaction is protected, verified, and reviewed.

---

## 3. User Personas

### Persona A — The Task Poster (Rahim, 3rd year BBA, BRAC University)
- Needs presentation design for business case assignment
- Has budget (BDT from family allowance)
- Wants verified students from real universities
- Pain: No trust, no recourse on Facebook/WhatsApp

### Persona B — The Task Worker (Priya, 2nd year CSE, NSU)
- Strong design and coding skills
- Wants to earn during semester
- Cannot use Fiverr (no international bank card)
- Pain: No local platform with portable reputation

### Persona C — The Admin
- Monitors off-platform payment attempts
- Resolves disputes
- Manages student ID verification queue
- Tracks platform revenue and growth

---

## 4. Feature Priority Matrix

### Tier 1 — MUST WORK (Core Demo Flows)

| Feature | Why Critical |
|---|---|
| Supabase Auth OTP signup/login | Entry point for all users |
| 3-step onboarding with student ID | Trust foundation |
| Task marketplace (browse, search, filter) | Core value proposition |
| Post task with escrow deposit simulation | Poster journey |
| Apply to task with proposal | Worker journey |
| Hire worker → task moves to in_progress | Escrow lock |
| Real-time chat per task (Supabase Realtime) | Communication layer |
| Submit work → accept → escrow release | Payment flow |
| Review system → trust score update | Reputation engine |
| Demo wallet (add/withdraw BDT via button) | Financial layer |
| Trust score display and calculation | Reputation display |
| Leaderboard (real data, real rankings) | Engagement/gamification |
| Real-time notification system | Engagement layer |
| Mobile responsive + bottom nav | Expo demo on phones |

### Tier 2 — SHOULD WORK (Polish)

| Feature | Notes |
|---|---|
| Student ID upload and admin verification | Image upload to Supabase Storage |
| Revision request flow (max 2 per task) | Task quality management |
| Dispute opening (admin resolves) | Trust protection |
| Admin dashboard (stats, user list, dispute queue) | Operational |
| Profile photo upload | UX polish |
| Typing indicators in chat | Real-time UX |

### Tier 3 — NICE TO HAVE (Post-Funding)

| Feature | Notes |
|---|---|
| Real bKash/Nagad API | PSP license required |
| AI off-platform payment detection | NLP on chat messages |
| PWA install prompt | Android home screen |
| University email domain verification | Automatic verification |

---

## 5. Business Rules

### Task Rules
- Minimum budget: 200 BDT
- Maximum budget: 50,000 BDT
- Categories: Design, Coding, Research, Writing, Data Entry, Translation, Media, Academic Help, Other
- Maximum revisions: 2 per task
- Auto-release: If poster does not respond 72 hours after work submission, escrow auto-releases to worker
- A poster cannot apply to their own task

### Fee Structure
- Platform fee: 8% of task budget
- Charged to worker at escrow release (not to poster)
- Minimum payout: 100 BDT after fee
- Platform earns from the spread

### Trust Score Rules
- Starting score: 20 points (on registration)
- +10 on 5-star review | +8 on 4-star | +6 on 3-star | +4 on 2-star | +2 on 1-star
- +3 on task completion bonus (with every review)
- -15 on dispute lost | -20 on confirmed off-platform payment attempt
- Range: 0–100

### OTP Rules (Supabase Auth Native)
- 6-digit OTP via Supabase Auth built-in email OTP
- Expires: 10 minutes (Supabase default)
- Max attempts: 5 before lockout
- Resend cooldown: 60 seconds

---

## 6. Success Metrics (Prototype)

| Metric | Target for Expo |
|---|---|
| Time from landing to registered | < 2 minutes |
| Complete task flow (post → apply → hire → complete) | < 5 minutes with demo data |
| Page load time | < 2 seconds on 4G |
| Mobile usability | Full feature parity at 375px |
| Demo bugs during live pitch | 0 critical bugs |

---

*EduTask — Bangladesh Student Task Marketplace | May 2026*
