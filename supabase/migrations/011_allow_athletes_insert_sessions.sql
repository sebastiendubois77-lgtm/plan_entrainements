-- Allow athletes to insert their own training sessions (for logging completed activities)
CREATE POLICY "Athletes can insert their own sessions"
ON training_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = training_sessions.athlete_id
    AND profiles.auth_uid = auth.uid()
    AND profiles.role = 'athlete'
  )
);
