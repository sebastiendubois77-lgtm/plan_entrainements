'use client';
import React from 'react';
import LoginForm from '../components/LoginForm';

export default function Home() {
  return (
    <div className="mt-8">
      <section className="bg-gradient-to-r from-slate-50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight">
                Gère les plans. Suis les progrès. Simplifie l'entraînement.
              </h1>
              <p className="mt-6 text-lg text-slate-600 max-w-xl">
                Une interface simple pour coachs et athlètes — créez des plans, suivez
                les sessions et collaborez efficacement. Commencez en quelques clics.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
                <a
                  href="#login"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-slate-900 text-white font-semibold shadow-md hover:bg-slate-800"
                >
                  Se connecter
                </a>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                >
                  Découvrir
                </a>
              </div>
            </div>

            <div id="login" className="mx-auto w-full max-w-md bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Connexion</h2>
              <LoginForm />
              <p className="mt-4 text-sm text-slate-500">Besoin d'un compte ? Contactez votre coach.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h3 className="text-2xl font-semibold text-slate-900 text-center">Fonctionnalités</h3>
        <p className="text-center mt-2 text-slate-600 max-w-2xl mx-auto">Tout ce dont vous avez besoin pour planifier, suivre et améliorer les performances.</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <h4 className="font-semibold text-lg">Plans collaboratifs</h4>
            <p className="mt-2 text-slate-600 text-sm">Créez, partagez et adaptez des plans d'entraînement pour vos athlètes.</p>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <h4 className="font-semibold text-lg">Suivi des sessions</h4>
            <p className="mt-2 text-slate-600 text-sm">Enregistrez les sessions, la durée et les notes pour analyser la progression.</p>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <h4 className="font-semibold text-lg">Bibliothèque d'exercices</h4>
            <p className="mt-2 text-slate-600 text-sm">Réutilisez des exercices et standardisez vos programmes.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-sm text-slate-600">© {new Date().getFullYear()} Plan Entraînements</div>
          <div className="mt-3 sm:mt-0 text-sm text-slate-600">Contact · Confidentialité · Mentions légales</div>
        </div>
      </footer>
    </div>
  );
}