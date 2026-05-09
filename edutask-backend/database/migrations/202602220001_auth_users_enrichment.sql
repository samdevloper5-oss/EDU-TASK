-- Enrich users table for full auth profile payload.
-- Safe to run multiple times.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS university_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users u
SET
  full_name = COALESCE(u.full_name, p.full_name, 'Unknown Student'),
  university_name = COALESCE(u.university_name, p.institution, 'Unknown University'),
  department = COALESCE(u.department, p.department, 'Unknown Department')
FROM profiles p
WHERE p.user_id = u.id;

UPDATE users
SET
  full_name = COALESCE(full_name, 'Unknown Student'),
  university_name = COALESCE(university_name, 'Unknown University'),
  department = COALESCE(department, 'Unknown Department'),
  student_id = COALESCE(student_id, CONCAT('LEGACY-', REPLACE(id::text, '-', ''))),
  location = COALESCE(location, 'Unknown Location'),
  skills = COALESCE(skills, '[]'::jsonb),
  password_hash = COALESCE(
    password_hash,
    '$2b$12$B1hyjYb2nPtvA4S2KfBKAOnOWK61Pj8FTfGYzOq8mSjB3WzV1xQnW'
  );

WITH missing_phone AS (
  SELECT id, CONCAT('9', LPAD(ROW_NUMBER() OVER (ORDER BY id)::text, 10, '0')) AS generated_phone
  FROM users
  WHERE phone IS NULL
)
UPDATE users u
SET phone = mp.generated_phone
FROM missing_phone mp
WHERE u.id = mp.id;

ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN university_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN department SET NOT NULL;
ALTER TABLE users ALTER COLUMN student_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
ALTER TABLE users ALTER COLUMN location SET NOT NULL;
ALTER TABLE users ALTER COLUMN skills SET DEFAULT '[]'::jsonb;
ALTER TABLE users ALTER COLUMN skills SET NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_skills_array'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_skills_array CHECK (jsonb_typeof(skills) = 'array');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_phone_key'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_phone_key UNIQUE (phone);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_student_id_key'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_student_id_key UNIQUE (student_id);
  END IF;
END $$;

COMMIT;
