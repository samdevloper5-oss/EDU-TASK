-- EDUTASK PostgreSQL Database Schema
-- Version: 1.0
-- Created: 2024

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for hashing (if needed for future password storage)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User roles
CREATE TYPE user_role AS ENUM ('student', 'admin');

-- Trust tiers for students
CREATE TYPE trust_tier AS ENUM ('basic', 'verified', 'trusted');

-- Task types
CREATE TYPE task_type AS ENUM ('paid', 'volunteer');

-- Task states
CREATE TYPE task_status AS ENUM (
    'draft',
    'published',
    'application_open',
    'executor_selected',
    'in_progress',
    'under_review',
    'completed',
    'cancelled',
    'disputed'
);

-- Application status
CREATE TYPE application_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'withdrawn'
);

-- Transaction types
CREATE TYPE transaction_type AS ENUM (
    'deposit',
    'escrow_lock',
    'escrow_release_approval',
    'escrow_release_auto',
    'escrow_refund',
    'withdrawal_request',
    'withdrawal_processed'
);

-- Transaction status
CREATE TYPE transaction_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'cancelled'
);

-- Review outcome
CREATE TYPE review_outcome AS ENUM (
    'approved',
    'revision_requested',
    'auto_released'
);

-- Dispute status
CREATE TYPE dispute_status AS ENUM (
    'pending',
    'auto_resolved',
    'under_review',
    'resolved',
    'escalated'
);

-- Dispute type
CREATE TYPE dispute_type AS ENUM (
    'scope_mismatch',
    'missing_submission',
    'deadline_violation'
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (authentication and core identity)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    student_id VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    university_name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    skills JSONB NOT NULL DEFAULT '[]'::JSONB,
    password_hash VARCHAR(255) NOT NULL,
    profile_picture_url VARCHAR(500),
    role user_role NOT NULL DEFAULT 'student',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    trust_tier trust_tier NOT NULL DEFAULT 'basic',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Anti-race-condition: version for optimistic locking
    version INTEGER NOT NULL DEFAULT 1,

    -- Trust score
    trust_score INTEGER NOT NULL DEFAULT 0,

    -- Structured skills payload for UI chips/search
    CONSTRAINT users_skills_array CHECK (jsonb_typeof(skills) = 'array')
);

-- User profiles (extended information)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    institution VARCHAR(255),
    department VARCHAR(255),
    bio TEXT,
    profile_image_url VARCHAR(500),
    verification_document_url VARCHAR(500),
    verification_status VARCHAR(50) DEFAULT 'unverified',
    reputation_score INTEGER NOT NULL DEFAULT 0,
    completed_tasks_count INTEGER NOT NULL DEFAULT 0,
    volunteer_hours DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Anti-race-condition: version for optimistic locking
    version INTEGER NOT NULL DEFAULT 1
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poster_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    task_type task_type NOT NULL,
    status task_status NOT NULL DEFAULT 'draft',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    scope TEXT NOT NULL,
    deliverables TEXT NOT NULL,
    acceptance_criteria TEXT NOT NULL,
    required_members INTEGER, -- For volunteer tasks
    budget DECIMAL(10, 2), -- For paid tasks (NULL for volunteer)
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    review_window_hours INTEGER NOT NULL DEFAULT 48, -- Hours for review after submission
    max_revisions INTEGER NOT NULL DEFAULT 2,
    application_deadline TIMESTAMP WITH TIME ZONE,
    selected_executor_id UUID REFERENCES users(id) ON DELETE SET NULL, -- For paid tasks
    submitted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Anti-race-condition: version for optimistic locking
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Constraints
    CONSTRAINT valid_budget CHECK (
        (task_type = 'paid' AND budget IS NOT NULL AND budget > 0) OR
        (task_type = 'volunteer' AND budget IS NULL)
    ),
    CONSTRAINT valid_required_members CHECK (
        (task_type = 'volunteer' AND required_members IS NOT NULL AND required_members > 0) OR
        (task_type = 'paid' AND required_members IS NULL)
    )
);

-- Task applications
CREATE TABLE task_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status application_status NOT NULL DEFAULT 'pending',
    cover_letter TEXT,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Anti-race-condition: version for optimistic locking
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Unique constraint: one application per user per task
    CONSTRAINT unique_application UNIQUE (task_id, applicant_id)
);

-- Task assignments (for volunteer tasks with multiple executors)
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    executor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    hours_logged DECIMAL(10, 2) NOT NULL DEFAULT 0,
    contribution_notes TEXT,
    certificate_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Anti-race-condition: version for optimistic locking
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Unique constraint: one assignment per user per task
    CONSTRAINT unique_assignment UNIQUE (task_id, executor_id)
);

