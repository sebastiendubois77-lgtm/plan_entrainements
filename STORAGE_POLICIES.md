# Politiques Storage RLS pour les avatars

⚠️ **Ces politiques doivent être créées via l'interface Supabase Dashboard**

## Instructions

1. Va sur https://supabase.com/dashboard/project/kisfxfldtpnacgehnisc
2. Clique sur **Storage** dans le menu de gauche
3. Sélectionne le bucket **avatars**
4. Clique sur **Policies** (onglet)
5. Utilise l'éditeur SQL ou crée les politiques manuellement

## Politiques à créer

### 1. Upload (INSERT)
**Nom:** `Users can upload their own avatar`
**Operation:** INSERT
**Target roles:** authenticated
**WITH CHECK expression:**
```sql
bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
```

### 2. Update
**Nom:** `Users can update their own avatar`
**Operation:** UPDATE
**Target roles:** authenticated
**USING expression:**
```sql
bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
```
**WITH CHECK expression:**
```sql
bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
```

### 3. Delete
**Nom:** `Users can delete their own avatar`
**Operation:** DELETE
**Target roles:** authenticated
**USING expression:**
```sql
bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
```

### 4. Read (SELECT)
**Nom:** `Public can view avatars`
**Operation:** SELECT
**Target roles:** public
**USING expression:**
```sql
bucket_id = 'avatars'
```

## OU copie-colle ce SQL complet dans l'éditeur SQL

```sql
-- Policy: Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow public read access to all avatars
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

## Vérification

Après avoir créé les politiques, tu devrais pouvoir:
- ✅ Uploader une photo depuis le profil athlète
- ✅ Le fichier sera stocké dans `avatars/{user_id}/{timestamp}.jpg`
- ✅ Tout le monde peut voir les avatars (bucket public)
- ✅ Seul le propriétaire peut modifier/supprimer son avatar
