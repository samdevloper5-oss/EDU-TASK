# EduTask — UI/UX Design Brief

**Related docs:** [PRD](./PRD.md) · [User Flows](./USERs_Flow.md)

---

## 1. Design Direction

**Aesthetic:** Refined, trustworthy SaaS — modern fintech tool (Mercury bank / Linear app) adapted for young Bangladeshi students. Clean lines, generous whitespace, confident typography.

**Tone:** Professional but approachable. Serious (real money, real academic work) but made for 18–25-year-olds.

**Differentiation:** More trustworthy and polished than any existing Bangladeshi freelancing tool. First impression: verification, security, seriousness.

---

## 2. Visual Identity

| Token | Value | Usage |
|---|---|---|
| Primary | `#4F46E5` (Indigo) | CTAs, active states, badges |
| Success | `#10B981` | Escrow released, completed, verified |
| Warning | `#F59E0B` | Pending review, escrow held |
| Danger | `#EF4444` | Disputes, bans, overdue |
| Background | `#F9FAFB` | Page background |
| Card | `#FFFFFF` | Card surfaces |
| Border | `#E5E7EB` | Borders |
| Text primary | `#111827` | Headings, body |
| Text secondary | `#6B7280` | Labels, meta |

**Dark mode:** Full support via `next-themes`. All colors via CSS variables.

---

## 3. Typography

| Role | Font | Usage |
|---|---|---|
| Headings | Sora (Google Fonts) | Display, hero, large stats |
| Body | DM Sans (Google Fonts) | UI text, labels, body |
| Monospace | JetBrains Mono | Trust score, wallet balance, OTP |

**Scale:** Display 48px/800 · H1 32px/700 · H2 24px/600 · Body 15px/400 · Small 13px · Label 12px uppercase

---

## 4. Component System

**Cards:** 12px radius, 1px border `#E5E7EB`, subtle shadow `0 1px 3px rgba(0,0,0,0.06)`

**Buttons:**
- Primary: Indigo fill, white text, 8px radius, 44px height
- Secondary: White fill, indigo border
- Ghost: No border, dimmed text
- Destructive: Red fill

**Inputs:** 44px height, 8px radius, focus ring 2px indigo

**Status Badges:**
- Open: Blue | Hired: Amber | In Progress: Green | Under Review: Orange | Completed: Dark green | Disputed: Red

**Trust Score Ring:** Circular progress. Green 70+, amber 40–70, red below 40.

---

## 5. Layout System

- Sidebar: 240px fixed, collapsible on mobile
- Content max width: 1200px
- Card grid: 3 col desktop, 2 tablet, 1 mobile
- Chat: Full height, two-pane desktop, single pane mobile

---

## 6. Animation & Motion

- Page transitions: opacity 0.15s
- Modal: scale 0.97→1, 150ms
- Trust score ring: 600ms cubic-bezier fill
- Toast: Sonner slide-in bottom-right
- Wallet balance: counter increment 300ms

**No:** Parallax, particles, long loading sequences.

---

## 7. Responsive Strategy

| Breakpoint | Layout |
|---|---|
| Desktop 1280px+ | Full sidebar + top bar, 3-col grid, side-by-side chat |
| Tablet 768–1279px | Icon-only sidebar, 2-col grid |
| Mobile <768px | Bottom nav (5 tabs), single column, full-screen chat |

**Mobile bottom nav tabs:** Home · Tasks · Post (center, primary) · Chat · Profile

**Touch targets:** Minimum 44×44px.

---

## 8. Landing Page Structure

1. **Navbar** — Logo | About | Features | How It Works | Sign In | Get Started
2. **Hero** — "Bangladesh's Student Task Marketplace" + CTA
3. **Trust Bar** — Verified Students | Escrow Protected | Real-time Chat | Trust Score
4. **Stats** — Count-up: 1,200+ Students | 350+ Tasks | 98% Satisfaction
5. **How It Works** — 3 steps with icons
6. **Feature Grid** — 6 cards
7. **Task Preview** — 4 real tasks from DB
8. **Leaderboard Preview** — Top 5 workers
9. **Testimonials** — 3 demo testimonials
10. **Footer** — Links, social, copyright

---

*EduTask UI/UX Brief | May 2026*
