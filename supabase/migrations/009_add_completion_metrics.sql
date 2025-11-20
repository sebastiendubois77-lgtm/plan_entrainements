-- Add completion tracking columns to training_sessions
ALTER TABLE training_sessions 
ADD COLUMN IF NOT EXISTS completed_time_minutes DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS completed_distance_km DECIMAL(10,2);
