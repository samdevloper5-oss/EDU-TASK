## Phase 8 Design Summary (Hardening Only)

Phase 8 introduces safety, abuse‑prevention, and resilience without changing business logic, money flow, or automation rules. All changes are backward‑compatible and removable via config flags.

---

## Threat Model

**Primary Risks**
- Abuse (spam, replay, brute force)
- Overload (bursty traffic)
- Data leakage through errors
- Operational blind spots (no request correlation)

**Protected Assets**
- Dispute and admin resolution integrity
- Escrow and wallet ledger invariants
- User privacy and system stability

---

## Attack Vectors Addressed

- Rapid dispute creation spam
- Replay of admin actions
- Oversized payload abuse
- Unauthorized access to admin endpoints
- Unbounded request bursts
- Silent failures without traceability

---

## What Is Intentionally NOT Solved

- CAPTCHA, WAF, or ML‑based fraud detection
- External payment abuse detection
- Schema‑level protections beyond existing constraints
- Background job reliability changes

---

## Implementation (Hardening Only)

### 8A — Rate Limiting (API Safety)
- Middleware‑based rate limiting with per‑IP + per‑user keys
- Fail closed with 429
- Configurable via `ENABLE_RATE_LIMITS`

### 8B — Input & Payload Hard Limits
- JSON and URL‑encoded body size caps
- Max text length checks at controller boundaries

### 8C — Abuse & Replay Protection
- Optional idempotency middleware (`ENABLE_IDEMPOTENCY`)
- Replay detection returns 409

### 8D — Permission & Role Enforcement
- Explicit `requireAuth` and `requireRole` on admin endpoints
- No implicit trust in request payloads

### 8E — Safe Error Handling
- No stack traces in production responses
- Consistent error payload shape

### 8F — Operational Observability
- Request IDs on all responses
- Slow query warnings
- Rate limit hit visibility

---

## Verification Checklist

**Rate Limits**
- Burst requests to dispute/admin endpoints return 429

**Replay Protection**
- Repeat same idempotency key returns 409

**Permission Enforcement**
- Admin endpoints reject non‑admin roles

**Error Handling**
- Production responses hide stack traces

---

## Rollback Safety

All protections are gated by env flags and can be disabled without code changes:
- `ENABLE_RATE_LIMITS`
- `ENABLE_IDEMPOTENCY`
