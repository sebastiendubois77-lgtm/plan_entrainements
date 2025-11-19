-- Migration 005: Create invitation tokens table
CREATE TABLE IF NOT EXISTS invitation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  used boolean DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_invitation_tokens_token ON invitation_tokens(token);
CREATE INDEX idx_invitation_tokens_email ON invitation_tokens(email);
