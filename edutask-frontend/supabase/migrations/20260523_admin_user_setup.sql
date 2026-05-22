-- Set admin privileges for the admin user
-- This ensures the admin@edutask.bd user has full admin access
UPDATE public.users SET is_admin = true WHERE email = 'admin@edutask.bd';
