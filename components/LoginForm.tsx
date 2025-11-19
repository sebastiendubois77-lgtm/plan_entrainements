'use client';
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in'|'sign-up'>('sign-in');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === 'sign-in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) router.push('/athlete/dashboard');
      else alert(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (!error) alert('Vérifie ta boîte mail pour confirmer l’inscription.');
      else alert(error.message);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow">
      <div className="mb-3">
        <label className="block text-sm">Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-2 border rounded" />
      </div>
      <div className="mb-3">
        <label className="block text-sm">Mot de passe</label>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" className="w-full p-2 border rounded" />
      </div>
      <div className="flex gap-2 items-center">
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
          {mode === 'sign-in' ? 'Se connecter' : 'S’inscrire'}
        </button>
        <button type="button" className="text-sm" onClick={()=>setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
          {mode === 'sign-in' ? 'Créer un compte' : 'J’ai déjà un compte'}
        </button>
      </div>
    </form>
  );
}