-- Work submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
    executor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_content TEXT NOT NULL,
    submission_files JSONB, -- Array of file URLs/metadata
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revision_number INTEGER NOT NULL DEFAULT 1,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Anti-race-condition: version for optimistic locking
    version INTEGER NOT NULL DEFAULT 1
);

-- Reviews
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    outcome review_outcome,
    feedback TEXT,
    revision_request_details TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Anti-race-condition: version for optimistic locking
    version INTEGER NOT NULL DEFAULT 1
);

-- Trust Score Reviews
CREATE TABLE task_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Prevent duplicate ratings by the same reviewer for the same user on the same task
    CONSTRAINT unique_task_review UNIQUE (task_id, reviewer_id, reviewee_id)
);

-- Wallets
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    escrow_balance DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (escrow_balance >= 0),
    total_earned DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_spent DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Anti-race-condition: version for optimistic locking
    version INTEGER NOT NULL DEFAULT 1
);

-- Wallet transactions (immutable audit trail)
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    transaction_type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pending',
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    escrow_balance_before DECIMAL(10, 2),
    escrow_balance_after DECIMAL(10, 2),
    related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    related_escrow_id UUID, -- Reference to escrow record if applicable
    description TEXT,
    metadata JSONB, -- Additional transaction data
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- No version column - transactions are immutable
    CONSTRAINT valid_balance_transition CHECK (
        (transaction_type IN ('deposit', 'escrow_release_approval', 'escrow_release_auto', 'withdrawal_processed') 
         AND balance_after = balance_before + amount) OR
        (transaction_type = 'escrow_lock' 
         AND balance_after = balance_before - amount 
         AND escrow_balance_after = escrow_balance_before + amount) OR
        (transaction_type = 'escrow_refund' 
         AND balance_after = balance_before + amount 
         AND escrow_balance_after = escrow_balance_before - amount) OR
        (transaction_type = 'withdrawal_request' 
         AND balance_after = balance_before)
    )
);

-- Escrow records
CREATE TABLE escrows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE RESTRICT,
    poster_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    released_at TIMESTAMP WITH TIME ZONE,
    release_type VARCHAR(50), -- 'approval', 'auto_release', 'dispute_resolution', 'refund'
    executor_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Anti-race-condition: version for optimistic locking
    version INTEGER NOT NULL DEFAULT 1
);

-- Disputes
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
    filed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    dispute_type dispute_type NOT NULL,
    status dispute_status NOT NULL DEFAULT 'pending',
    description TEXT NOT NULL,
    evidence JSONB, -- Structured evidence data
    auto_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    auto_resolution_reason TEXT,
    assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_decision TEXT,
    admin_decision_fund_allocation JSONB, -- How funds should be allocated
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Anti-race-condition: version for optimistic locking
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Constraint: only admins can be assigned
    CONSTRAINT admin_assignment CHECK (
        assigned_admin_id IS NULL OR 
        EXISTS (SELECT 1 FROM users WHERE id = assigned_admin_id AND role = 'admin')
    )
);

