#!/usr/bin/env node
// Script pour créer un utilisateur Supabase (admin) et insérer un profil
// Usage:
// SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create_coach.js

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EMAIL = process.env.COACH_EMAIL || 'sebastien.dubois77@gmail.com';
const PASSWORD = process.env.COACH_PASSWORD || 'coach';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Merci de définir les variables d\'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

function urlJoin(base, path) {
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

async function createAuthUser(email, password) {
  const adminUrl = urlJoin(SUPABASE_URL, 'auth/v1/admin/users');
  const res = await fetch(adminUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    },
    body: JSON.stringify({ email, password, email_confirm: true })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`failed to create user: ${JSON.stringify(data)}`);
  return data;
}

async function insertProfile(userId, email) {
  const profilesUrl = urlJoin(SUPABASE_URL, 'rest/v1/profiles');
  const profile = {
    auth_uid: userId,
    full_name: 'Sébastien Dubois',
    email,
    role: 'coach'
  };
  const res = await fetch(profilesUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(profile)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`failed to insert profile: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  try {
    console.log(`Creating auth user ${EMAIL}...`);
    const user = await createAuthUser(EMAIL, PASSWORD);
    console.log('Auth user created:', user.id);

    console.log('Inserting profile...');
    const inserted = await insertProfile(user.id, EMAIL);
    console.log('Profile inserted:', inserted);

    console.log('\nTerminé. Vous pouvez maintenant vous connecter avec l\'email et le mot de passe fournis.');
  } catch (err) {
    console.error('Erreur:', err.message || err);
    process.exit(1);
  }
}

main();
