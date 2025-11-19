'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthInterceptor() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if URL contains recovery token (hash fragment or query params)
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check if this is a recovery/reset password flow
    const isRecoveryFromHash = hash.includes('type=recovery') || hash.includes('type=magiclink');
    const isRecoveryFromQuery = searchParams.get('type') === 'recovery' || searchParams.get('type') === 'magiclink';
    
    // If we're on the home page with a recovery token, redirect to callback
    if ((isRecoveryFromHash || isRecoveryFromQuery) && pathname === '/') {
      // Preserve the full URL including hash and query params
      const fullUrl = window.location.href.replace(window.location.origin, '');
      router.push(`/auth/callback${fullUrl.substring(1)}`); // Remove leading '/'
    }
  }, [pathname, router]);

  return null;
}
