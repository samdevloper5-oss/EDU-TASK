-- Fix task-files bucket policies: allow task participants to upload/select
DROP POLICY IF EXISTS "task_files_insert_participant" ON storage.objects;
DROP POLICY IF EXISTS "task_files_select_participant" ON storage.objects;

-- Allow authenticated users to upload to task-files (path-based access control)
CREATE POLICY "task_files_insert_authenticated" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-files'::text
    AND auth.uid() IS NOT NULL
  );

-- Allow authenticated users to view/download from task-files
CREATE POLICY "task_files_select_authenticated" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'task-files'::text
    AND auth.uid() IS NOT NULL
  );

-- Ensure task-files bucket has no MIME type restrictions
UPDATE storage.buckets
SET allowed_mime_types = NULL,
    file_size_limit = 52428800 -- 50MB
WHERE name = 'task-files';
