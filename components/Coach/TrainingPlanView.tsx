'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type SessionType = 'repos' | 'endurance' | 'resistance' | 'vitesse' | 'vma' | 'course';

interface TrainingSession {
  id?: string;
  date: string;
  session_type: SessionType;
  description: string;
  is_completed?: boolean;
  completed_notes?: string;
}

interface Race {
  date: string;
  distance: string;
  nom: string;
}

interface Athlete {
  id: string;
  full_name: string;
  email: string;
  photo_url?: string;
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

export default function TrainingPlanView({ athlete }: { athlete: Athlete }) {
  const [sessions, setSessions] = useState<{ [date: string]: TrainingSession }>({});
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<string | null>(null);

  // Calculer les semaines à afficher
  const today = new Date();
  const currentMonday = getMonday(today);
  
  // 4 dernières semaines (historique)
  const pastWeeks: Date[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() - (i + 1) * 7);
    pastWeeks.push(weekStart);
  }
  
  // 4 prochaines semaines (futur)
  const futureWeeks: Date[] = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() + i * 7);
    futureWeeks.push(weekStart);
  }

  const allWeeks = [...pastWeeks, ...futureWeeks];

  async function fetchSessions() {
    setLoading(true);
    const startDate = formatDate(pastWeeks[0]);
    const endDate = formatDate(new Date(futureWeeks[futureWeeks.length - 1].getTime() + 6 * 24 * 60 * 60 * 1000));

    const { data, error } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('athlete_id', athlete.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (!error && data) {
      const sessionsMap: { [date: string]: TrainingSession } = {};
      data.forEach((s: any) => {
        sessionsMap[s.date] = s;
      });
      setSessions(sessionsMap);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchSessions();
  }, [athlete.id]);

  async function saveSession(date: string, sessionType: SessionType, description: string) {
    const session = sessions[date];
    
    if (session?.id) {
      // Update
      const { error } = await supabase
        .from('training_sessions')
        .update({ session_type: sessionType, description })
        .eq('id', session.id);
      
      if (error) {
        alert('Erreur lors de la mise à jour: ' + error.message);
        console.error('Error updating session:', error);
      } else {
        setSessions(prev => ({
          ...prev,
          [date]: { ...prev[date], session_type: sessionType, description }
        }));
      }
    } else {
      // Insert
      const { data, error } = await supabase
        .from('training_sessions')
        .insert([{
          athlete_id: athlete.id,
          date,
          session_type: sessionType,
          description,
          is_completed: false
        }])
        .select()
        .single();
      
      if (error) {
        alert('Erreur lors de la création: ' + error.message);
        console.error('Error creating session:', error, 'athlete.id:', athlete.id);
      } else if (data) {
        setSessions(prev => ({ ...prev, [date]: data }));
      }
    }
  }

  function renderCell(date: Date, isPast: boolean, raceOnDate?: Race) {
    const dateStr = formatDate(date);
    const session = sessions[dateStr];
    const isEditing = editingCell === dateStr;
    const bgColor = raceOnDate ? SESSION_COLORS.course : (session ? SESSION_COLORS[session.session_type] : SESSION_COLORS.repos);

    if (isPast) {
      // Historique : afficher planifié + réalisé (non éditable)
      return (
        <td key={dateStr} className="border p-2 align-top">
          <div className="text-xs text-gray-600 mb-1">{date.getDate()}/{date.getMonth() + 1}</div>
          {session ? (
            <>
              {/* Planifié */}
              <div className={`${bgColor} p-1 rounded mb-1 text-xs`}>
                <div className="font-semibold">{session.session_type}</div>
                <div className="text-xs truncate">{session.description}</div>
              </div>
              {/* Réalisé */}
              {session.is_completed && (
                <div className="bg-green-100 p-1 rounded text-xs border-2 border-green-400">
                  <div className="font-semibold">✓ Réalisé</div>
                  <div className="text-xs truncate">{session.completed_notes}</div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-gray-400">Repos</div>
          )}
        </td>
      );
    }

    // Futur : éditable
    return (
      <td key={dateStr} className="border p-2 align-top">
        <div className="text-xs text-gray-600 mb-1">{date.getDate()}/{date.getMonth() + 1}</div>
        
        {raceOnDate && (
          <div className={`${SESSION_COLORS.course} p-2 rounded mb-1 text-xs font-semibold`}>
            🏁 {raceOnDate.nom}
            <div>{raceOnDate.distance}</div>
          </div>
        )}
        
        {!raceOnDate && isEditing ? (
          <div className="space-y-1">
            <select
              value={session?.session_type || 'repos'}
              onChange={(e) => {
                const newType = e.target.value as SessionType;
                setSessions(prev => ({
                  ...prev,
                  [dateStr]: { ...prev[dateStr], date: dateStr, session_type: newType, description: prev[dateStr]?.description || '' }
                }));
              }}
              className="w-full text-xs p-1 border rounded"
            >
              <option value="repos">Repos</option>
              <option value="endurance">Endurance</option>
              <option value="resistance">Résistance</option>
              <option value="vitesse">Vitesse</option>
              <option value="vma">VMA</option>
            </select>
            <textarea
              value={session?.description || ''}
              onChange={(e) => {
                setSessions(prev => ({
                  ...prev,
                  [dateStr]: { ...prev[dateStr], date: dateStr, session_type: prev[dateStr]?.session_type || 'repos', description: e.target.value }
                }));
              }}
              placeholder="Description de la séance"
              className="w-full text-xs p-1 border rounded"
              rows={3}
            />
            <button
              onClick={() => {
                const currentSession = sessions[dateStr] || { date: dateStr, session_type: 'repos', description: '' };
                saveSession(dateStr, currentSession.session_type, currentSession.description);
                setEditingCell(null);
              }}
              className="w-full text-xs bg-blue-500 text-white py-1 rounded hover:bg-blue-600"
            >
              Sauvegarder
            </button>
          </div>
        ) : !raceOnDate && session ? (
          <div
            onClick={() => setEditingCell(dateStr)}
            className={`${bgColor} p-2 rounded cursor-pointer hover:opacity-80 min-h-[60px]`}
          >
            <div className="font-semibold text-xs">{session.session_type}</div>
            <div className="text-xs mt-1">{session.description}</div>
          </div>
        ) : !raceOnDate ? (
          <div
            onClick={() => {
              setSessions(prev => ({
                ...prev,
                [dateStr]: { date: dateStr, session_type: 'repos', description: '' }
              }));
              setEditingCell(dateStr);
            }}
            className="bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100 min-h-[60px] border-2 border-dashed border-gray-300 flex items-center justify-center"
          >
            <div className="text-xs text-gray-400">+ Ajouter séance</div>
          </div>
        ) : null}
      </td>
    );
  }

  // Trouver les courses dans la période
  function getRaceOnDate(date: Date): Race | undefined {
    const dateStr = formatDate(date);
    return athlete.courses?.find((r: Race) => r.date === dateStr);
  }

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="p-6">
      {/* En-tête athlète */}
      <div className="bg-white rounded-lg shadow p-6 mb-6 flex items-start gap-4">
        {athlete.photo_url && (
          <img
            src={athlete.photo_url}
            alt={athlete.full_name}
            className="w-24 h-24 rounded-full object-cover"
          />
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">{athlete.full_name || athlete.email}</h1>
          {athlete.objectif && (
            <p className="text-gray-700">
              <span className="font-semibold">Objectif :</span> {athlete.objectif}
            </p>
          )}
        </div>
      </div>

      {/* Historique : 4 dernières semaines */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">📊 Historique (4 dernières semaines)</h2>
        <div className="overflow-x-auto">
          {pastWeeks.map((weekStart, weekIdx) => {
            const weekDates = getWeekDates(weekStart);
            return (
              <div key={weekIdx} className="mb-4">
                <h3 className="font-semibold text-sm mb-2 bg-gray-200 px-2 py-1 rounded">
                  Semaine {getWeekLabel(weekStart)}
                </h3>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {DAYS.map((day, i) => (
                        <th key={i} className="border bg-gray-100 p-2 text-xs">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {weekDates.map((date) => renderCell(date, true, getRaceOnDate(date)))}
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      {/* Futur : 4 prochaines semaines */}
      <div>
        <h2 className="text-xl font-bold mb-4">📅 Planning (4 prochaines semaines)</h2>
        <div className="overflow-x-auto">
          {futureWeeks.map((weekStart, weekIdx) => {
            const weekDates = getWeekDates(weekStart);
            return (
              <div key={weekIdx} className="mb-4">
                <h3 className="font-semibold text-sm mb-2 bg-blue-100 px-2 py-1 rounded">
                  Semaine {getWeekLabel(weekStart)}
                </h3>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {DAYS.map((day, i) => (
                        <th key={i} className="border bg-gray-100 p-2 text-xs">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {weekDates.map((date) => renderCell(date, false, getRaceOnDate(date)))}
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
