-- Migration 001: init schema
-- Copie de db/init.sql
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_uid uuid,
  full_name text,
  email text,
  role text check (role in ('athlete','coach')) not null,
  created_at timestamptz default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references profiles(id) on delete set null,
  title text not null,
  description text,
  published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists plan_entries (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete set null,
  position int default 0,
  sets int,
  reps text,
  notes text
);

create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references profiles(id) on delete cascade,
  coach_id uuid references profiles(id) on delete set null,
  plan_id uuid references plans(id) on delete set null,
  session_date timestamptz default now(),
  duration_minutes int,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_plans_coach on plans(coach_id);
create index if not exists idx_training_sessions_athlete on training_sessions(athlete_id);
