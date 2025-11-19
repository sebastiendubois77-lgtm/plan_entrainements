'use client';
import React from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const [user, setUser] = React.useState<any>(null);
  React.useEffect(() => {
    const s = supabase.auth.getUser().then(r => setUser(r.data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-5xl mx-auto p-4" />
    </header>
  );
}