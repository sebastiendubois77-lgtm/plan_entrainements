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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-3xl mx-auto p-8">
        <div className="flex items-center gap-8">
            <div className="flex-shrink-0">
            <img src="/logo.svg" alt="Les plans de Seb" className="w-28 h-28 object-contain" />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold">Les plans de Seb</h1>
            <p className="text-sm text-slate-600 mt-1">Gérez vos plans d'entraînement simplement</p>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6 max-w-sm">
          <form onSubmit={handleSubmit}>
            <div className="mb-4 flex items-center">
              <label className="w-28 text-sm font-medium">Compte:</label>
              <input
                value={compte}
                onChange={e => setCompte(e.target.value)}
                className="flex-1 p-2 border border-slate-300 rounded bg-teal-800 text-white placeholder-slate-200"
                placeholder="votre@email.com"
                type="email"
                required
              />
            </div>

            <div className="mb-4 flex items-center">
              <label className="w-28 text-sm font-medium">Mot de passe:</label>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="flex-1 p-2 border border-slate-300 rounded bg-teal-800 text-white placeholder-slate-200"
                type="password"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-slate-900 text-white rounded-md"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
              <a className="text-sm text-slate-600" href="#">Mot de passe oublié ?</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}