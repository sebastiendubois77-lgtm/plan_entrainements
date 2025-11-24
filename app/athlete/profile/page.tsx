'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function AthleteProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [joursDisponibles, setJoursDisponibles] = useState<string[]>([]);
  const [objectif, setObjectif] = useState('');
  const [entrainementsParSemaine, setEntrainementsParSemaine] = useState(3);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/');
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_uid', session.user.id)
      .single();

    if (error || !data) {
      alert('Erreur lors du chargement du profil');
      setLoading(false);
      return;
    }

    setProfile(data);
    setPhotoUrl(data.photo_url || '');
    setDateNaissance(data.date_naissance || '');
    setJoursDisponibles(data.jours_disponibles || []);
    setObjectif(data.objectif || '');
    setEntrainementsParSemaine(data.entrainements_par_semaine || 3);
    setLoading(false);
  }

  function toggleJour(jour: string) {
    setJoursDisponibles(prev =>
      prev.includes(jour) ? prev.filter(j => j !== jour) : [...prev, jour]
    );
  }

  // Upload photo
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Format non supporté (JPG, PNG, GIF, WebP)');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image trop volumineuse (max. 2 Mo)');
      e.target.value = '';
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setPhotoUrl(publicUrl);
    } catch (error: any) {
      alert('Erreur upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  // Save
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name || null,
        photo_url: photoUrl,
        date_naissance: dateNaissance || null,
        jours_disponibles: joursDisponibles,
        objectif,
        entrainements_par_semaine: entrainementsParSemaine
      })
      .eq('id', profile.id);

    setSaving(false);

    if (error) return alert('Erreur lors de la sauvegarde : ' + error.message);

    alert('Profil mis à jour !');
    router.push('/athlete/dashboard');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500 text-lg">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Profil de l’athlète</h1>
          <button
            onClick={() => router.push('/athlete/dashboard')}
            className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-100"
          >
            ← Retour
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-10">

          {/* PHOTO */}
          <section className="bg-white rounded-xl shadow p-8">
            <h2 className="text-xl font-semibold mb-6">Photo de profil</h2>
            <div className="flex gap-8 items-center">
              
              <div className="w-28 h-28 rounded-full bg-gray-100 overflow-hidden shadow">
                {photoUrl ? (
                  <img src={photoUrl} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Aucune photo
                  </div>
                )}
              </div>

              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="block w-full border p-3 rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {uploading ? 'Téléchargement...' : 'Max 2 Mo • JPG, PNG, WebP'}
                </p>
              </div>
            </div>
          </section>

          {/* INFORMATIONS PERSONNELLES */}
          <section className="bg-white rounded-xl shadow p-8">
            <h2 className="text-xl font-semibold mb-6">Informations personnelles</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block mb-2 font-medium">Prénom</label>
                <input
                  type="text"
                  value={profile?.full_name || ''}
                  onChange={(e) => setProfile((prev: any) => ({ ...prev, full_name: e.target.value }))}
                  className="p-3 border rounded-lg w-full max-w-xs"
                  placeholder="Ton prénom"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Date de naissance</label>
                <input
                  type="date"
                  value={dateNaissance}
                  onChange={e => setDateNaissance(e.target.value)}
                  className="p-3 border rounded-lg w-full max-w-xs"
                />
              </div>

            </div>
          </section>

          {/* OBJECTIF */}
          <section className="bg-white rounded-xl shadow p-8">
            <h2 className="text-xl font-semibold mb-6">Ton objectif</h2>
            <textarea
              value={objectif}
              onChange={e => setObjectif(e.target.value)}
              className="w-full p-4 border rounded-lg min-h-[120px] resize-vertical"
              placeholder="Ex : Courir un semi-marathon..."
            />
          </section>

          {/* DISPONIBILITÉS */}
          <section className="bg-white rounded-xl shadow p-8">
            <h2 className="text-xl font-semibold mb-6">Disponibilités</h2>

            <div className="mb-6">
              <label className="block font-medium mb-3">Jours disponibles</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {JOURS.map(jour => (
                  <label
                    key={jour}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                      joursDisponibles.includes(jour)
                        ? 'bg-blue-50 border-blue-300'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={joursDisponibles.includes(jour)}
                      onChange={() => toggleJour(jour)}
                      className="w-5 h-5"
                    />
                    {jour}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium mb-3">Séances par semaine</label>
              <select
                value={entrainementsParSemaine}
                onChange={e => setEntrainementsParSemaine(Number(e.target.value))}
                className="p-3 border rounded-lg w-40"
              >
                {[1,2,3,4,5,6,7].map(n => (
                  <option key={n} value={n}>{n} séance{n>1?'s':''}</option>
                ))}
              </select>
            </div>
          </section>

          {/* ACTIONS */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/athlete/dashboard')}
              className="px-6 py-3 border rounded-lg bg-white hover:bg-gray-100"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow disabled:bg-gray-400"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}