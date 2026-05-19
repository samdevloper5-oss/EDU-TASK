-- EduTask full schema bootstrap (PRD)
-- Run in Supabase SQL Editor on project pxktjtedpgolzjagkpob

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Migrate legacy column names if present
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name') THEN
    ALTER TABLE public.users RENAME COLUMN name TO full_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='university') THEN
    ALTER TABLE public.users RENAME COLUMN university TO university_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='student_id') THEN
    ALTER TABLE public.users RENAME COLUMN student_id TO student_id_text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  university_name TEXT NOT NULL DEFAULT 'Pending',
  department TEXT NOT NULL DEFAULT 'Pending',
  student_id_text TEXT NOT NULL DEFAULT 'Pending',
  student_id_image_url TEXT,
  student_id_verified BOOLEAN NOT NULL DEFAULT FALSE,
  profile_photo_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  skills TEXT[] NOT NULL DEFAULT '{}',
  wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0),
  escrow_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (escrow_balance >= 0),
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  trust_score INTEGER NOT NULL DEFAULT 20 CHECK (trust_score >= 0 AND trust_score <= 100),
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT NULL,
  response_rate INTEGER NOT NULL DEFAULT 100,
  referral_code TEXT UNIQUE DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  referred_by TEXT,
  bkash_number TEXT,
  nagad_number TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ban_reason TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, email_verified)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.email_confirmed_at IS NOT NULL), FALSE)
  )
  ON CONFLICT (id) DO UPDATE SET
    email_verified = COALESCE((NEW.email_confirmed_at IS NOT NULL), FALSE),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_public_read" ON public.users;
DROP POLICY IF EXISTS "users_own_update" ON public.users;
DROP POLICY IF EXISTS "users_trigger_insert" ON public.users;
CREATE POLICY "users_public_read" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_own_update" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_trigger_insert" ON public.users FOR INSERT WITH CHECK (true);

-- Enums
DO $$ BEGIN
  CREATE TYPE task_category AS ENUM ('Design','Coding','Research','Writing','Data Entry','Translation','Media','Academic Help','Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE task_mode AS ENUM ('online','offline');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE task_type AS ENUM ('paid','volunteer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('open','hired','in_progress','under_review','completed','cancelled','disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending','accepted','rejected','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('text','file','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('deposit','withdrawal','escrow_lock','escrow_release','earning','platform_fee','refund','referral_bonus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('bkash','nagad','demo','wallet');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending','completed','failed','reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('task_applied','task_hired','task_submitted','task_accepted','task_revision','task_disputed','task_resolved','escrow_locked','escrow_released','review_received','message','id_verified','id_rejected','leaderboard','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  poster_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 10 AND 100),
  description TEXT NOT NULL CHECK (length(description) >= 30),
  category task_category NOT NULL,
  task_mode task_mode NOT NULL DEFAULT 'online',
  task_type task_type NOT NULL DEFAULT 'paid',
  budget NUMERIC(10,2) NOT NULL CHECK (budget >= 200),
  deadline TIMESTAMPTZ NOT NULL,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  location TEXT,
  attachment_urls TEXT[] DEFAULT '{}',
  status task_status NOT NULL DEFAULT 'open',
  hired_worker_id UUID REFERENCES public.users(id),
  escrow_deposited BOOLEAN NOT NULL DEFAULT FALSE,
  revisions_used INTEGER NOT NULL DEFAULT 0 CHECK (revisions_used <= 2),
  applicant_count INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  auto_release_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  proposal TEXT NOT NULL CHECK (length(proposal) BETWEEN 20 AND 2000),
  estimated_hours NUMERIC(5,1),
  status application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, worker_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 5000),
  message_type message_type NOT NULL DEFAULT 'text',
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  is_system_message BOOLEAN NOT NULL DEFAULT FALSE,
  read_by UUID[] NOT NULL DEFAULT '{}',
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_amount NUMERIC(12,2) NOT NULL,
  method payment_method,
  status transaction_status NOT NULL DEFAULT 'completed',
  reference_id UUID,
  counterparty_id UUID REFERENCES public.users(id),
  external_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  reviewed_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL CHECK (length(comment) BETWEEN 10 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  reference_id UUID,
  actor_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_earnings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  task_budget NUMERIC(12,2) NOT NULL,
  fee_rate NUMERIC(4,3) NOT NULL DEFAULT 0.08,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers
CREATE OR REPLACE FUNCTION public.increment_applicant_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tasks SET applicant_count = applicant_count + 1 WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_application_insert ON public.applications;
CREATE TRIGGER on_application_insert AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.increment_applicant_count();

CREATE OR REPLACE FUNCTION public.update_trust_on_review()
RETURNS TRIGGER AS $$
DECLARE score_delta INTEGER;
BEGIN
  score_delta := CASE NEW.rating WHEN 5 THEN 10 WHEN 4 THEN 8 WHEN 3 THEN 6 WHEN 2 THEN 4 WHEN 1 THEN 2 ELSE 0 END;
  UPDATE public.users SET
    trust_score = LEAST(100, trust_score + score_delta + 3),
    completed_tasks = completed_tasks + 1,
    total_reviews = total_reviews + 1,
    average_rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE reviewed_id = NEW.reviewed_id),
    updated_at = NOW()
  WHERE id = NEW.reviewed_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_insert ON public.reviews;
CREATE TRIGGER on_review_insert AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_trust_on_review();

-- RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_read_all" ON public.tasks;
CREATE POLICY "tasks_read_all" ON public.tasks FOR SELECT USING (true);
DROP POLICY IF EXISTS "tasks_insert_auth" ON public.tasks;
CREATE POLICY "tasks_insert_auth" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = poster_id);
DROP POLICY IF EXISTS "tasks_update_participants" ON public.tasks;
CREATE POLICY "tasks_update_participants" ON public.tasks FOR UPDATE USING (auth.uid() = poster_id OR auth.uid() = hired_worker_id);

