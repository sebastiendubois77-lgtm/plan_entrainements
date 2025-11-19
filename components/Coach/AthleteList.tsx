'use client';
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Props = {
  athletes: Array<{ id: string; name: string; email?: string }>;
  coachId?: string | null;
  onRefresh?: () => void;
};

export default function AthleteList({ athletes = [], coachId, onRefresh }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  // sport removed: plans are running-only
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) return alert('Nom et email requis');
    setLoading(true);
    try {
      const res = await fetch('/api/create-athlete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, coachId })
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) return alert('Erreur: ' + JSON.stringify(data));
      setName(''); setEmail('');
      if (onRefresh) onRefresh();
      // inform the coach that an email was sent so the athlete can set their password
      if (data.message === 'reset_email_sent') alert('Athlète créé. Un e-mail a été envoyé pour définir le mot de passe.');
    } catch (err: any) {
      setLoading(false);
      alert('Erreur: ' + (err.message || String(err)));
    }
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-4 grid grid-cols-2 gap-2">
        <input className="p-2 border rounded" placeholder="Nom" value={name} onChange={e=>setName(e.target.value)} />
        <input className="p-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <div className="col-span-3 text-right">
          <button className="px-3 py-1 bg-blue-600 text-white rounded" disabled={loading}>{loading ? 'Ajout...' : 'Ajouter athlète'}</button>
        </div>
      </form>

      <ul>
        {athletes.length === 0 && <li>Aucun athlète</li>}
        {athletes.map(a => (
          <li key={a.id} className="py-2 border-b">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{a.name}</div>
                {a.email && <div className="text-sm text-gray-500">{a.email}</div>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}