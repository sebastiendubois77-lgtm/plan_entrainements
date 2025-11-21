-- Migration 012: Link existing athlete 'Seb' to coach Sébastien Dubois
-- This updates the coach_user_id for the athlete profile created manually

BEGIN;

-- Update the athlete profile with email 'sebastien.dubois@insa-strasbourg.fr'
-- to link it to the coach with auth_uid '48e6d793-49a5-48b5-88fd-ee28bce5076'
UPDATE profiles
SET coach_user_id = '48e6d793-49a5-48b5-88fd-ee28bce5076'
WHERE email = 'sebastien.dubois@insa-strasbourg.fr'
  AND role = 'athlete'
  AND coach_user_id IS NULL;

COMMIT;