DROP POLICY IF EXISTS "applications_select" ON public.applications;
CREATE POLICY "applications_select" ON public.applications FOR SELECT
  USING (auth.uid() = worker_id OR auth.uid() IN (SELECT poster_id FROM public.tasks WHERE id = task_id));
DROP POLICY IF EXISTS "applications_insert_worker" ON public.applications;
CREATE POLICY "applications_insert_worker" ON public.applications FOR INSERT WITH CHECK (auth.uid() = worker_id);
DROP POLICY IF EXISTS "applications_update" ON public.applications;
CREATE POLICY "applications_update" ON public.applications FOR UPDATE
  USING (auth.uid() = worker_id OR auth.uid() IN (SELECT poster_id FROM public.tasks WHERE id = task_id));

DROP POLICY IF EXISTS "messages_task_participants_select" ON public.messages;
CREATE POLICY "messages_task_participants_select" ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() IN (
    SELECT poster_id FROM public.tasks WHERE id = task_id
    UNION SELECT hired_worker_id FROM public.tasks WHERE id = task_id AND hired_worker_id IS NOT NULL));
DROP POLICY IF EXISTS "messages_task_participants_insert" ON public.messages;
CREATE POLICY "messages_task_participants_insert" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND (is_system_message = TRUE OR auth.uid() IN (
    SELECT poster_id FROM public.tasks WHERE id = task_id
    UNION SELECT hired_worker_id FROM public.tasks WHERE id = task_id AND hired_worker_id IS NOT NULL)));

DROP POLICY IF EXISTS "transactions_own_read" ON public.transactions;
CREATE POLICY "transactions_own_read" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_public_read" ON public.reviews;
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "reviews_insert_completed_task" ON public.reviews;
CREATE POLICY "reviews_insert_completed_task" ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id AND auth.uid() IN (
    SELECT poster_id FROM public.tasks WHERE id = task_id AND status = 'completed'
    UNION SELECT hired_worker_id FROM public.tasks WHERE id = task_id AND status = 'completed'));

DROP POLICY IF EXISTS "notifications_own_all" ON public.notifications;
CREATE POLICY "notifications_own_all" ON public.notifications FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "platform_earnings_admin_only" ON public.platform_earnings;
CREATE POLICY "platform_earnings_admin_only" ON public.platform_earnings FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('student-ids', 'student-ids', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('task-files', 'task-files', false) ON CONFLICT DO NOTHING;

-- Realtime: enable in Dashboard → Database → Replication for:
-- messages, notifications, tasks, users, applications
