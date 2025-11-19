'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import CoachAthleteList from '../../../components/Coach/AthleteList';
import PlanEditor from '../../../components/Coach/PlanEditor';

export default function CoachDashboard() {
  const [athletes, setAthletes] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (!user) return;
      // fetch athletes where coach_id = user.id
      const { data, error } = await supabase.from('athletes').select('*').eq('coach_id', user.id);
      if (!error) setAthletes(data || []);
    })();
  }, []);
  return (
    <div className="mt-6">
      <h2 className="text-2xl font-semibold mb-4">Espace coach</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Mes athlètes</h3>
          <CoachAthleteList athletes={athletes} onRefresh={()=>{ /* no-op */ }} />
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Créer / éditer un plan</h3>
          <PlanEditor />
        </div>
      </div>
    </div>
  );
}