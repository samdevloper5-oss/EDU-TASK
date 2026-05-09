# Phase 9 — System Testing & Safety Validation

## Scope
This phase validates behavior already implemented in Phases 4B–8 without changing schema or business logic.

## Test Layers
1. Unit tests
- `escrow.service`: release/refund success, idempotency, invalid states.
- `dispute.service`: admin resolution guards, auto-resolution guards, release type correctness.
- `expire_tasks.job`: automation disabled, dry-run, per-task failure containment.
- `idempotency.middleware`: first request pass, replay block.
- `rate_limit.middleware`: threshold pass, threshold breach `429`.

2. Integration tests (service-level with controlled mocks)
- Paid dispute flow: `disputed -> resolved` with escrow release.
- Paid dispute flow: `disputed -> resolved` with escrow refund.
- Auto-expire in-progress paid task with no submission.
- Idempotency replay on mutating route middleware path.

3. Concurrency and race tests
- Two admins attempt to resolve one dispute concurrently: one succeeds, one fails/no-op.
- Retry-safe escrow release/refund guards prevent duplicate settlement.
- Per-task job isolation: one task failure does not stop other task processing.

4. Invariant tests
- `escrows.release_type='dispute_resolution'` for dispute-driven settlement.
- No second resolution after terminal dispute state.
- No task exit from `disputed` without resolution path.
- Transaction helper rolls back on thrown error.

5. Failure-injection tests
- Simulated DB write failure during dispute resolution causes full rollback.
- Simulated crash/error inside transactional callback leaves no committed side effects.
- Job retry after partial candidate failure remains safe.

## Hard Stop Checkpoints
Phase 9 is accepted only when:
1. All automated tests pass.
2. Concurrency tests prove single-winner behavior for dispute resolution.
3. Rollback tests prove no partial state after injected failure.
4. Invariant tests prove release type and terminal-state guards.
5. Coverage run completes and highlights any untested critical branch.

## Out of Scope
1. Schema migrations.
2. Business-rule or state-transition changes.
3. New money paths, transaction types, or escrow semantics.
4. New automation jobs or behavior changes.
