import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Fetch token from database
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
    
    // Check if token is used
    if (tokenData.used) {
      return NextResponse.json({ error: 'Ce lien a déjà été utilisé' }, { status: 400 });
    }
    
    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'Ce lien a expiré' }, { status: 400 });
    }

    return NextResponse.json({ 
      valid: true, 
      email: tokenData.email 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
