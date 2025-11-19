'use client';
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Props = {
  athletes: Array<{ id: string; name: string; email?: string }>;
  coachId?: string | null;
  onRefresh?: () => void;
};

export default function AthleteList({ athletes = [], coachId, onRefresh }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  // sport removed: plans are running-only
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  async function handleResendInvite(athleteEmail: string) {
    if (!confirm(`Renvoyer l'email d'invitation à ${athleteEmail} ?`)) return;
    setResendingEmail(athleteEmail);
    try {
      const res = await fetch('/api/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: athleteEmail })
      });
      const data = await res.json();
      setResendingEmail(null);
      if (!res.ok) return alert('Erreur: ' + JSON.stringify(data));
      alert('Email renvoyé avec succès');
    } catch (err: any) {
      setResendingEmail(null);
      alert('Erreur: ' + (err.message || String(err)));
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) return alert('Nom et email requis');
    setLoading(true);
    try {
      const res = await fetch('/api/create-athlete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, coachId })
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) return alert('Erreur: ' + JSON.stringify(data));
      setName(''); setEmail('');
      if (onRefresh) onRefresh();
      // Temporarily show invite link (TODO: send by email)
      if (data.message === 'invite_created' && data.inviteLink) {
        await navigator.clipboard.writeText(data.inviteLink);
        alert(`Athlète créé ! Le lien d'invitation a été copié dans le presse-papier.\n\nEnvoyez-le à l'athlète :\n\n${data.inviteLink}\n\nLe lien est valide pendant 7 jours.`);
      }
    } catch (err: any) {
      setLoading(false);
      alert('Erreur: ' + (err.message || String(err)));
    }
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-4 grid grid-cols-2 gap-2">
        <input className="p-2 border rounded" placeholder="Nom" value={name} onChange={e=>setName(e.target.value)} />
        <input className="p-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <div className="col-span-3 text-right">
          <button className="px-3 py-1 bg-blue-600 text-white rounded" disabled={loading}>{loading ? 'Ajout...' : 'Ajouter athlète'}</button>
        </div>
      </form>

      <ul>
        {athletes.length === 0 && <li>Aucun athlète</li>}
        {athletes.map(a => (
          <li key={a.id} className="py-2 border-b">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold">{a.name}</div>
                {a.email && <div className="text-sm text-gray-500">{a.email}</div>}
              </div>
              {a.email && (
                <button
                  onClick={() => handleResendInvite(a.email!)}
                  disabled={resendingEmail === a.email}
                  className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded disabled:bg-gray-100"
                >
                  {resendingEmail === a.email ? 'Envoi...' : 'Renvoyer email'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}