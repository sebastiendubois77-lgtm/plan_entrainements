-- Seed data for plan_entrainements
-- Assumes tables created by db/init.sql

-- Create a demo coach
insert into profiles (id, full_name, email, role)
values
  (gen_random_uuid(), 'Coach Demo', 'coach@example.com', 'coach');

-- Create a demo athlete
insert into profiles (id, full_name, email, role)
values
  (gen_random_uuid(), 'Athlete Demo', 'athlete@example.com', 'athlete');

-- Insert a couple of exercises
insert into exercises (id, name, description)
values
  (gen_random_uuid(), 'Squat', 'Back squat'),
  (gen_random_uuid(), 'Deadlift', 'Conventional deadlift'),
  (gen_random_uuid(), 'Bench Press', 'Barbell bench press');

-- Create a sample plan linked to the first coach
with c as (
  select id as coach_id from profiles where role='coach' limit 1
), e as (
  select id from exercises limit 3
)
insert into plans (id, coach_id, title, description, published)
select gen_random_uuid(), c.coach_id, 'Plan Démo', 'Programme découverte', true
from c;

-- Add entries to the created plan
with p as (select id from plans where title='Plan Démo' limit 1),
     ex as (select id from exercises order by created_at limit 3)
insert into plan_entries (id, plan_id, exercise_id, position, sets, reps, notes)
select gen_random_uuid(), p.id, ex.id, row_number() over (), 3, '8-12', null
from p, ex;

-- Create a sample training session for the athlete
with a as (select id as athlete_id from profiles where role='athlete' limit 1),
     pl as (select id as plan_id from plans where title='Plan Démo' limit 1),
     c as (select id as coach_id from profiles where role='coach' limit 1)
insert into training_sessions (id, athlete_id, coach_id, plan_id, session_date, duration_minutes, notes)
select gen_random_uuid(), a.athlete_id, c.coach_id, pl.plan_id, now(), 60, 'Session initiale' from a, pl, c;

-- End seed
