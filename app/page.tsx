'use client';
import React from 'react';
import LoginForm from '../components/LoginForm';

export default function Home() {
  return (
    <div className="mt-12">
      <h1 className="text-3xl font-bold mb-4">Portail d'entraînement</h1>
      <p className="mb-6">Connecte-toi pour gérer les plans ou remplir ta séance.</p>
      <div className="max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}