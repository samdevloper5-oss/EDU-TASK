-- ============================================================
-- Storage Object RLS Policies for EduTask
-- ============================================================

-- avatars bucket (public profile photos)
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- task-files bucket (work submissions)
CREATE POLICY "task_files_insert_participant"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "task_files_select_participant"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'task-files'
    AND auth.uid() IS NOT NULL
  );

-- student-ids bucket (private, admin only)
CREATE POLICY "student_ids_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student-ids'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "student_ids_select_admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'student-ids'
    AND auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true)
  );
