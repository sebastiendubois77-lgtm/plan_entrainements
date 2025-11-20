-- Drop existing table if it exists
DROP TABLE IF EXISTS training_sessions CASCADE;

-- Create training_sessions table
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('repos', 'endurance', 'resistance', 'vitesse', 'vma', 'course')),
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_training_sessions_athlete_date ON training_sessions(athlete_id, date);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(date);

-- Enable RLS
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can view and manage all sessions for their athletes
CREATE POLICY "Coaches can manage training sessions"
ON training_sessions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = training_sessions.athlete_id
    AND profiles.role = 'athlete'
  )
  AND EXISTS (
    SELECT 1 FROM profiles AS coach
    WHERE coach.id = auth.uid()
    AND coach.role = 'coach'
  )
);

-- Policy: Athletes can view their own sessions
CREATE POLICY "Athletes can view their own sessions"
ON training_sessions
FOR SELECT
TO authenticated
USING (athlete_id = auth.uid());

-- Policy: Athletes can update completion status of their own sessions
CREATE POLICY "Athletes can update completion of their sessions"
ON training_sessions
FOR UPDATE
TO authenticated
USING (athlete_id = auth.uid())
WITH CHECK (athlete_id = auth.uid());
