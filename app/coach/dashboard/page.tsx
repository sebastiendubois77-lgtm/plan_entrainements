'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import TrainingPlanView from '../../../components/Coach/TrainingPlanView';

export default function CoachDashboard() {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);

  async function fetchAthletes() {
    const { data: u } = await supabase.auth.getUser();
    const user = u.user;
    if (!user) return;
    setCoachId(user.id);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, photo_url, objectif, courses, entrainements_par_semaine, jours_disponibles')
      .eq('role', 'athlete');
      
    if (!error && data) {
      setAthletes(data);
      if (data.length > 0 && !selectedAthleteId) {
        setSelectedAthleteId(data[0].id);
      }
    }
  }

  async function createAthlete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const fullName = formData.get('full_name') as string;

    if (!coachId) return alert('Coach non identifié');
    
    const res = await fetch('/api/create-athlete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: fullName, coach_user_id: coachId })
    });
    
    const json = await res.json();
    if (res.ok) {
      alert(`Athlète créé ! Lien d'invitation :\n${json.inviteLink}\n\nCopiez ce lien et envoyez-le à l'athlète.`);
      form.reset();
      fetchAthletes();
    } else {
      alert(json.error || 'Erreur lors de la création');
    }
  }

  useEffect(() => {
    fetchAthletes();
  }, []);

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-100 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Mes athlètes</h2>
        
        {/* Liste des athlètes */}
        <div className="space-y-2 mb-6">
          {athletes.map(athlete => (
            <div key={athlete.id} className={`flex items-center justify-between p-2 rounded transition ${selectedAthleteId === athlete.id ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}`}>
              <button
                onClick={() => setSelectedAthleteId(athlete.id)}
                className="text-left flex-1 p-2"
              >
                <div className="font-medium">{athlete.full_name || athlete.email}</div>
                {athlete.objectif && <div className="text-xs text-gray-500">{athlete.objectif}</div>}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!confirm(`Supprimer ${athlete.full_name || athlete.email} ? Cette action est irréversible.`)) return;
                    try {
                      const res = await fetch('/api/delete-athlete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ profileId: athlete.id })
                      });
                      const json = await res.json();
                      if (!res.ok) throw new Error(json.error || 'Erreur');
                      // refresh list
                      fetchAthletes();
                      if (selectedAthleteId === athlete.id) setSelectedAthleteId(null);
                    } catch (err: any) {
                      alert('Impossible de supprimer: ' + (err.message || String(err)));
                    }
                  }}
                  title="Supprimer"
                  className="text-red-600 hover:text-red-800 p-2 rounded"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Formulaire d'ajout */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-3">Ajouter un athlète</h3>
          <form onSubmit={createAthlete} className="space-y-2">
            <input
              name="full_name"
              type="text"
              placeholder="Prénom Nom"
              required
              className="w-full p-2 border rounded text-sm"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="w-full p-2 border rounded text-sm"
            />
            <button
              type="submit"
              className="w-full px-3 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded"
            >
              Créer
            </button>
          </form>
        </div>
      </div>

      {/* Zone principale */}
      <div className="flex-1 overflow-y-auto">
        {selectedAthlete ? (
          <TrainingPlanView athlete={selectedAthlete} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Sélectionnez un athlète
          </div>
        )}
      </div>
    </div>
  );
}