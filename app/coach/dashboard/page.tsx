'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import TrainingPlanView from '../../../components/Coach/TrainingPlanView';

export default function CoachDashboard() {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [athleteToDelete, setAthleteToDelete] = useState<any | null>(null);

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
      <div className="w-56 bg-gray-100 p-3 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Mes athlètes</h2>
        
        {/* Liste des athlètes */}
        <div className="space-y-2 mb-8">
          {athletes.map(athlete => (
            <div key={athlete.id} className={`flex items-center justify-between py-1.5 px-2 rounded transition ${selectedAthleteId === athlete.id ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}`}>
              <button
                onClick={() => setSelectedAthleteId(athlete.id)}
                className="text-left flex-1 py-1 px-1"
              >
                <div className="font-medium text-xs truncate">{athlete.full_name || athlete.email}</div>
              </button>
              <button
                onClick={() => setAthleteToDelete(athlete)}
                title="Supprimer"
                className={`p-1 rounded text-sm ${selectedAthleteId === athlete.id ? 'text-white hover:text-gray-200' : 'text-red-600 hover:text-red-800'}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Formulaire d'ajout */}
        <div className="bg-white p-3 rounded shadow">
          <h3 className="font-bold mb-2 text-xs">Ajouter un athlète</h3>
          <form onSubmit={createAthlete} className="space-y-1.5">
            <input
              name="full_name"
              type="text"
              placeholder="Prénom Nom"
              required
              className="w-full px-2 py-1 border rounded text-xs"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="w-full px-2 py-1 border rounded text-xs"
            />
            <button
              type="submit"
              className="w-full px-2 py-1.5 bg-orange-400 hover:bg-orange-500 text-white rounded text-xs font-medium"
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

      {/* Modale de confirmation de suppression */}
      {athleteToDelete && (
        <div 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAthleteToDelete(null);
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxWidth: '28rem',
              width: '100%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-red-600 mb-2">⚠️ Confirmer la suppression</h2>
                <p className="text-gray-700">
                  Êtes-vous sûr de vouloir supprimer cet athlète ?
                  <span className="block mt-2 font-semibold">
                    {athleteToDelete.full_name || athleteToDelete.email}
                  </span>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Cette action est irréversible et supprimera toutes les données associées.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setAthleteToDelete(null)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/delete-athlete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ profileId: athleteToDelete.id })
                      });
                      
                      let json = null;
                      const contentType = res.headers.get('content-type');
                      if (contentType && contentType.includes('application/json')) {
                        json = await res.json();
                      }
                      
                      if (!res.ok) throw new Error(json?.error || 'Erreur lors de la suppression');
                      
                      fetchAthletes();
                      if (selectedAthleteId === athleteToDelete.id) setSelectedAthleteId(null);
                      setAthleteToDelete(null);
                    } catch (err: any) {
                      alert('Impossible de supprimer: ' + (err.message || String(err)));
                      setAthleteToDelete(null);
                    }
                  }}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}