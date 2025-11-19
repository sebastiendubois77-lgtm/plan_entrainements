# Configuration du template d'email Supabase

## Personnaliser l'email de récupération de mot de passe

Pour personnaliser le texte de l'email envoyé aux athlètes lors de leur invitation :

### 1. Aller dans la console Supabase
- Ouvrir votre projet sur [app.supabase.com](https://app.supabase.com)
- Naviguer vers **Authentication** → **Email Templates**

### 2. Modifier le template "Reset Password"
- Sélectionner le template **"Reset Password"** (ou "Magic Link" si vous utilisez celui-ci)
- Modifier le **Subject** (sujet) :
  ```
  Accès aux plans de Seb
  ```

### 3. Modifier le corps de l'email
Remplacer le texte par défaut par quelque chose comme :

```html
<h2>Bienvenue !</h2>
<p>Vous avez été invité(e) à rejoindre les plans d'entraînement de Seb.</p>
<p>Cliquez sur le lien ci-dessous pour définir votre mot de passe et accéder à votre compte :</p>
<p><a href="{{ .ConfirmationURL }}">Définir mon mot de passe</a></p>
<p>Si vous n'avez pas demandé cet accès, vous pouvez ignorer cet email.</p>
```

### 4. Variables disponibles dans le template
- `{{ .ConfirmationURL }}` : lien de confirmation avec redirect_to automatique
- `{{ .Token }}` : token de récupération
- `{{ .Email }}` : email de l'utilisateur
- `{{ .SiteURL }}` : URL du site (configurée dans les paramètres Auth)

### 5. Configuration de l'URL de redirection (Site URL)
- Aller dans **Authentication** → **URL Configuration**
- Définir **Site URL** : `https://plan-entrainements-bs08uwdeg-sebastien-dubois-projects.vercel.app`
- Ajouter cette URL dans **Redirect URLs** également

### 6. Optionnel : Ajouter variable d'environnement
Pour plus de flexibilité, ajouter `NEXT_PUBLIC_SITE_URL` dans Vercel :

```bash
vercel env add NEXT_PUBLIC_SITE_URL
# Valeur : https://plan-entrainements-bs08uwdeg-sebastien-dubois-projects.vercel.app
```

---

## Note
Le code API utilise maintenant `redirectTo` pour pointer vers l'URL de production au lieu de localhost.
