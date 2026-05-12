import { NextResponse } from 'next/server';
import crypto from 'crypto';

type Body = {
  name: string;
  email: string;
  coachId?: string | null;
  password?: string;
};

function formatError(value: any) {
  if (!value) return 'Unknown error';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if ('error' in value && value.error) return formatError(value.error);
    if ('message' in value && value.message) return formatError(value.message);
    if ('details' in value && value.details) return formatError(value.details);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export async function POST(req: Request) {
  try {
    const body: any = await req.json();
    // Accept multiple possible field names from different callers
    const name = body.name || body.full_name || body.fullName;
    const email = body.email || body.email_address;
    const coachId = body.coachId || body.coach_user_id || body.coach_userId || body.coachId;
    if (!name || !email) {
      return NextResponse.json({ error: 'Nom et email sont requis' }, { status: 400 });
    }
    // Generate a temporary password that will be replaced when athlete sets their own
    let password = crypto.randomBytes(16).toString('hex');

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
    if (!createUserRes.ok) return NextResponse.json({ error: formatError(adminData) }, { status: 500 });
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
      body: JSON.stringify({ auth_uid: userId, full_name: name, role: 'athlete', coach_user_id: coachId || null })
    });
    const patched = await patchRes.json();
    if (!patchRes.ok) {
      return NextResponse.json({ error: formatError(patched) }, { status: 500 });
    }
    if (Array.isArray(patched) && patched.length > 0) {
      // Create invitation token (valid for 7 days)
      const inviteToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const tokensUrl = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/invitation_tokens';
      await fetch(tokensUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ email, token: inviteToken, expires_at: expiresAt })
      });

      const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plan-entrainements.vercel.app';
      const inviteLink = `${productionUrl}/auth/set-password?token=${inviteToken}`;
      
      // TODO: Send email with invite link (for now return it in response)
      return NextResponse.json({ 
        userId, 
        profile: patched[0], 
        message: 'invite_created',
        inviteLink // Temporary: should be sent by email
      });
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
      body: JSON.stringify({ auth_uid: userId, full_name: name, email, role: 'athlete', coach_user_id: coachId || null })
    });
    const inserted = await insertRes.json();
    if (!insertRes.ok) return NextResponse.json({ error: formatError(inserted) }, { status: 500 });

    // Create invitation token (valid for 7 days)
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const tokensUrl = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/invitation_tokens';
    await fetch(tokensUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ email, token: inviteToken, expires_at: expiresAt })
    });

    const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plan-entrainements.vercel.app';
    const inviteLink = `${productionUrl}/auth/set-password?token=${inviteToken}`;
    
    // TODO: Send email with invite link (for now return it in response)
    return NextResponse.json({ 
      userId, 
      profile: inserted[0], 
      message: 'invite_created',
      inviteLink // Temporary: should be sent by email
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
