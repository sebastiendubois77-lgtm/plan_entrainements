import { NextResponse } from 'next/server';

type Body = {
  name: string;
  email: string;
  sport?: string;
  coachId?: string | null;
  password?: string;
};

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    const { name, email, sport, coachId } = body;
    let password = body.password || Math.random().toString(36).slice(-8);

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

    const adminUrl = SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/admin/users';
    const createUserRes = await fetch(adminUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify({ email, password, email_confirm: true })
    });
    const adminData = await createUserRes.json();
    if (!createUserRes.ok) return NextResponse.json({ error: adminData }, { status: 500 });
    const userId = adminData.id;

    // Try to update existing profile with this email
    const profilesUrl = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/profiles';
    const patchRes = await fetch(`${profilesUrl}?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ auth_uid: userId, full_name: name, role: 'athlete', sport: sport || null, coach_user_id: coachId || null })
    });
    const patched = await patchRes.json();
    if (patchRes.ok && Array.isArray(patched) && patched.length > 0) {
      return NextResponse.json({ userId, profile: patched[0], password });
    }

    // Otherwise insert a new profile
    const insertRes = await fetch(profilesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ auth_uid: userId, full_name: name, email, role: 'athlete', sport: sport || null, coach_user_id: coachId || null })
    });
    const inserted = await insertRes.json();
    if (!insertRes.ok) return NextResponse.json({ error: inserted }, { status: 500 });

    return NextResponse.json({ userId, profile: inserted[0], password });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
