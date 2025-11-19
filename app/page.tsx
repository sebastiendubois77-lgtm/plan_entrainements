'use client';
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [compte, setCompte] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: compte, password });
    setLoading(false);
    if (!error) router.push('/athlete/dashboard');
    else alert(error.message);
  }

  return (
    <div className="min-h-screen bg-white pt-8">
      <div className="w-full max-w-2xl mx-auto p-8 text-center">
        <div>
          <h1 className="text-4xl font-extrabold">Les plans de Seb</h1>
          <p className="text-lg text-slate-600 mt-1">Gérez vos plans d'entraînement simplement</p>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6 mx-auto" style={{maxWidth: '20rem'}}>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-lg font-medium mb-2">Compte</label>
              <input
                value={compte}
                onChange={e => setCompte(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded bg-teal-800 text-white placeholder-slate-200 text-lg"
                placeholder="votre@email.com"
                type="email"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-lg font-medium mb-2">Mot de passe</label>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded bg-teal-800 text-white placeholder-slate-200 text-lg"
                type="password"
                required
              />
            </div>

            <div className="flex items-center justify-center">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-slate-900 text-white rounded-md text-lg"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>
            <div className="mt-3">
              <a className="text-sm text-slate-600" href="#">Mot de passe oublié ?</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}