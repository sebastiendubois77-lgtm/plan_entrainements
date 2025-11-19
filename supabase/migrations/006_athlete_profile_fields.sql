-- Migration 006: Add athlete profile fields
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS date_naissance date,
  ADD COLUMN IF NOT EXISTS jours_disponibles text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS objectif text,
  ADD COLUMN IF NOT EXISTS courses jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS entrainements_par_semaine integer DEFAULT 3;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
