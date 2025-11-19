import './globals.css';
import React from 'react';
import Header from '../components/Header';

export const metadata = { title: 'Entraînements' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Header />
        <main className="max-w-5xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}