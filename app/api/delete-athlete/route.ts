import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId } = body;
    if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 });

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

    const profilesUrl = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/profiles';

    // Fetch profile to get auth_uid
    const fetchRes = await fetch(`${profilesUrl}?id=eq.${encodeURIComponent(profileId)}`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });
    const profiles = await fetchRes.json();
    if (!fetchRes.ok) return NextResponse.json({ error: profiles }, { status: 500 });
    if (!Array.isArray(profiles) || profiles.length === 0) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const profile = profiles[0];
    const authUid = profile.auth_uid;

    // Delete user from auth (if exists)
    if (authUid) {
      const adminUrl = SUPABASE_URL.replace(/\/+$/, '') + `/auth/v1/admin/users/${authUid}`;
      await fetch(adminUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY
        }
      });
    }

    // Delete profile row
    const delRes = await fetch(`${profilesUrl}?id=eq.${encodeURIComponent(profileId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });

    const delJson = await delRes.json();
    if (!delRes.ok) return NextResponse.json({ error: delJson }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
