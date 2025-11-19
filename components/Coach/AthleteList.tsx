'use client';
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Props = {
  athletes: any[];
  coachId?: string | null;
  onRefresh?: () => void;
};

export default function AthleteList({ athletes = [], coachId, onRefresh }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sport, setSport] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) return alert('Nom et email requis');
    setLoading(true);
    const payload: any = { full_name: name, email, role: 'athlete', sport };
    if (coachId) payload.coach_user_id = coachId;
    const { error } = await supabase.from('profiles').insert([payload]);
    setLoading(false);
    if (error) return alert(error.message);
    setName(''); setEmail(''); setSport('');
    if (onRefresh) onRefresh();
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-4 grid grid-cols-3 gap-2">
        <input className="p-2 border rounded" placeholder="Nom" value={name} onChange={e=>setName(e.target.value)} />
        <input className="p-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="p-2 border rounded" placeholder="Sport" value={sport} onChange={e=>setSport(e.target.value)} />
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
                <div className="text-sm text-gray-500">{a.sport}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}