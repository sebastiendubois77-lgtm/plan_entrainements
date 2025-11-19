import './globals.css';
import React from 'react';
import Header from '../components/Header';
import AuthInterceptor from '../components/AuthInterceptor';

export const metadata = { title: 'Entraînements' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthInterceptor />
        <Header />
        <main className="max-w-5xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}