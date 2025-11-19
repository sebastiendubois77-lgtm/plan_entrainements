# plan_entrainements

Projet Next.js pour gérer des plans d'entraînement, connecté à Supabase.

**Contenu**
- `app/` : pages Next.js
- `components/` : composants React
- `lib/supabaseClient.ts` : client Supabase
- `db/init.sql` : script SQL initial
- `supabase/migrations/001_init.sql` : migration prête à pousser

**Prérequis**
- Node.js 18+ et npm
- Supabase CLI (optionnel pour migrations)

Installation locale
```bash
npm install
cp .env.local.example .env.local
# remplir .env.local avec vos valeurs
npm run dev
```

Variables d'environnement requises
- `NEXT_PUBLIC_SUPABASE_URL` : l'URL du projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé publique (anon)
- `SUPABASE_SERVICE_ROLE_KEY` : clé `service_role` (server-only)

Exemple `.env.local` (NE PAS COMMITTER)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...yourAnonKey...
SUPABASE_SERVICE_ROLE_KEY=eyJ...yourServiceRoleKey...
```

Configurer Supabase
1. Créez un projet sur https://app.supabase.com
2. Récupérez `Project URL` et `anon public key` dans Settings → API
3. Depuis le repo local, vous pouvez lier et appliquer les migrations :
```bash
# si supabase CLI est installé
supabase login
supabase link --project-ref <project-ref>
supabase db push
```
ou collez le contenu de `db/init.sql` dans SQL Editor de Supabase.

Déploiement (Vercel recommandé)
1. Poussez votre code sur GitHub (repo déjà lié).
2. Sur Vercel, importez le repo et ajoutez les variables d'environnement indiquées ci-dessus (Dashboard → Settings → Environment Variables).
3. Déployez ; Vercel build se chargera de `npm run build`.

Sécurité
- **Ne commitez jamais** `SUPABASE_SERVICE_ROLE_KEY` ou `.env.local`.
- Gardez la clé `service_role` uniquement dans les variables d'environnement server-side de la plateforme de déploiement.

Ressources utiles
- Supabase docs: https://supabase.com/docs
- Vercel deploy: https://vercel.com/docs

Besoin d'aide
- Dites si vous voulez que je :
  - configure les variables sur Vercel,
  - ajoute un script de déploiement GitHub Actions,
  - ou lance `npm install` et `npm run dev` ici pour tester.
