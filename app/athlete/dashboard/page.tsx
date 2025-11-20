'use client';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

type SessionType = 'repos' | 'endurance' | 'resistance' | 'vitesse' | 'vma' | 'course';

interface TrainingSession {
  id?: string;
  date: string;
  session_type: SessionType;
  description: string;
  is_completed?: boolean;
  completed_notes?: string;
  completed_time_minutes?: number;
  completed_distance_km?: number;
}

interface Race {
  date: string;
  distance: string;
  nom: string;
}

interface Profile {
  id: string;
  full_name: string;
  objectif?: string;
  courses?: Race[];
}

const SESSION_COLORS = {
  repos: 'bg-gray-100',
  endurance: 'bg-yellow-100',
  resistance: 'bg-orange-200',
  vitesse: 'bg-red-200',
  vma: 'bg-purple-200',
  course: 'bg-blue-200'
};

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function getWeekDates(weekStart: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  return `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
}

export default function AthleteDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<{ [date: string]: TrainingSession }>({});
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<Date | null>(null);
  const [editData, setEditData] = useState<{
    completed_notes: string;
    completed_time_minutes: string;
    completed_distance_km: string;
  }>({ completed_notes: '', completed_time_minutes: '', completed_distance_km: '' });
  const [mounted, setMounted] = useState(false);
  
  // Gestion des courses
  const [showRaceModal, setShowRaceModal] = useState(false);
  const [raceToDelete, setRaceToDelete] = useState<number | null>(null);
  const [newRace, setNewRace] = useState<Race>({ nom: '', date: '', distance: '' });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculer les semaines
  const today = new Date();
  const currentMonday = getMonday(today);
  
  const pastWeeks: Date[] = [];
  for (let i = 1; i >= 0; i--) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() - (i + 1) * 7);
    pastWeeks.push(weekStart);
  }
  
  const futureWeeks: Date[] = [];
  for (let i = 0; i < 2; i++) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() + i * 7);
    futureWeeks.push(weekStart);
  }

  const allWeeks = [...pastWeeks, ...futureWeeks];

  async function fetchData() {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, objectif, courses')
      .eq('auth_uid', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);

      // Fetch sessions
      const startDate = formatDate(pastWeeks[0]);
      const endDate = formatDate(new Date(futureWeeks[futureWeeks.length - 1].getTime() + 6 * 24 * 60 * 60 * 1000));

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('athlete_id', profileData.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
      }

      if (sessionsData) {
        const sessionsMap: { [date: string]: TrainingSession } = {};
        sessionsData.forEach((s: any) => {
          sessionsMap[s.date] = s;
        });
        setSessions(sessionsMap);
      }
    }
    
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function saveCompletion(date: string, isPast: boolean) {
    const session = sessions[date];
    
    if (session?.id) {
      // Update existing session
      const { error } = await supabase
        .from('training_sessions')
        .update({
          is_completed: true,
          completed_notes: editData.completed_notes,
          completed_time_minutes: isPast && editData.completed_time_minutes ? parseFloat(editData.completed_time_minutes) : null,
          completed_distance_km: isPast && editData.completed_distance_km ? parseFloat(editData.completed_distance_km) : null
        })
        .eq('id', session.id);

      if (error) {
        alert('Erreur lors de la sauvegarde: ' + error.message);
        console.error('Error saving completion:', error);
      } else {
        setSessions(prev => ({
          ...prev,
          [date]: {
            ...prev[date],
            is_completed: true,
            completed_notes: editData.completed_notes,
            completed_time_minutes: isPast && editData.completed_time_minutes ? parseFloat(editData.completed_time_minutes) : undefined,
            completed_distance_km: isPast && editData.completed_distance_km ? parseFloat(editData.completed_distance_km) : undefined
          }
        }));
        closeModal();
      }
    } else if (profile) {
      // Create new session (libre, pas planifié par le coach)
      const { data, error } = await supabase
        .from('training_sessions')
        .insert([{
          athlete_id: profile.id,
          date,
          session_type: 'repos',
          description: '',
          is_completed: true,
          completed_notes: editData.completed_notes,
          completed_time_minutes: isPast && editData.completed_time_minutes ? parseFloat(editData.completed_time_minutes) : null,
          completed_distance_km: isPast && editData.completed_distance_km ? parseFloat(editData.completed_distance_km) : null
        }])
        .select()
        .single();

      if (error) {
        alert('Erreur lors de la création: ' + error.message);
        console.error('Error creating session:', error);
      } else if (data) {
        setSessions(prev => ({ ...prev, [date]: data }));
        closeModal();
      }
    }
  }

  function startEditing(date: string, dateObj: Date) {
    const session = sessions[date];
    setEditingCell(date);
    setEditingDate(dateObj);
    setEditData({
      completed_notes: session?.completed_notes || '',
      completed_time_minutes: session?.completed_time_minutes?.toString() || '',
      completed_distance_km: session?.completed_distance_km?.toString() || ''
    });
  }

  function closeModal() {
    setEditingCell(null);
    setEditingDate(null);
    setEditData({ completed_notes: '', completed_time_minutes: '', completed_distance_km: '' });
  }

  function getRaceOnDate(date: Date): Race | undefined {
    const dateStr = formatDate(date);
    return profile?.courses?.find((r: Race) => r.date === dateStr);
  }

  async function addRace() {
    if (!newRace.nom || !newRace.date || !newRace.distance || !profile) {
      alert('Veuillez remplir tous les champs de la course');
      return;
    }
    
    const updatedCourses = [...(profile.courses || []), newRace];
    
    const { error } = await supabase
      .from('profiles')
      .update({ courses: updatedCourses })
      .eq('id', profile.id);
    
    if (error) {
      alert('Erreur lors de la sauvegarde: ' + error.message);
    } else {
      setProfile({ ...profile, courses: updatedCourses });
      setNewRace({ nom: '', date: '', distance: '' });
      setShowRaceModal(false);
    }
  }

  async function confirmDeleteRace() {
    if (raceToDelete === null || !profile) return;
    
    const updatedCourses = profile.courses?.filter((_, i) => i !== raceToDelete) || [];
    
    const { error } = await supabase
      .from('profiles')
      .update({ courses: updatedCourses })
      .eq('id', profile.id);
    
    if (error) {
      alert('Erreur lors de la suppression: ' + error.message);
    } else {
      setProfile({ ...profile, courses: updatedCourses });
      setRaceToDelete(null);
    }
  }

  function getWeekStats(weekStart: Date) {
    const weekDates = getWeekDates(weekStart);
    let totalTime = 0;
    let totalDistance = 0;

    weekDates.forEach(date => {
      const dateStr = formatDate(date);
      const session = sessions[dateStr];
      if (session?.is_completed) {
        totalTime += session.completed_time_minutes || 0;
        totalDistance += session.completed_distance_km || 0;
      }
    });

    return { totalTime, totalDistance };
  }

  function renderCell(date: Date, isPast: boolean, raceOnDate?: Race) {
    const dateStr = formatDate(date);
    const session = sessions[dateStr];
    const bgColor = raceOnDate ? SESSION_COLORS.course : (session ? SESSION_COLORS[session.session_type] : SESSION_COLORS.repos);
    
    // Déterminer si c'est dans le passé en comparant avec aujourd'hui (pas la semaine)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);
    const isInPast = currentDate <= today;

    return (
      <td key={dateStr} className="border p-2 align-top">
        <div className="text-xs text-gray-600 font-semibold mb-2">{date.getDate()}/{date.getMonth() + 1}</div>
        
        {/* Course prévue (prioritaire) */}
        {raceOnDate && (
          <div className={`${SESSION_COLORS.course} p-2 rounded mb-2`}>
            <div className="font-semibold text-sm">
              🏁 {raceOnDate.nom}
            </div>
            <div className="text-xs mt-1">{raceOnDate.distance}</div>
          </div>
        )}
        
        {/* Séance planifiée (si existe et pas de course) */}
        {!raceOnDate && session && (
          <div className={`${bgColor} p-2 rounded mb-2`}>
            <div className="font-semibold text-sm">
              {session.session_type}
            </div>
            {session.description && (
              <div className="text-xs mt-1">{session.description}</div>
            )}
          </div>
        )}

        {/* Affichage du réalisé ou bouton d'ajout */}
        {(session?.is_completed || session?.completed_notes) ? (
          <div className="bg-green-100 border-2 border-green-400 p-2 rounded">
            <div className="font-semibold text-xs text-green-800">
              {isInPast ? '✓ Réalisé' : '📝 Note'}
            </div>
            {session.completed_time_minutes && (
              <div className="text-xs">⏱️ {session.completed_time_minutes} min</div>
            )}
            {session.completed_distance_km && (
              <div className="text-xs">📏 {session.completed_distance_km} km</div>
            )}
            {session.completed_notes && (
              <div className="text-xs mt-1 text-gray-700 line-clamp-2">{session.completed_notes}</div>
            )}
            <button
              onClick={() => startEditing(dateStr, date)}
              className="text-xs text-blue-600 hover:underline mt-1"
            >
              Modifier
            </button>
          </div>
        ) : (
          <button
            onClick={() => startEditing(dateStr, date)}
            className="w-full text-xs bg-blue-500 text-white py-1 rounded hover:bg-blue-600"
          >
            {isInPast ? '+ Ajouter ce qui a été fait' : '+ Ajouter une note'}
          </button>
        )}
      </td>
    );
  }

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center">Profil non trouvé</div>;
  }

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête avec objectif et courses */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            {profile.objectif && (
              <div className="mb-4">
                <span className="text-lg font-bold">🎯 Objectif : </span>
                <span className="text-lg">{profile.objectif}</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="bg-blue-50 p-4 rounded">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-sm">🏁 Courses prévues</div>
                <button
                  onClick={() => setShowRaceModal(true)}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  + Ajouter
                </button>
              </div>
              {profile.courses && profile.courses.length > 0 ? (
                <div className="space-y-2">
                  {[...profile.courses]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((race: Race, idx: number) => {
                      const originalIdx = profile.courses!.indexOf(race);
                      return (
                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded">
                          <div className="text-sm">
                            {new Date(race.date).toLocaleDateString('fr-FR')}: <span className="font-semibold">{race.nom}</span>, {race.distance} km
                          </div>
                          <button
                            onClick={() => setRaceToDelete(originalIdx)}
                            className="text-red-600 hover:text-red-800 text-lg"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">Aucune course prévue</div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <a
            href="/athlete/profile"
            className="text-sm text-blue-600 hover:underline"
          >
            → Éditer mon profil
          </a>
        </div>
      </div>

      {/* Planning */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Mon planning d'entraînement</h2>
        
        {allWeeks.map((weekStart, weekIdx) => {
          const weekDates = getWeekDates(weekStart);
          const isPast = weekIdx < pastWeeks.length;
          const { totalTime, totalDistance } = getWeekStats(weekStart);
          
          return (
            <div key={weekIdx} className="mb-6">
              <h3 className={`font-semibold mb-3 px-3 py-2 rounded ${isPast ? 'bg-gray-200' : 'bg-blue-100'}`}>
                {isPast ? '📊 ' : '📅 '}Semaine du {getWeekLabel(weekStart)}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {DAYS.map((day, i) => (
                        <th key={i} className="border bg-gray-100 p-2 text-xs font-semibold w-[13%]">
                          {day}
                        </th>
                      ))}
                      <th className="border bg-yellow-100 p-2 text-xs font-semibold w-[9%]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {weekDates.map((date) => renderCell(date, isPast, getRaceOnDate(date)))}
                      <td className="border bg-yellow-50 p-3 align-middle text-center">
                        <div className="font-bold text-sm mb-1">⏱️ {totalTime.toFixed(0)} min</div>
                        <div className="font-bold text-sm">📏 {totalDistance.toFixed(1)} km</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>

      {/* Modale d'édition */}
      {mounted && editingCell && editingDate && document.getElementById('modal-root') && createPortal(
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
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxWidth: '48rem',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* En-tête */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <div>
                  <h2 className="text-xl font-bold">
                    {new Date(editingDate).getTime() <= new Date().setHours(0,0,0,0) 
                      ? '✓ Ce que j\'ai fait'
                      : '📝 Ajouter une note'
                    }
                  </h2>
                  <p className="text-sm text-gray-600">
                    {editingDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Séance planifiée */}
              {sessions[editingCell] && sessions[editingCell].description && (
                <div className="mb-6 p-4 bg-gray-50 rounded">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Séance planifiée :</div>
                  <div className="text-sm">{sessions[editingCell].description}</div>
                </div>
              )}

              {/* Formulaire */}
              <div className="space-y-4">
                {new Date(editingDate).getTime() <= new Date().setHours(0,0,0,0) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ⏱️ Temps de course (minutes)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 45"
                        value={editData.completed_time_minutes}
                        onChange={(e) => setEditData(prev => ({ ...prev, completed_time_minutes: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📏 Distance parcourue (km)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 8.5"
                        value={editData.completed_distance_km}
                        onChange={(e) => setEditData(prev => ({ ...prev, completed_distance_km: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {new Date(editingDate).getTime() <= new Date().setHours(0,0,0,0)
                      ? '📝 Notes sur la séance'
                      : '📝 Notes / Empêchements'
                    }
                  </label>
                  <textarea
                    placeholder={new Date(editingDate).getTime() <= new Date().setHours(0,0,0,0)
                      ? "Comment s'est passée la séance ? Sensations ? Difficultés ?"
                      : "Notes, empêchements, indisponibilités..."
                    }
                    value={editData.completed_notes}
                    onChange={(e) => setEditData(prev => ({ ...prev, completed_notes: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={6}
                  />
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const isInPast = new Date(editingDate).getTime() <= new Date().setHours(0,0,0,0);
                    saveCompletion(editingCell, isInPast);
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root')!
      )}

      {/* Modale d'ajout de course */}
      {mounted && showRaceModal && document.getElementById('modal-root') && createPortal(
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
            if (e.target === e.currentTarget) setShowRaceModal(false);
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxWidth: '32rem',
              width: '100%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <h2 className="text-xl font-bold">🏁 Ajouter une course</h2>
                <button
                  onClick={() => setShowRaceModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la course
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Marathon de Paris"
                    value={newRace.nom}
                    onChange={(e) => setNewRace({ ...newRace, nom: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newRace.date}
                    onChange={(e) => setNewRace({ ...newRace, date: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Distance
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 10km, Semi-marathon, Marathon"
                    value={newRace.distance}
                    onChange={(e) => setNewRace({ ...newRace, distance: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowRaceModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={addRace}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root')!
      )}

      {/* Modale de confirmation de suppression */}
      {mounted && raceToDelete !== null && document.getElementById('modal-root') && createPortal(
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
            if (e.target === e.currentTarget) setRaceToDelete(null);
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
                  Êtes-vous sûr de vouloir supprimer cette course ?
                  {profile?.courses?.[raceToDelete] && (
                    <span className="block mt-2 font-semibold">
                      {profile.courses[raceToDelete].nom} - {profile.courses[raceToDelete].distance}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setRaceToDelete(null)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteRace}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root')!
      )}
    </>
  );
}