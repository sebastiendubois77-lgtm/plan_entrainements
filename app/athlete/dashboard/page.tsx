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
    
    // Déterminer si c'est dans le passé en comparant avec aujourd'hui (pas la semaine)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);
    const isInPast = currentDate <= today;

    return (
      <td key={dateStr} className="border border-slate-200 p-3 align-top bg-white hover:bg-slate-50 transition-colors">
        {/* En-tête de date */}
        <div className="flex items-center justify-center mb-3">
          <div className="bg-slate-100 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-full border border-slate-200">
            {date.getDate()}/{date.getMonth() + 1}
          </div>
        </div>
        
        {/* Course prévue (prioritaire) */}
        {raceOnDate && (
          <div 
            className="p-3 rounded-lg mb-3 shadow-md border-2 border-blue-300"
            style={{ backgroundColor: '#BFDBFE' }}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">🏁</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-blue-900 truncate">
                  {raceOnDate.nom}
                </div>
                <div className="text-xs text-blue-700 mt-1 font-medium">{raceOnDate.distance}</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Séance planifiée (si existe et pas de course) */}
        {!raceOnDate && session && (
          <div
            className="p-3 rounded-lg mb-3 shadow-sm border border-slate-200"
            style={{
              backgroundColor: (
                session.session_type === 'endurance' ? '#FEF3C7' :
                session.session_type === 'resistance' ? '#FED7AA' :
                session.session_type === 'vitesse' ? '#FECACA' :
                session.session_type === 'vma' ? '#E9D5FF' :
                session.session_type === 'course' ? '#BFDBFE' :
                '#F3F4F6'
              )
            }}
          >
            <div className="font-bold text-sm text-slate-800 capitalize mb-1">
              {session.session_type}
            </div>
            {session.description && (
              <div className="text-xs text-slate-700 line-clamp-2">{session.description}</div>
            )}
          </div>
        )}

        {/* Affichage du réalisé ou bouton d'ajout */}
        {(session?.is_completed || session?.completed_notes) ? (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 p-3 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{isInPast ? '✓' : '📝'}</span>
              <div className="font-bold text-xs text-green-800">
                {isInPast ? 'Réalisé' : 'Note'}
              </div>
            </div>
            <div className="space-y-1">
              {session.completed_time_minutes && (
                <div className="flex items-center gap-1 text-xs text-slate-700">
                  <span>⏱️</span>
                  <span className="font-semibold">{session.completed_time_minutes} min</span>
                </div>
              )}
              {session.completed_distance_km && (
                <div className="flex items-center gap-1 text-xs text-slate-700">
                  <span>📏</span>
                  <span className="font-semibold">{session.completed_distance_km} km</span>
                </div>
              )}
              {session.completed_notes && (
                <div className="text-xs mt-2 text-slate-600 line-clamp-2 italic">
                  "{session.completed_notes}"
                </div>
              )}
            </div>
            <button
              onClick={() => startEditing(dateStr, date)}
              className="mt-3 w-full text-xs text-green-700 hover:text-green-800 font-medium bg-white hover:bg-green-50 py-1.5 rounded border border-green-300 transition-colors"
            >
              ✏️ Modifier
            </button>
          </div>
        ) : (
          <button
            onClick={() => startEditing(dateStr, date)}
            className="w-full text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            {isInPast ? '+ Ajouter' : '+ Note'}
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="p-6 max-w-7xl mx-auto">
          {/* En-tête avec objectif et courses */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-8">
            {/* Bannière gradient */}
            <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Objectif */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                      🎯
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Mon Objectif</h2>
                      <p className="text-xl font-bold text-slate-800">{profile.objectif || 'Non défini'}</p>
                    </div>
                  </div>
                  <a
                    href="/athlete/profile"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors group"
                  >
                    <span>→ Éditer mon profil</span>
                    <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                </div>

                {/* Courses prévues */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🏁</span>
                      <h3 className="font-bold text-slate-800">Courses prévues</h3>
                    </div>
                    <button
                      onClick={() => setShowRaceModal(true)}
                      className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                    >
                      + Ajouter
                    </button>
                  </div>
                  {profile.courses && profile.courses.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {[...profile.courses]
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((race: Race, idx: number) => {
                          const originalIdx = profile.courses!.indexOf(race);
                          return (
                            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-slate-100">
                              <div className="text-sm flex-1">
                                <span className="text-slate-600">{new Date(race.date).toLocaleDateString('fr-FR')}</span>
                                <span className="mx-2">•</span>
                                <span className="font-semibold text-slate-800">{race.nom}</span>
                                <span className="ml-2 text-blue-600 font-medium">{race.distance} km</span>
                              </div>
                              <button
                                onClick={() => setRaceToDelete(originalIdx)}
                                className="ml-3 text-red-500 hover:text-red-700 hover:bg-red-50 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 italic text-center py-4 bg-white rounded-lg border border-dashed border-slate-300">
                      Aucune course prévue
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Planning */}
          <div className="space-y-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent rounded-full"></div>
              <h2 className="text-2xl font-bold text-slate-800">Mon planning d'entraînement</h2>
              <div className="h-1 flex-1 bg-gradient-to-r from-slate-300 via-transparent to-transparent rounded-full"></div>
            </div>
            
            {allWeeks.map((weekStart, weekIdx) => {
              const weekDates = getWeekDates(weekStart);
              const isPast = weekIdx < pastWeeks.length;
              const { totalTime, totalDistance } = getWeekStats(weekStart);
              
              return (
                <div key={weekIdx} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow">
                  {/* En-tête de semaine */}
                  <div className={`px-6 py-4 flex items-center justify-between ${
                    isPast 
                      ? 'bg-gradient-to-r from-slate-100 to-slate-50' 
                      : 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{isPast ? '📊' : '📅'}</span>
                      <h3 className={`font-bold text-lg ${isPast ? 'text-slate-800' : 'text-white'}`}>
                        Semaine du {getWeekLabel(weekStart)}
                      </h3>
                    </div>
                    {!isPast && (
                      <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
                        <span className="text-sm font-medium text-white">À venir</span>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          {DAYS.map((day, i) => (
                            <th key={i} className="border-b-2 border-slate-200 p-3 text-xs font-bold text-slate-700 uppercase tracking-wide w-[13%]">
                              {day}
                            </th>
                          ))}
                          <th className="border-b-2 border-slate-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-3 text-xs font-bold text-slate-700 uppercase tracking-wide w-[9%]">
                            <div className="flex items-center justify-center gap-1">
                              <span>📊</span>
                              <span>Total</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {weekDates.map((date) => renderCell(date, isPast, getRaceOnDate(date)))}
                          <td className="border-l-2 border-slate-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 align-middle text-center">
                            <div className="space-y-2">
                              <div className="bg-white rounded-lg p-2 shadow-sm border border-amber-200">
                                <div className="text-xs text-slate-600 mb-1">Temps</div>
                                <div className="font-bold text-lg text-slate-800">{totalTime.toFixed(0)}<span className="text-sm text-slate-600 ml-1">min</span></div>
                              </div>
                              <div className="bg-white rounded-lg p-2 shadow-sm border border-amber-200">
                                <div className="text-xs text-slate-600 mb-1">Distance</div>
                                <div className="font-bold text-lg text-slate-800">{totalDistance.toFixed(1)}<span className="text-sm text-slate-600 ml-1">km</span></div>
                              </div>
                            </div>
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
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(30, 58, 138, 0.9) 100%)',
            backdropFilter: 'blur(8px)',
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
              borderRadius: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxWidth: '48rem',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bannière gradient */}
            <div className="h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-t-3xl"></div>
            
            <div className="p-8">
              {/* En-tête */}
              <div className="flex items-start justify-between mb-6 pb-6 border-b-2 border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                    {new Date(editingDate).getTime() <= new Date().setHours(0,0,0,0) ? '✓' : '📝'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">
                      {new Date(editingDate).getTime() <= new Date().setHours(0,0,0,0) 
                        ? 'Ce que j\'ai fait'
                        : 'Ajouter une note'
                      }
                    </h2>
                    <p className="text-sm text-slate-600 font-medium">
                      {editingDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center text-3xl transition-all"
                >
                  ×
                </button>
              </div>

              {/* Séance planifiée */}
              {sessions[editingCell] && sessions[editingCell].description && (
                <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-500 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📋</span>
                    <div className="text-sm font-bold text-slate-700 uppercase tracking-wide">Séance planifiée</div>
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed">{sessions[editingCell].description}</div>
                </div>
              )}

              {/* Formulaire */}
              <div className="space-y-5">
                {new Date(editingDate).getTime() <= new Date().setHours(0,0,0,0) && (
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                        <span className="text-xl">⏱️</span>
                        <span>Temps de course (minutes)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 45"
                        value={editData.completed_time_minutes}
                        onChange={(e) => setEditData(prev => ({ ...prev, completed_time_minutes: e.target.value }))}
                        className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                        <span className="text-xl">📏</span>
                        <span>Distance parcourue (km)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 8.5"
                        value={editData.completed_distance_km}
                        onChange={(e) => setEditData(prev => ({ ...prev, completed_distance_km: e.target.value }))}
                        className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                    <span className="text-xl">📝</span>
                    <span>
                      {new Date(editingDate).getTime() <= new Date().setHours(0,0,0,0)
                        ? 'Notes sur la séance'
                        : 'Notes / Empêchements'
                      }
                    </span>
                  </label>
                  <textarea
                    placeholder={new Date(editingDate).getTime() <= new Date().setHours(0,0,0,0)
                      ? "Comment s'est passée la séance ? Sensations ? Difficultés ?"
                      : "Notes, empêchements, indisponibilités..."
                    }
                    value={editData.completed_notes}
                    onChange={(e) => setEditData(prev => ({ ...prev, completed_notes: e.target.value }))}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    rows={6}
                  />
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-4 mt-8 pt-6 border-t-2 border-slate-100">
                <button
                  onClick={closeModal}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-bold text-base transition-all hover:shadow-md"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const isInPast = new Date(editingDate).getTime() <= new Date().setHours(0,0,0,0);
                    saveCompletion(editingCell, isInPast);
                  }}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold text-base shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                >
                  💾 Enregistrer
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
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(30, 58, 138, 0.9) 100%)',
            backdropFilter: 'blur(8px)',
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
              borderRadius: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxWidth: '32rem',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-t-3xl"></div>
            
            <div className="p-8">
              <div className="flex items-start justify-between mb-6 pb-6 border-b-2 border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                    🏁
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Ajouter une course</h2>
                </div>
                <button
                  onClick={() => setShowRaceModal(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center text-3xl transition-all"
                >
                  ×
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    Nom de la course
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Marathon de Paris"
                    value={newRace.nom}
                    onChange={(e) => setNewRace({ ...newRace, nom: e.target.value })}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newRace.date}
                    onChange={(e) => setNewRace({ ...newRace, date: e.target.value })}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    Distance
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 10km, Semi-marathon, Marathon"
                    value={newRace.distance}
                    onChange={(e) => setNewRace({ ...newRace, distance: e.target.value })}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t-2 border-slate-100">
                <button
                  onClick={() => setShowRaceModal(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-bold transition-all hover:shadow-md"
                >
                  Annuler
                </button>
                <button
                  onClick={addRace}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                >
                  ✓ Ajouter
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
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(127, 29, 29, 0.9) 100%)',
            backdropFilter: 'blur(8px)',
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
              borderRadius: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxWidth: '28rem',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-3 bg-gradient-to-r from-red-500 via-orange-500 to-red-600 rounded-t-3xl"></div>
            
            <div className="p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                    ⚠️
                  </div>
                  <h2 className="text-2xl font-bold text-red-600">Confirmer la suppression</h2>
                </div>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <p className="text-slate-700 mb-3">
                    Êtes-vous sûr de vouloir supprimer cette course ?
                  </p>
                  {profile?.courses?.[raceToDelete] && (
                    <div className="bg-white p-3 rounded-lg border border-red-200">
                      <p className="font-bold text-slate-800">
                        {profile.courses[raceToDelete].nom}
                      </p>
                      <p className="text-sm text-slate-600">
                        {profile.courses[raceToDelete].distance} - {new Date(profile.courses[raceToDelete].date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setRaceToDelete(null)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-bold transition-all hover:shadow-md"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteRace}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                >
                  🗑️ Supprimer
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