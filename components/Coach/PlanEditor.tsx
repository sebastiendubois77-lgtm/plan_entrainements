'use client';
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function PlanEditor() {
  const [athleteId, setAthleteId] = useState('');
  const [week, setWeek] = useState<number>(1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    const { error, data } = await supabase.from('training_plans').insert([{ athlete_id: athleteId, week, year }]);
    if (error) alert(error.message);
    else alert('Plan créé');
  }

  return (
    <form onSubmit={createPlan}>
      <div className="mb-2">
        <label className="block text-sm">Athlete ID</label>
        <input className="w-full p-2 border rounded" value={athleteId} onChange={e=>setAthleteId(e.target.value)} placeholder="collez l'id de l'athlete" />
      </div>
      <div className="mb-2 flex gap-2">
        <input type="number" className="p-2 border rounded w-24" value={week} onChange={e=>setWeek(Number(e.target.value))} />
        <input type="number" className="p-2 border rounded w-28" value={year} onChange={e=>setYear(Number(e.target.value))} />
      </div>
      <button className="px-4 py-2 bg-green-600 text-white rounded">Créer plan</button>
    </form>
  );
}