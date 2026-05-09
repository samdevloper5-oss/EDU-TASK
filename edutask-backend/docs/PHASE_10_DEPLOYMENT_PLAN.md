# Phase 10 — CI/CD & Deployment Hardening

## Objective
Harden deployment and operations safety without changing business logic, money flow, schema, or automation behavior.

## 1. CI Pipeline
The CI workflow is defined in `.github/workflows/ci.yml`.

Checks:
1. Dependency install (`npm install`)
2. Static syntax lint (`npm run lint`)
3. Test suite (`npm run test`)
4. Coverage run (`npm run test:coverage`)
5. Coverage gate with configurable threshold (`COVERAGE_MIN_LINES`)

Failure policy:
1. Any failed step blocks merge/deploy.
2. Coverage below threshold blocks merge/deploy.

## 2. Environment Segregation
Config is validated in `src/config/env.js` with fail-fast behavior.

Validated environments:
1. `development`
2. `test`
3. `staging`
4. `production`

No startup is allowed with missing or malformed required variables.

## 3. Secret Handling
Rules:
1. Secrets are never stored in repository files.
2. `.env.example` documents required variables only.
3. Production secrets must be injected by deployment platform/CI secrets store.

## 4. Health Check Contract
Endpoint:
1. `GET /health`

Returns read-only operational state:
1. Service status
2. Environment
3. Uptime
4. Version
5. DB connectivity probe result
6. Request correlation ID

## 5. Graceful Shutdown
Shutdown behavior in `src/server.js`:
1. Handle `SIGTERM`/`SIGINT`
2. Stop accepting new requests
3. Allow in-flight requests to finish
4. Close DB pool
5. Exit cleanly with explicit logging

## 6. Production Logging
Structured JSON logging in `src/config/logger.js`:
1. Log levels controlled by env (`LOG_LEVEL`)
2. Request failures log `request_id` for correlation
3. Rate-limit hits are logged
4. Slow DB queries are logged
5. Error responses avoid stack traces in production

## 7. Deployment Strategy
Recommended production flow:
1. Deploy with automation flags explicitly configured
2. Keep jobs controlled by env toggles (`ENABLE_AUTOMATION`, `AUTOMATION_DRY_RUN`)
3. Use rolling deployment to avoid full downtime
4. Roll back by redeploying previous artifact + previous env set

Rollback safety:
1. No schema migration dependency in this phase
2. No business behavior change in this phase
3. Reverting deployment artifact is sufficient

## 8. Release Freeze Protocol
Before release:
1. CI must pass fully.
2. Coverage must meet threshold.
3. Env vars must validate in target environment.
4. Health endpoint must return healthy.

After release:
1. Watch structured logs for rate-limit spikes, request failures, and slow queries.
2. If critical errors appear, execute rollback flow immediately.
