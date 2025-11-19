-- Migration 004: Drop sport column from profiles
BEGIN;
ALTER TABLE IF EXISTS profiles DROP COLUMN IF EXISTS sport;
COMMIT;
