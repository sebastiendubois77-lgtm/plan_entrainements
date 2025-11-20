'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type Race = {
  nom: string;
  date: string;
  distance: string;
};

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
    if (joursDisponibles.includes(jour)) {
      setJoursDisponibles(joursDisponibles.filter(j => j !== jour));
    } else {
      setJoursDisponibles([...joursDisponibles, jour]);
    }
  }



  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Format non supporté. Utilisez JPG, PNG, GIF ou WebP');
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file size (2 MB max)
    const maxSize = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`Image trop volumineuse (${sizeMB} Mo). Taille maximale : 2 Mo\n\nConseil : réduisez la résolution ou compressez l'image avant de l'uploader.`);
      e.target.value = ''; // Reset input
      return;
    }

    setUploading(true);

    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        // Check if error is due to file size on server side
        if (uploadError.message.includes('size') || uploadError.message.includes('limit')) {
          throw new Error('Fichier trop volumineux. Maximum 2 Mo.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setPhotoUrl(publicUrl);
      alert('Photo téléchargée avec succès !');
    } catch (error: any) {
      alert('Erreur lors du téléchargement: ' + error.message);
      e.target.value = ''; // Reset input
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        photo_url: photoUrl || null,
        date_naissance: dateNaissance || null,
        jours_disponibles: joursDisponibles,
        objectif: objectif || null,
        entrainements_par_semaine: entrainementsParSemaine
      })
      .eq('id', profile.id);

    setSaving(false);

    if (error) {
      alert('Erreur lors de la sauvegarde: ' + error.message);
      return;
    }

    alert('Profil mis à jour avec succès !');
    router.push('/athlete/dashboard');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-extrabold">Mon profil</h1>
        <button
          onClick={() => router.push('/athlete/dashboard')}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          ← Retour au plan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 flex flex-col items-center">
            <div className="w-32 h-32 bg-gray-100 rounded-full overflow-hidden mb-4">
              {photoUrl ? (
                <img src={photoUrl} alt="Photo de profil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No photo</div>
              )}
            </div>
            <label className="block text-sm font-medium mb-2">Changer la photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-500 mt-2">{uploading ? 'Téléchargement...' : 'Max 2 Mo • JPG/PNG/WebP'}</p>
          </div>

          <div className="md:col-span-2">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Prénom & Nom</label>
                  <input
                    type="text"
                    value={profile?.full_name || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date de naissance</label>
                  <input
                    type="date"
                    value={dateNaissance}
                    onChange={e => setDateNaissance(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Objectif</label>
                <textarea
                  value={objectif}
                  onChange={e => setObjectif(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  rows={3}
                  placeholder="Ex: Courir un semi-marathon en moins de 2h"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Jours disponibles</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {JOURS.map(jour => (
                    <label key={jour} className={`flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50 ${joursDisponibles.includes(jour) ? 'bg-blue-50 border-blue-200' : ''}`}>
                      <input
                        type="checkbox"
                        checked={joursDisponibles.includes(jour)}
                        onChange={() => toggleJour(jour)}
                        className="w-4 h-4"
                      />
                      <span>{jour}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nombre d'entraînements / semaine: <span className="font-semibold">{entrainementsParSemaine}</span></label>
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={entrainementsParSemaine}
                  onChange={e => setEntrainementsParSemaine(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/athlete/dashboard')}
                  className="px-6 py-3 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
