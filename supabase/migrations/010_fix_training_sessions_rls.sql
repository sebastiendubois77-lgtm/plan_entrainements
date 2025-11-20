-- Drop existing policies
DROP POLICY IF EXISTS "Coaches can manage training sessions" ON training_sessions;
DROP POLICY IF EXISTS "Athletes can view their own sessions" ON training_sessions;
DROP POLICY IF EXISTS "Athletes can update completion of their sessions" ON training_sessions;

-- Policy: Coaches can manage all sessions for their athletes
CREATE POLICY "Coaches can manage training sessions"
ON training_sessions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles AS athlete
    WHERE athlete.id = training_sessions.athlete_id
    AND athlete.role = 'athlete'
    AND EXISTS (
      SELECT 1 FROM profiles AS coach
      WHERE coach.auth_uid = auth.uid()
      AND coach.role = 'coach'
      AND athlete.coach_user_id = coach.auth_uid
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles AS athlete
    WHERE athlete.id = training_sessions.athlete_id
    AND athlete.role = 'athlete'
    AND EXISTS (
      SELECT 1 FROM profiles AS coach
      WHERE coach.auth_uid = auth.uid()
      AND coach.role = 'coach'
      AND athlete.coach_user_id = coach.auth_uid
    )
  )
);

-- Policy: Athletes can view their own sessions
CREATE POLICY "Athletes can view their own sessions"
ON training_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = training_sessions.athlete_id
    AND profiles.auth_uid = auth.uid()
  )
);

-- Policy: Athletes can update completion status of their own sessions
CREATE POLICY "Athletes can update completion of their sessions"
ON training_sessions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = training_sessions.athlete_id
    AND profiles.auth_uid = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = training_sessions.athlete_id
    AND profiles.auth_uid = auth.uid()
  )
);
