ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS task_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_task_review') THEN
        ALTER TABLE task_reviews ADD CONSTRAINT unique_task_review UNIQUE (task_id, reviewer_id, reviewee_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_task_reviews_task_id ON task_reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_reviewer_id ON task_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_reviewee_id ON task_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_created_at ON task_reviews(created_at DESC);
