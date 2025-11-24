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
  completed_time_minutes?: number;
  completed_distance_km?: number;
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

// Extended athlete fields
interface AthleteExtended extends Athlete {
  entrainements_par_semaine?: number;
  jours_disponibles?: string[];
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

export default function TrainingPlanView({ athlete }: { athlete: AthleteExtended }) {
  const [sessions, setSessions] = useState<{ [date: string]: TrainingSession }>({});
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [historyWeeksOffset, setHistoryWeeksOffset] = useState(0);

  // Calculer les semaines à afficher
  const today = new Date();
  const currentMonday = getMonday(today);
  
  // 2 semaines passées (historique) + offset pour remonter dans le temps
  const pastWeeks: Date[] = [];
  for (let i = 1; i >= 0; i--) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() - ((i + 1 + historyWeeksOffset) * 7));
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
  }, [athlete.id, historyWeeksOffset]);

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

    if (isPast) {
      // Historique : afficher planifié + réalisé (non éditable)
      return (
        <td key={dateStr} className="border p-1 align-top text-xs" style={{ minHeight: '120px' }}>
          <div className="text-xs text-gray-600 mb-1 font-semibold">{date.getDate()}/{date.getMonth() + 1}</div>
          {session ? (
            <>
              {/* Planifié */}
              <div
                className="p-1 rounded mb-1 text-xs"
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
                <div className="font-semibold">{session.session_type}</div>
                {session.description && session.description !== 'Séance libre' && (
                  <div className="text-xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{session.description}</div>
                )}
              </div>
              {/* Réalisé */}
              {session.is_completed && (
                <div className="bg-green-100 p-1 rounded text-xs border border-green-400">
                  <div className="font-semibold">✓ {session.completed_time_minutes ? `${session.completed_time_minutes}min` : ''} {session.completed_distance_km ? `${session.completed_distance_km}km` : ''}</div>
                  {session.completed_notes && (
                    <div className="text-xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={session.completed_notes}>{session.completed_notes}</div>
                  )}
                </div>
              )}
            </>
          ) : raceOnDate ? (
            <div style={{ backgroundColor: '#BFDBFE' }} className="p-1 rounded text-xs">
              <div className="font-semibold">🏁 {raceOnDate.nom}</div>
              <div className="text-xs">{raceOnDate.distance}</div>
            </div>
          ) : (
            <div className="text-xs text-gray-400">-</div>
          )}
        </td>
      );
    }

    // Futur : éditable
    const dayName = DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]; // map JS Sunday=0 to our DAYS index
    const isAvailable = athlete.jours_disponibles ? athlete.jours_disponibles.includes(dayName) : false;

    return (
      <td key={dateStr} className="border p-1 align-top text-xs">
        <div className="text-xs text-gray-600 mb-1 font-semibold">{date.getDate()}/{date.getMonth() + 1}</div>
        
        {raceOnDate && (
          <div style={{ backgroundColor: '#BFDBFE' }} className="p-1 rounded mb-1 text-xs">
            <div className="font-semibold truncate">🏁 {raceOnDate.nom}</div>
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
            className="p-1 rounded cursor-pointer hover:opacity-80 min-h-[50px]"
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
            <div className="font-semibold text-xs truncate">{session.session_type}</div>
            <div className="text-xs mt-1 truncate" title={session.description === 'Séance libre' && session.completed_notes ? session.completed_notes : session.description}>
              {session.description === 'Séance libre' && session.completed_notes 
                ? session.completed_notes 
                : session.description}
            </div>
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
            className={`p-1 rounded cursor-pointer hover:opacity-90 min-h-[50px] border ${isAvailable ? 'border-green-300 bg-green-50' : 'border-dashed border-gray-300 bg-gray-50'} flex items-center justify-center`}
            title={isAvailable ? 'Jour disponible (préféré)' : 'Jour non indiqué comme disponible'}
          >
            <div className={`text-xs text-center ${isAvailable ? 'text-green-800' : 'text-gray-400'}`}>{isAvailable ? '+ Séance' : '+ Ajouter'}</div>
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
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="flex items-start gap-4 flex-1">
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
              {typeof athlete.entrainements_par_semaine !== 'undefined' && (
                <p className="text-gray-600 text-sm mt-1">Souhaite <span className="font-semibold">{athlete.entrainements_par_semaine}</span> séance{(athlete.entrainements_par_semaine || 0) > 1 ? 's' : ''} / semaine</p>
              )}
            </div>
          </div>
          
          {/* Courses prévues */}
          <div className="flex-1">
            <div style={{ backgroundColor: '#EFF6FF' }} className="p-4 rounded">
              <div className="font-bold text-sm mb-3">🏁 Courses prévues</div>
              {athlete.courses && athlete.courses.length > 0 ? (
                <div className="space-y-2">
                  {[...athlete.courses]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((race: Race, idx: number) => (
                      <div key={idx} className="bg-white p-2 rounded">
                        <div className="text-sm">
                          {new Date(race.date).toLocaleDateString('fr-FR')}: <span className="font-semibold">{race.nom}</span>, {race.distance} km
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">Aucune course prévue</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Historique : 2 semaines passées */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">📊 Historique</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setHistoryWeeksOffset(prev => prev + 1)}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              ← Semaine précédente
            </button>
            {historyWeeksOffset > 0 && (
              <button
                onClick={() => setHistoryWeeksOffset(prev => Math.max(0, prev - 1))}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
              >
                Semaine suivante →
              </button>
            )}
          </div>
        </div>
        <div>
          {pastWeeks.map((weekStart, weekIdx) => {
            const weekDates = getWeekDates(weekStart);
            return (
              <div key={weekIdx} className="mb-4">
                <h3 className="font-semibold text-sm mb-2 bg-gray-200 px-2 py-1 rounded">
                  Semaine {getWeekLabel(weekStart)}
                </h3>
                <table className="w-full border-collapse text-sm table-fixed">
                  <thead>
                    <tr>
                      {DAYS.map((day, i) => (
                        <th key={i} className="border bg-gray-100 p-1 text-xs">{day.substring(0, 3)}</th>
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
        <div>
          {futureWeeks.map((weekStart, weekIdx) => {
            const weekDates = getWeekDates(weekStart);
            return (
              <div key={weekIdx} className="mb-4">
                <h3 className="font-semibold text-sm mb-2 bg-blue-100 px-2 py-1 rounded">
                  Semaine {getWeekLabel(weekStart)}
                </h3>
                <table className="w-full border-collapse text-sm table-fixed">
                  <thead>
                    <tr>
                      {DAYS.map((day, i) => (
                        <th key={i} className="border bg-gray-100 p-1 text-xs">{day.substring(0, 3)}</th>
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
