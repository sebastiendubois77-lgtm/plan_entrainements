'use client';
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SessionForm({ athleteId }: { athleteId: string }) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [type, setType] = useState('course');
  const [duration, setDuration] = useState<number>(60);
  const [distance, setDistance] = useState<number | ''>('');
  const [rpe, setRpe] = useState<number>(6);
  const [fatigue, setFatigue] = useState<number>(2);
  const [sleepQuality, setSleepQuality] = useState<number>(3);
  const [comment, setComment] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('completed_sessions').insert([{
      athlete_id: athleteId,
      date,
      type,
      duration_min: duration,
      distance_km: distance === '' ? null : distance,
      rpe,
      fatigue,
      sleep_quality: sleepQuality,
      comment
    }]);
    if (error) alert(error.message);
    else { alert('Séance enregistrée'); }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="p-2 border rounded" />
        <select value={type} onChange={e=>setType(e.target.value)} className="p-2 border rounded">
          <option value="course">Course</option>
          <option value="vélo">Vélo</option>
          <option value="renfo">Renfo</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input type="number" value={duration} onChange={e=>setDuration(Number(e.target.value))} className="p-2 border rounded" placeholder="Durée (min)" />
        <input type="number" value={distance as any} onChange={e=>setDistance(e.target.value === '' ? '' : Number(e.target.value))} className="p-2 border rounded" placeholder="Distance (km)" />
        <input type="number" value={rpe} onChange={e=>setRpe(Number(e.target.value))} className="p-2 border rounded" placeholder="RPE (1-10)" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" value={fatigue} onChange={e=>setFatigue(Number(e.target.value))} className="p-2 border rounded" placeholder="Fatigue (1-5)" />
        <input type="number" value={sleepQuality} onChange={e=>setSleepQuality(Number(e.target.value))} className="p-2 border rounded" placeholder="Sommeil (1-5)" />
      </div>
      <textarea value={comment} onChange={e=>setComment(e.target.value)} className="w-full p-2 border rounded" placeholder="Commentaire / ressenti" />
      <button className="px-4 py-2 bg-blue-600 text-white rounded">Enregistrer</button>
    </form>
  );
}