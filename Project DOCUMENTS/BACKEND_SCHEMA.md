# EduTask — Backend Architecture & Schema

**Related docs:** [TRD](./TRD.md) · [Implementation Plan](./IMPLEMENTATION_PLAN.md)

Run all SQL in Supabase SQL Editor. Order matters.

---

## Schema 001 — Extensions & Auth Trigger

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT UNIQUE,
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

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_public_read" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_own_update" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_trigger_insert" ON public.users FOR INSERT WITH CHECK (true);
```

---

## Schema 002 — Tasks

```sql
CREATE TYPE task_category AS ENUM (
  'Design', 'Coding', 'Research', 'Writing', 'Data Entry',
  'Translation', 'Media', 'Academic Help', 'Other'
);
CREATE TYPE task_mode AS ENUM ('online', 'offline');
CREATE TYPE task_type AS ENUM ('paid', 'volunteer');
CREATE TYPE task_status AS ENUM (
  'open', 'hired', 'in_progress', 'under_review',
  'completed', 'cancelled', 'disputed'
);

CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  poster_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 10 AND 100),
  description TEXT NOT NULL CHECK (length(description) >= 30),
  category task_category NOT NULL,
  task_mode task_mode NOT NULL DEFAULT 'online',
  task_type task_type NOT NULL DEFAULT 'paid',
  budget NUMERIC(10,2) NOT NULL CHECK (budget >= 200),
  deadline TIMESTAMPTZ NOT NULL CHECK (deadline > NOW()),
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

CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_category ON public.tasks(category);
CREATE INDEX idx_tasks_poster_id ON public.tasks(poster_id);
CREATE INDEX idx_tasks_hired_worker_id ON public.tasks(hired_worker_id);
CREATE INDEX idx_tasks_deadline ON public.tasks(deadline);
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at DESC);

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_read_all" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "tasks_insert_auth" ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = poster_id AND auth.uid() IS NOT NULL);
CREATE POLICY "tasks_update_participants" ON public.tasks FOR UPDATE
  USING (auth.uid() = poster_id OR auth.uid() = hired_worker_id);
```

---

## Schema 003 — Applications

```sql
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

CREATE TABLE public.applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  proposal TEXT NOT NULL CHECK (length(proposal) BETWEEN 20 AND 2000),
  estimated_hours NUMERIC(5,1),
  status application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, worker_id)
);

CREATE INDEX idx_applications_task_id ON public.applications(task_id);
CREATE INDEX idx_applications_worker_id ON public.applications(worker_id);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_select" ON public.applications FOR SELECT
  USING (auth.uid() = worker_id OR auth.uid() IN (SELECT poster_id FROM public.tasks WHERE id = task_id));
CREATE POLICY "applications_insert_worker" ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = worker_id AND auth.uid() IS NOT NULL);
CREATE POLICY "applications_update" ON public.applications FOR UPDATE
  USING (auth.uid() = worker_id OR auth.uid() IN (SELECT poster_id FROM public.tasks WHERE id = task_id));

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
```

---

## Schema 004 — Messages

```sql
CREATE TYPE message_type AS ENUM ('text', 'file', 'system');

CREATE TABLE public.messages (
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

CREATE INDEX idx_messages_task_id ON public.messages(task_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_task_participants_select" ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() IN (
    SELECT poster_id FROM public.tasks WHERE id = task_id
    UNION SELECT hired_worker_id FROM public.tasks WHERE id = task_id AND hired_worker_id IS NOT NULL
  ));
CREATE POLICY "messages_task_participants_insert" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND (
    is_system_message = TRUE OR auth.uid() IN (
      SELECT poster_id FROM public.tasks WHERE id = task_id
      UNION SELECT hired_worker_id FROM public.tasks WHERE id = task_id AND hired_worker_id IS NOT NULL
    )
  ));
```

---

## Schema 005 — Transactions

```sql
CREATE TYPE transaction_type AS ENUM (
  'deposit', 'withdrawal', 'escrow_lock', 'escrow_release',
  'earning', 'platform_fee', 'refund', 'referral_bonus'
);
CREATE TYPE payment_method AS ENUM ('bkash', 'nagad', 'demo', 'wallet');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');

CREATE TABLE public.transactions (
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

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_own_read" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
-- INSERT only via service role (no client INSERT policy)
```

---

## Schema 006 — Reviews

```sql
CREATE TABLE public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  reviewed_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL CHECK (length(comment) BETWEEN 10 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, reviewer_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_completed_task" ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id AND auth.uid() IN (
    SELECT poster_id FROM public.tasks WHERE id = task_id AND status = 'completed'
    UNION SELECT hired_worker_id FROM public.tasks WHERE id = task_id AND status = 'completed'
  ));

CREATE OR REPLACE FUNCTION public.update_trust_on_review()
RETURNS TRIGGER AS $$
DECLARE score_delta INTEGER;
BEGIN
  score_delta := CASE NEW.rating
    WHEN 5 THEN 10 WHEN 4 THEN 8 WHEN 3 THEN 6 WHEN 2 THEN 4 WHEN 1 THEN 2 ELSE 0 END;
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

CREATE TRIGGER on_review_insert AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_trust_on_review();
```

---

## Schema 007 — Notifications

```sql
CREATE TYPE notification_type AS ENUM (
  'task_applied', 'task_hired', 'task_submitted', 'task_accepted',
  'task_revision', 'task_disputed', 'task_resolved', 'escrow_locked',
  'escrow_released', 'review_received', 'message', 'id_verified',
  'id_rejected', 'leaderboard', 'system'
);

CREATE TABLE public.notifications (
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

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own_all" ON public.notifications FOR ALL USING (auth.uid() = user_id);
```

---

## Schema 008 — Platform Earnings

```sql
CREATE TABLE public.platform_earnings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  task_budget NUMERIC(12,2) NOT NULL,
  fee_rate NUMERIC(4,3) NOT NULL DEFAULT 0.08,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_earnings_admin_only" ON public.platform_earnings FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));
```

---

## Storage Buckets

| Bucket | Public | Purpose |
|---|---|---|
| `avatars` | YES | Profile photos |
| `student-ids` | NO | Student ID card photos |
| `task-files` | NO | Task attachment files |

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('student-ids', 'student-ids', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('task-files', 'task-files', false) ON CONFLICT DO NOTHING;

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_user_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "student_ids_own_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'student-ids' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "student_ids_own_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'student-ids' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "task_files_auth_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "task_files_auth_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'task-files' AND auth.uid() IS NOT NULL);
```

---

## Realtime Setup

Enable replication for: `messages`, `notifications`, `tasks`, `users`, `applications`

---

*EduTask Backend Schema | May 2026*
