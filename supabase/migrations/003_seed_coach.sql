-- Migration 003: seed coach profile (fallback)
-- This inserts a coach profile if one does not already exist.

INSERT INTO profiles (full_name, email, role, created_at)
SELECT 'Sébastien Dubois', 'sebastien.dubois77@gmail.com', 'coach', now()
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'sebastien.dubois77@gmail.com');