-- Chat messages (immutable)
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message_text TEXT NOT NULL,
    file_attachments JSONB, -- Array of file metadata
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- No version column - messages are immutable
    -- No updated_at - messages cannot be edited or deleted
    CONSTRAINT message_not_empty CHECK (LENGTH(TRIM(message_text)) > 0 OR file_attachments IS NOT NULL)
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    related_application_id UUID REFERENCES task_applications(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Audit log (immutable)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_trust_tier ON users(trust_tier);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_created_at ON users(created_at);

-- Profiles indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_reputation_score ON profiles(reputation_score DESC);
CREATE INDEX idx_profiles_verification_status ON profiles(verification_status);

-- Tasks indexes
CREATE INDEX idx_tasks_poster_id ON tasks(poster_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_task_type ON tasks(task_type);
CREATE INDEX idx_tasks_selected_executor_id ON tasks(selected_executor_id) WHERE selected_executor_id IS NOT NULL;
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_application_deadline ON tasks(application_deadline) WHERE application_deadline IS NOT NULL;
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_status_type ON tasks(status, task_type);
CREATE INDEX idx_tasks_poster_status ON tasks(poster_id, status);

-- Task applications indexes
CREATE INDEX idx_task_applications_task_id ON task_applications(task_id);
CREATE INDEX idx_task_applications_applicant_id ON task_applications(applicant_id);
CREATE INDEX idx_task_applications_status ON task_applications(status);
CREATE INDEX idx_task_applications_task_status ON task_applications(task_id, status);
CREATE INDEX idx_task_applications_applied_at ON task_applications(applied_at DESC);

-- Task assignments indexes
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_executor_id ON task_assignments(executor_id);
CREATE INDEX idx_task_assignments_task_executor ON task_assignments(task_id, executor_id);

-- Submissions indexes
CREATE INDEX idx_submissions_task_id ON submissions(task_id);
CREATE INDEX idx_submissions_executor_id ON submissions(executor_id);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);

-- Reviews indexes
CREATE INDEX idx_reviews_task_id ON reviews(task_id);
CREATE INDEX idx_reviews_submission_id ON reviews(submission_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_outcome ON reviews(outcome);

-- Task Reviews indexes
CREATE INDEX idx_task_reviews_task_id ON task_reviews(task_id);
CREATE INDEX idx_task_reviews_reviewer_id ON task_reviews(reviewer_id);
CREATE INDEX idx_task_reviews_reviewee_id ON task_reviews(reviewee_id);
CREATE INDEX idx_task_reviews_created_at ON task_reviews(created_at DESC);

-- Wallets indexes
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_balance ON wallets(balance) WHERE balance > 0;

-- Wallet transactions indexes
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_related_task_id ON wallet_transactions(related_task_id) WHERE related_task_id IS NOT NULL;
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX idx_wallet_transactions_user_type ON wallet_transactions(user_id, transaction_type);
CREATE INDEX idx_wallet_transactions_pending ON wallet_transactions(status, created_at) WHERE status = 'pending';

-- Escrows indexes
CREATE INDEX idx_escrows_task_id ON escrows(task_id);
CREATE INDEX idx_escrows_poster_wallet_id ON escrows(poster_wallet_id);
CREATE INDEX idx_escrows_executor_wallet_id ON escrows(executor_wallet_id) WHERE executor_wallet_id IS NOT NULL;
CREATE INDEX idx_escrows_locked_at ON escrows(locked_at);
CREATE INDEX idx_escrows_released_at ON escrows(released_at) WHERE released_at IS NOT NULL;

-- Disputes indexes
CREATE INDEX idx_disputes_task_id ON disputes(task_id);
CREATE INDEX idx_disputes_filed_by_user_id ON disputes(filed_by_user_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_assigned_admin_id ON disputes(assigned_admin_id) WHERE assigned_admin_id IS NOT NULL;
CREATE INDEX idx_disputes_type_status ON disputes(dispute_type, status);
CREATE INDEX idx_disputes_pending ON disputes(status, created_at) WHERE status IN ('pending', 'under_review');

-- Chat messages indexes
CREATE INDEX idx_chat_messages_task_id ON chat_messages(task_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_task_sent ON chat_messages(task_id, sent_at DESC);
CREATE INDEX idx_chat_messages_sent_at ON chat_messages(sent_at DESC);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action, created_at DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_applications_updated_at BEFORE UPDATE ON task_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_assignments_updated_at BEFORE UPDATE ON task_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escrows_updated_at BEFORE UPDATE ON escrows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment version for optimistic locking
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply version increment triggers
CREATE TRIGGER increment_users_version BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_profiles_version BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_tasks_version BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_task_applications_version BEFORE UPDATE ON task_applications
    FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_task_assignments_version BEFORE UPDATE ON task_assignments
    FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_submissions_version BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_reviews_version BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_wallets_version BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_escrows_version BEFORE UPDATE ON escrows
    FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_disputes_version BEFORE UPDATE ON disputes
    FOR EACH ROW EXECUTE FUNCTION increment_version();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Core user authentication and identity table';
COMMENT ON TABLE profiles IS 'Extended user profile information';
COMMENT ON TABLE tasks IS 'Tasks posted by students (paid or volunteer)';
COMMENT ON TABLE task_applications IS 'Applications submitted by students for tasks';
COMMENT ON TABLE task_assignments IS 'Selected executors for volunteer tasks';
COMMENT ON TABLE submissions IS 'Work submissions by executors';
COMMENT ON TABLE reviews IS 'Review actions by task posters';
COMMENT ON TABLE wallets IS 'User wallet balances and escrow tracking';
COMMENT ON TABLE wallet_transactions IS 'Immutable transaction audit trail';
COMMENT ON TABLE escrows IS 'Escrow records for paid tasks';
COMMENT ON TABLE disputes IS 'Dispute records and resolutions';
COMMENT ON TABLE chat_messages IS 'Immutable task-specific chat messages';
COMMENT ON TABLE notifications IS 'User notifications';
COMMENT ON TABLE audit_logs IS 'Immutable system audit trail';

COMMENT ON COLUMN users.version IS 'Optimistic locking version for race condition prevention';
COMMENT ON COLUMN wallets.balance IS 'Available balance (excluding escrow)';
COMMENT ON COLUMN wallets.escrow_balance IS 'Funds locked in escrow';
COMMENT ON COLUMN tasks.version IS 'Optimistic locking version for concurrent updates';
COMMENT ON COLUMN wallet_transactions.balance_before IS 'Balance before transaction (for audit)';
COMMENT ON COLUMN wallet_transactions.balance_after IS 'Balance after transaction (for audit)';
