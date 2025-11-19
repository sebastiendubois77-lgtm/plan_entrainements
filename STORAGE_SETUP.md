# Configuration Supabase Storage

## Créer le bucket "avatars" manuellement

Pour activer l'upload de photos de profil :

1. Va sur [app.supabase.com](https://app.supabase.com) → ton projet
2. **Storage** (menu de gauche)
3. Clique sur **"New bucket"**
4. Configure :
   - **Name:** `avatars`
   - **Public bucket:** ✓ (coché)
   - **File size limit:** 5 MB
   - **Allowed MIME types:** `image/png, image/jpeg, image/jpg, image/gif, image/webp`
5. Clique sur **"Create bucket"**

## Policies RLS (optionnel mais recommandé)

Pour permettre aux utilisateurs d'uploader leurs propres photos :

```sql
-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Test

Une fois le bucket créé, l'upload fonctionnera automatiquement depuis la page `/athlete/profile`.
