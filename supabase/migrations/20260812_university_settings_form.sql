-- Le formulaire Paramètres > Informations université était purement statique
-- (5 champs codés en dur, "Sauvegarder" ne faisait qu'un toast). On le
-- branche sur de vraies données : ajout de colonnes email/phone (n'existaient
-- pas), et une policy RLS permettant à un admin de modifier CES SEULES
-- colonnes de contact pour sa propre université — jamais name/plan/status/
-- price_monthly, qui sont soit la clé de scoping multi-tenant (name, utilisée
-- partout en text-match : profiles.university, students.university, etc. —
-- la renommer casserait silencieusement tout le scoping), soit des champs
-- de facturation qu'un admin ne doit pas pouvoir s'auto-attribuer.
-- Appliqué via Supabase MCP le 2026-08-12 — ce fichier documente ce qui est
-- en prod, il n'est pas exécuté automatiquement (pas de pipeline de
-- migration ici).

ALTER TABLE universities ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS phone text;

CREATE POLICY "admins_can_update_own_university_contact_info" ON universities
  FOR UPDATE
  USING (get_my_role() = 'admin' AND name = get_my_university())
  WITH CHECK (get_my_role() = 'admin' AND name = get_my_university());

-- Défense en profondeur : même avec la policy RLS ci-dessus, sans restriction
-- de colonnes un admin pourrait PATCH name/plan/status/price_monthly via un
-- appel REST direct. Restreint l'UPDATE aux seules colonnes de contact.
-- Vérifié en prod : un update() incluant name/status/plan est bien rejeté
-- avec "permission denied for table universities".
REVOKE UPDATE ON universities FROM authenticated, anon;
GRANT UPDATE (country, city, email, phone) ON universities TO authenticated;
