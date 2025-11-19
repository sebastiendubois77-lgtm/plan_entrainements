// Script to create Supabase Storage bucket for avatars
import fs from 'fs';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
const SERVICE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY');
  process.exit(1);
}

async function createBucket() {
  try {
    // Create bucket
    const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify({
        id: 'avatars',
        name: 'avatars',
        public: true,
        file_size_limit: 5242880, // 5 MB
        allowed_mime_types: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
      })
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      if (error.message?.includes('already exists')) {
        console.log('✓ Bucket "avatars" already exists');
      } else {
        console.error('Error creating bucket:', error);
        process.exit(1);
      }
    } else {
      console.log('✓ Bucket "avatars" created successfully');
    }

    // Set bucket to public
    const updateRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/avatars`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify({
        public: true,
        file_size_limit: 5242880,
        allowed_mime_types: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
      })
    });

    if (updateRes.ok) {
      console.log('✓ Bucket configured as public');
    }

    console.log('\n✓ Storage setup complete!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createBucket();
