-- schema_v2_backfill_cleanup.sql
-- Pre-validation cleanup for v2 constraints and enums.

BEGIN;

UPDATE escrows
SET status = CASE
  WHEN released_at IS NULL THEN 'locked'::escrow_status
  WHEN release_type::text = 'refund' THEN 'refunded'::escrow_status
  ELSE 'released'::escrow_status
END
WHERE status IS NULL
   OR (status = 'locked' AND released_at IS NOT NULL);

UPDATE profiles
SET verification_status = 'unverified'::profile_verification_status
WHERE verification_status::text NOT IN ('unverified','pending','verified','rejected');

UPDATE submissions
SET submission_content = '[AUTO-FIXED] empty submission content'
WHERE submission_content IS NULL OR LENGTH(TRIM(submission_content)) = 0;

UPDATE tasks
SET completed_at = COALESCE(completed_at, NOW())
WHERE status = 'completed' AND completed_at IS NULL;

UPDATE tasks
SET cancelled_at = COALESCE(cancelled_at, NOW())
WHERE status = 'cancelled' AND cancelled_at IS NULL;

UPDATE disputes
SET resolved_at = COALESCE(resolved_at, NOW())
WHERE status IN ('resolved','auto_resolved') AND resolved_at IS NULL;

COMMIT;
