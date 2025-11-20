'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Props = {
  athletes?: Array<{ id: string; name: string }>;
  onCreated?: () => void;
};

// Helper to get ISO week number and first day of week
function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function getFirstDayOfWeek(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (week - 1) * 7);
  return targetDate;
}

export default function PlanEditor({ athletes = [], onCreated }: Props) {
  const now = new Date();
  const [athleteId, setAthleteId] = useState('');
  const [week, setWeek] = useState<number>(getISOWeek(now));
  const [year, setYear] = useState<number>(now.getFullYear());

  const firstDay = getFirstDayOfWeek(week, year);
  const weekLabel = `S${week} (${firstDay.getDate()} ${firstDay.toLocaleDateString('fr-FR', { month: 'long' })})`;

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
      <div className="mb-2 flex gap-4">
        <div className="flex-1">
          <label className="block text-sm mb-1">Semaine</label>
          <input 
            type="number" 
            min="1" 
            max="53" 
            className="p-2 border rounded w-full" 
            value={week} 
            onChange={e=>setWeek(Number(e.target.value))} 
            placeholder="Semaine"
          />
          <p className="text-xs text-gray-600 mt-1">{weekLabel}</p>
        </div>
        <div className="flex-1">
          <label className="block text-sm mb-1">Année</label>
          <input 
            type="number" 
            min="2024" 
            max="2030" 
            className="p-2 border rounded w-full" 
            value={year} 
            onChange={e=>setYear(Number(e.target.value))} 
            placeholder="Année"
          />
        </div>
      </div>
      <button className="px-4 py-2 bg-green-600 text-white rounded">Créer plan</button>
    </form>
  );
}