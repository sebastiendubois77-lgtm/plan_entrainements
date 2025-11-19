import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    
    if (!token || !password) {
      return NextResponse.json({ error: 'Token et mot de passe requis' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Fetch and validate token
    const tokensUrl = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/invitation_tokens';
    const res = await fetch(`${tokensUrl}?token=eq.${encodeURIComponent(token)}&select=*`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    });

    const tokens = await res.json();
    
    if (!res.ok || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 404 });
    }

    const tokenData = tokens[0];
    
    if (tokenData.used) {
      return NextResponse.json({ error: 'Ce lien a déjà été utilisé' }, { status: 400 });
    }
    
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'Ce lien a expiré' }, { status: 400 });
    }

    // Get user by email
    const profilesUrl = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/profiles';
    const profileRes = await fetch(`${profilesUrl}?email=eq.${encodeURIComponent(tokenData.email)}&select=auth_uid`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    });

    const profiles = await profileRes.json();
    
    if (!profileRes.ok || !Array.isArray(profiles) || profiles.length === 0) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const userId = profiles[0].auth_uid;

    // Update user password using admin API
    const adminUrl = SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/admin/users/' + userId;
    const updateRes = await fetch(adminUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify({ password })
    });

    if (!updateRes.ok) {
      const error = await updateRes.json();
      return NextResponse.json({ error: error.message || 'Erreur lors de la mise à jour du mot de passe' }, { status: 500 });
    }

    // Mark token as used
    await fetch(`${tokensUrl}?token=eq.${encodeURIComponent(token)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ used: true })
    });

    return NextResponse.json({ 
      success: true,
      email: tokenData.email
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
