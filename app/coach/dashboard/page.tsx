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
  return (
    <div className="mt-6">
      <h2 className="text-2xl font-semibold mb-4">Espace coach</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Mes athlètes</h3>
          <CoachAthleteList athletes={athletes} coachId={coachId} onRefresh={fetchAthletes} />
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Créer / éditer un plan</h3>
          <PlanEditor athletes={athletes} onCreated={fetchAthletes} />
        </div>
      </div>
    </div>
  );
}