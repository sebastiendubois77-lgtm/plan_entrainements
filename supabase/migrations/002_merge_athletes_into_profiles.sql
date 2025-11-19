-- Migration 002: Merge athletes into profiles and recreate related tables
-- Note: this migration assumes `athletes` and related tables are empty (as requested)
BEGIN;

-- 0) Ensure needed extensions
create extension if not exists pgcrypto;

-- 1) Add athlete-specific columns to profiles if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='sport') THEN
    ALTER TABLE profiles ADD COLUMN sport text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='age') THEN
    ALTER TABLE profiles ADD COLUMN age int;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='coach_user_id') THEN
    ALTER TABLE profiles ADD COLUMN coach_user_id uuid;
  END IF;
END$$;

-- 2) Drop tables related to athletes (safe when empty)
DROP TABLE IF EXISTS completed_sessions CASCADE;
DROP TABLE IF EXISTS planned_sessions CASCADE;
DROP TABLE IF EXISTS training_plans CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;

-- 3) Recreate training_plans referencing profiles
CREATE TABLE IF NOT EXISTS training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  week int NOT NULL,
  year int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 4) Recreate planned_sessions referencing training_plans
CREATE TABLE IF NOT EXISTS planned_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES training_plans(id) ON DELETE CASCADE,
  date date NOT NULL,
  type text,
  duration_min int,
  distance_km numeric,
  description text
);

-- 5) Recreate completed_sessions referencing planned_sessions and profiles
CREATE TABLE IF NOT EXISTS completed_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planned_session_id uuid REFERENCES planned_sessions(id) ON DELETE SET NULL,
  athlete_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  type text,
  duration_min int,
  distance_km numeric,
  rpe int,
  fatigue int,
  sleep_quality int,
  comment text,
  created_at timestamptz DEFAULT now()
);

-- 6) Indexes
CREATE INDEX IF NOT EXISTS idx_training_plans_athlete ON training_plans(athlete_id);
CREATE INDEX IF NOT EXISTS idx_planned_sessions_plan ON planned_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_completed_sessions_athlete ON completed_sessions(athlete_id);

COMMIT;
