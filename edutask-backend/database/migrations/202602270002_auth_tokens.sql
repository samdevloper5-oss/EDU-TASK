-- Create auth token tables.
BEGIN;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS token_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash TEXT NOT NULL UNIQUE,
    token_type TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_token_hash ON token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expiry ON token_blacklist(expires_at);

COMMIT;
