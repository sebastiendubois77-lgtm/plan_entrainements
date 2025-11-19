'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import CoachAthleteList from '../../../components/Coach/AthleteList';
import PlanEditor from '../../../components/Coach/PlanEditor';

export default function CoachDashboard() {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [coachId, setCoachId] = useState<string | null>(null);

  async function fetchAthletes() {
    const { data: u } = await supabase.auth.getUser();
    const user = u.user;
    if (!user) return;
    setCoachId(user.id);
    // fetch athlete profiles where coach_user_id = user.id (or role = 'athlete')
    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name,sport,email')
      .eq('role', 'athlete')
      .eq('coach_user_id', user.id);
    if (!error && data) {
      // map to shape expected by AthleteList
      setAthletes(
        data.map((p: any) => ({ id: p.id, name: p.full_name || p.email || 'Athlète', sport: p.sport }))
      );
    }
  }

  useEffect(() => {
    fetchAthletes();
  }, []);
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-semibold mb-4">Espace coach</h2>
      <div className="flex gap-6">
        <div className="w-64">
          <div className="bg-white p-4 rounded shadow mb-4">
            <h3 className="font-bold mb-2">Liste déroulante athlètes</h3>
            <select className="w-full p-2 border rounded" value={selected || ''} onChange={e=>setSelected(e.target.value || null)}>
              <option value="">-- Choisir un athlète --</option>
              {athletes.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <div className="mt-3 text-left">
              <button className="px-3 py-2 bg-orange-300 text-black rounded" onClick={(e)=>{e.preventDefault(); const el = document.getElementById('athlete-add-form'); if (el) el.scrollIntoView({behavior:'smooth'});}}>Ajout</button>
            </div>
          </div>
          <div id="athlete-add-form" className="bg-white p-4 rounded shadow">
            <h4 className="font-semibold mb-2">Ajouter un athlète</h4>
            <CoachAthleteList athletes={athletes} coachId={coachId} onRefresh={fetchAthletes} />
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white p-6 rounded shadow h-80 flex items-center justify-center">
            {!selected && (
              <div className="text-center text-gray-600">
                <div className="font-bold mb-2">Informations de l'athlète sélectionné</div>
                <div>- Choisissez un athlète à gauche -</div>
              </div>
            )}
            {selected && (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="text-center">
                  <div className="font-bold text-lg mb-2">{athletes.find(a=>a.id===selected)?.name}</div>
                  <div className="text-sm text-gray-600">- Réalisé les 4 dernières semaines</div>
                  <div className="text-sm text-gray-600">- Planifié les deux prochaines semaines</div>
                </div>
                <div className="text-right">
                  <button className="px-4 py-2 bg-teal-800 text-white rounded">Modifier plan</button>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 bg-white p-4 rounded shadow">
            <h3 className="font-bold mb-2">Créer / éditer un plan</h3>
            <PlanEditor athletes={athletes} onCreated={fetchAthletes} />
          </div>
        </div>
      </div>
    </div>
  );
}