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
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Mon profil</h1>
        <button
          onClick={() => router.push('/athlete/dashboard')}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          ← Retour au plan
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Photo */}
        <div>
          <label className="block text-sm font-medium mb-2">Photo de profil</label>
          <div className="flex items-center gap-4">
            {photoUrl && (
              <img src={photoUrl} alt="Photo de profil" className="w-24 h-24 object-cover rounded-full" />
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading}
                className="w-full p-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                {uploading ? 'Téléchargement en cours...' : 'Maximum 5 Mo • JPG, PNG, GIF'}
              </p>
            </div>
          </div>
        </div>

        {/* Date de naissance */}
        <div>
          <label className="block text-sm font-medium mb-2">Date de naissance</label>
          <input
            type="date"
            value={dateNaissance}
            onChange={e => setDateNaissance(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Jours disponibles */}
        <div>
          <label className="block text-sm font-medium mb-2">Jours disponibles pour courir</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {JOURS.map(jour => (
              <label key={jour} className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
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

        {/* Nombre d'entraînements par semaine */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Nombre d'entraînements par semaine souhaité: {entrainementsParSemaine}
          </label>
          <input
            type="range"
            min="1"
            max="7"
            value={entrainementsParSemaine}
            onChange={e => setEntrainementsParSemaine(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>1</span>
            <span>7</span>
          </div>
        </div>

        {/* Objectif */}
        <div>
          <label className="block text-sm font-medium mb-2">Objectif</label>
          <textarea
            value={objectif}
            onChange={e => setObjectif(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="Ex: Courir un semi-marathon en moins de 2h"
          />
        </div>



        {/* Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/athlete/dashboard')}
            className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
