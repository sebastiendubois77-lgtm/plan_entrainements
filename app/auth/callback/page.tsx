'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check if this is a password recovery flow from query params or hash
    const typeFromQuery = searchParams.get('type');
    const hash = window.location.hash;
    const isRecoveryFromHash = hash.includes('type=recovery') || hash.includes('type=magiclink');
    
    // Check for errors in hash
    const errorMatch = hash.match(/error=([^&]+)/);
    const errorDescMatch = hash.match(/error_description=([^&]+)/);
    
    if (errorMatch) {
      const errorCode = errorMatch[1];
      const errorDesc = errorDescMatch ? decodeURIComponent(errorDescMatch[1].replace(/\+/g, ' ')) : '';
      
      if (errorCode === 'access_denied' && hash.includes('otp_expired')) {
        setError('Le lien a expiré. Veuillez demander un nouveau lien à votre coach.');
        return;
      } else {
        setError(`Erreur: ${errorDesc || errorCode}`);
        return;
      }
    }
    
    if (typeFromQuery === 'recovery' || isRecoveryFromHash) {
      setIsRecovery(true);
    } else {
      // Handle other auth callbacks (email confirmation, etc.)
      handleAuthCallback();
    }
  }, [searchParams]);

  async function handleAuthCallback() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      // Redirect based on user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth_uid', data.session.user.id)
        .single();
      
      if (profile?.role === 'coach') {
        router.push('/coach/dashboard');
      } else {
        router.push('/athlete/dashboard');
      }
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Get user profile to redirect appropriately
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth_uid', session.user.id)
        .single();
      
      if (profile?.role === 'coach') {
        router.push('/coach/dashboard');
      } else {
        router.push('/athlete/dashboard');
      }
    }
  }

  if (error && !isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">Erreur</h2>
            <p className="mt-4 text-gray-700">{error}</p>
            <a href="/" className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Vérification en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-bold">Définir votre mot de passe</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choisissez un mot de passe sécurisé pour votre compte
          </p>
        </div>
        
        <form onSubmit={handlePasswordReset} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Au moins 6 caractères"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Retapez votre mot de passe"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {loading ? 'Enregistrement...' : 'Définir le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Chargement...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
