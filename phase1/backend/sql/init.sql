-- Dining Feedback System - PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS feedbacks (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_email VARCHAR(255) NOT NULL,
    phone_number  VARCHAR(20),
    rating        INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments      TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_email ON feedbacks(customer_email);
CREATE INDEX IF NOT EXISTS idx_feedbacks_rating ON feedbacks(rating);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at DESC);

CREATE TABLE IF NOT EXISTS oauth_sessions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider      VARCHAR(50) NOT NULL DEFAULT 'google',
    provider_id   VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    access_token  TEXT,
    refresh_token TEXT,
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_sessions_email ON oauth_sessions(email);

CREATE TABLE IF NOT EXISTS admins (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email     VARCHAR(255) UNIQUE NOT NULL,
    name      VARCHAR(255),
    role      VARCHAR(50) NOT NULL DEFAULT 'reviewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default admin for testing
INSERT INTO admins (email, name, role)
VALUES ('admin@corp.example.com', 'Admin User', 'admin')
ON CONFLICT (email) DO NOTHING;