'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import SessionForm from '../../../components/Athlete/SessionForm';

export default function AthleteDashboard() {
  const [athlete, setAthlete] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (!user) return;
      const { data } = await supabase.from('athletes').select('*').eq('user_id', user.id).single();
      setAthlete(data);
    })();
  }, []);

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-semibold mb-4">Mon espace</h2>
      {!athlete && <div>Chargement...</div>}
      {athlete && (
        <>
          <div className="bg-white p-4 rounded shadow mb-6">
            <div className="font-bold">{athlete.name}</div>
            <div className="text-sm text-gray-600">{athlete.sport}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Saisir séance réalisée</h3>
            <SessionForm athleteId={athlete.id} />
          </div>
        </>
      )}
    </div>
  );
}