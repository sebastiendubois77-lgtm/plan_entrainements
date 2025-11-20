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
        full_name: profile.full_name || null,
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900">Mon profil</h1>
          <button
            onClick={() => router.push('/athlete/dashboard')}
            className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm"
          >
            ← Retour au plan
          </button>
        </div>

        <form onSubmit={handleSave}>
          {/* Photo Section */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <h2 className="text-xl font-bold mb-6 text-gray-900">Photo de profil</h2>
            <div className="flex items-center gap-8">
              <div className="w-32 h-32 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt="Photo de profil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Aucune photo</div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-3">Choisir une nouvelle photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-sm text-gray-500 mt-2">{uploading ? 'Téléchargement en cours...' : 'Maximum 2 Mo • Formats acceptés: JPG, PNG, WebP'}</p>
              </div>
            </div>
          </div>

          {/* Personal Info Section */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <h2 className="text-xl font-bold mb-6 text-gray-900">Informations personnelles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Prénom & Nom</label>
                <input
                  type="text"
                  value={profile?.full_name || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full p-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Votre nom complet"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Date de naissance</label>
                <input
                  type="date"
                  value={dateNaissance}
                  onChange={e => setDateNaissance(e.target.value)}
                  className="w-full p-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Objective Section */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <h2 className="text-xl font-bold mb-6 text-gray-900">Mon objectif</h2>
            <textarea
              value={objectif}
              onChange={e => setObjectif(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Ex: Courir un semi-marathon en moins de 2h"
            />
          </div>

          {/* Availability Section */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <h2 className="text-xl font-bold mb-6 text-gray-900">Disponibilités</h2>
            
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-4">Jours disponibles pour m'entraîner</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {JOURS.map(jour => (
                  <label key={jour} className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${joursDisponibles.includes(jour) ? 'bg-blue-50 border-blue-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      checked={joursDisponibles.includes(jour)}
                      onChange={() => toggleJour(jour)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="font-medium">{jour}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Nombre d'entraînements par semaine: <span className="text-blue-600 text-lg">{entrainementsParSemaine}</span>
              </label>
              <input
                type="range"
                min="1"
                max="7"
                value={entrainementsParSemaine}
                onChange={e => setEntrainementsParSemaine(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>1 séance</span>
                <span>7 séances</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => router.push('/athlete/dashboard')}
              className="px-8 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium shadow-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium shadow-sm"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
