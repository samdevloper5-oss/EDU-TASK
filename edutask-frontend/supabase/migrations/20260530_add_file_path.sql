-- Add file_path column to messages table for signed URL downloads
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_path TEXT;
