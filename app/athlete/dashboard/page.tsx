'use client';
import React, { useEffect, useState } from 'react';
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
  endurance: 'bg-yellow-200',
  resistance: 'bg-orange-300',
  vitesse: 'bg-red-300',
  vma: 'bg-purple-300',
  course: 'bg-blue-300'
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
  const [editData, setEditData] = useState<{
    completed_notes: string;
    completed_time_minutes: string;
    completed_distance_km: string;
  }>({ completed_notes: '', completed_time_minutes: '', completed_distance_km: '' });

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
        setEditingCell(null);
        setEditData({ completed_notes: '', completed_time_minutes: '', completed_distance_km: '' });
      }
    } else if (profile) {
      // Create new session (libre, pas planifié par le coach)
      const { data, error } = await supabase
        .from('training_sessions')
        .insert([{
          athlete_id: profile.id,
          date,
          session_type: 'repos',
          description: 'Séance libre',
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
        setEditingCell(null);
        setEditData({ completed_notes: '', completed_time_minutes: '', completed_distance_km: '' });
      }
    }
  }

  function startEditing(date: string) {
    const session = sessions[date];
    setEditingCell(date);
    setEditData({
      completed_notes: session?.completed_notes || '',
      completed_time_minutes: session?.completed_time_minutes?.toString() || '',
      completed_distance_km: session?.completed_distance_km?.toString() || ''
    });
  }

  function getRaceOnDate(date: Date): Race | undefined {
    const dateStr = formatDate(date);
    return profile?.courses?.find((r: Race) => r.date === dateStr);
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
    const isEditing = editingCell === dateStr;
    const bgColor = raceOnDate ? SESSION_COLORS.course : (session ? SESSION_COLORS[session.session_type] : SESSION_COLORS.repos);

    return (
      <td key={dateStr} className="border p-2 align-top">
        <div className="text-xs text-gray-600 font-semibold mb-2">{date.getDate()}/{date.getMonth() + 1}</div>
        
        {/* Séance planifiée (si existe) */}
        {session && session.description && (
          <div className={`${bgColor} p-2 rounded mb-2`}>
            <div className="font-semibold text-sm">
              {raceOnDate ? `🏁 ${raceOnDate.nom}` : session.session_type}
            </div>
            <div className="text-xs mt-1">{session.description}</div>
          </div>
        )}

        {/* Zone de saisie / affichage du réalisé */}
        {isEditing ? (
          <div className="bg-blue-50 border-2 border-blue-400 p-2 rounded space-y-2">
            <div className="font-semibold text-xs text-blue-800">
              {isPast ? '✓ Ce que j\'ai fait' : '📝 Note / Empêchement'}
            </div>
            {isPast && (
              <>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Temps (min)"
                  value={editData.completed_time_minutes}
                  onChange={(e) => setEditData(prev => ({ ...prev, completed_time_minutes: e.target.value }))}
                  className="w-full text-xs p-1 border rounded"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Distance (km)"
                  value={editData.completed_distance_km}
                  onChange={(e) => setEditData(prev => ({ ...prev, completed_distance_km: e.target.value }))}
                  className="w-full text-xs p-1 border rounded"
                />
              </>
            )}
            <textarea
              placeholder={isPast ? "Notes sur la séance..." : "Notes / empêchements..."}
              value={editData.completed_notes}
              onChange={(e) => setEditData(prev => ({ ...prev, completed_notes: e.target.value }))}
              className="w-full text-xs p-1 border rounded"
              rows={2}
            />
            <div className="flex gap-1">
              <button
                onClick={() => saveCompletion(dateStr, isPast)}
                className="flex-1 text-xs bg-blue-600 text-white py-1 rounded hover:bg-blue-700"
              >
                Sauvegarder
              </button>
              <button
                onClick={() => setEditingCell(null)}
                className="flex-1 text-xs bg-gray-400 text-white py-1 rounded hover:bg-gray-500"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (session?.is_completed || session?.completed_notes) ? (
          <div className="bg-green-100 border-2 border-green-400 p-2 rounded">
            <div className="font-semibold text-xs text-green-800">
              {isPast ? '✓ Réalisé' : '📝 Note'}
            </div>
            {session.completed_time_minutes && (
              <div className="text-xs">⏱️ {session.completed_time_minutes} min</div>
            )}
            {session.completed_distance_km && (
              <div className="text-xs">📏 {session.completed_distance_km} km</div>
            )}
            {session.completed_notes && (
              <div className="text-xs mt-1 text-gray-700">{session.completed_notes}</div>
            )}
            <button
              onClick={() => startEditing(dateStr)}
              className="text-xs text-blue-600 hover:underline mt-1"
            >
              Modifier
            </button>
          </div>
        ) : (
          <button
            onClick={() => startEditing(dateStr)}
            className="w-full text-xs bg-blue-500 text-white py-1 rounded hover:bg-blue-600"
          >
            {isPast ? '+ Ajouter ce qui a été fait' : '+ Ajouter une note'}
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
          <div>
            {profile.courses && profile.courses.length > 0 && (
              <div className="bg-blue-50 p-4 rounded">
                <div className="font-bold text-sm mb-2">🏁 Courses prévues</div>
                {profile.courses.map((race: Race, idx: number) => (
                  <div key={idx} className="text-sm mb-1">
                    <span className="font-semibold">{race.nom}</span> - {race.distance} 
                    <span className="text-gray-600 ml-2">
                      ({new Date(race.date).toLocaleDateString('fr-FR')})
                    </span>
                  </div>
                ))}
              </div>
            )}
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
  );
}