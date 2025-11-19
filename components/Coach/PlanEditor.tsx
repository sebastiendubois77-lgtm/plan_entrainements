'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Props = {
  athletes?: Array<{ id: string; name: string }>;
  onCreated?: () => void;
};

export default function PlanEditor({ athletes = [], onCreated }: Props) {
  const [athleteId, setAthleteId] = useState('');
  const [week, setWeek] = useState<number>(1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (!athleteId && athletes.length > 0) setAthleteId(athletes[0].id);
  }, [athletes]);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!athleteId) return alert('Sélectionnez un athlète');
    const { error } = await supabase.from('training_plans').insert([{ athlete_id: athleteId, week, year }]);
    if (error) alert(error.message);
    else {
      alert('Plan créé');
      if (onCreated) onCreated();
    }
  }

  return (
    <form onSubmit={createPlan}>
      <div className="mb-2">
        <label className="block text-sm">Athlète</label>
        <select className="w-full p-2 border rounded" value={athleteId} onChange={e=>setAthleteId(e.target.value)}>
          <option value="">-- Choisir un athlète --</option>
          {athletes.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
      <div className="mb-2 flex gap-2">
        <input type="number" className="p-2 border rounded w-24" value={week} onChange={e=>setWeek(Number(e.target.value))} />
        <input type="number" className="p-2 border rounded w-28" value={year} onChange={e=>setYear(Number(e.target.value))} />
      </div>
      <button className="px-4 py-2 bg-green-600 text-white rounded">Créer plan</button>
    </form>
  );
}