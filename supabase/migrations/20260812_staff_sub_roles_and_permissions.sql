-- Sous-rôles d'équipe admin (Directeur Académique / Responsable Scolarité /
-- Comptable / Chef de département) + matrice de permissions réelle, pour
-- remplacer la liste "Membres de l'équipe admin" et la "Matrice des
-- permissions" qui étaient entièrement statiques (noms fictifs, matrice
-- codée en dur en HTML). "role_permissions" couvre à la fois les sous-rôles
-- admin ET les rôles de base (enseignant/etudiant/parent), pour reproduire
-- fidèlement la matrice originale qui mélangeait les deux.
-- Appliqué via Supabase MCP le 2026-08-12 — ce fichier documente ce qui est
-- en prod, il n'est pas exécuté automatiquement (pas de pipeline de
-- migration ici).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sub_role text
  CHECK (sub_role IS NULL OR sub_role IN ('Directeur Académique', 'Responsable Scolarité', 'Comptable', 'Chef de département'));

CREATE TABLE IF NOT EXISTS role_permissions (
  actor text NOT NULL,
  module_key text NOT NULL,
  access_level text NOT NULL CHECK (access_level IN ('full', 'read', 'none')),
  PRIMARY KEY (actor, module_key)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_read_role_permissions" ON role_permissions
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "superadmin_full_access_role_permissions" ON role_permissions
  FOR ALL
  USING (get_my_role() = 'superadmin')
  WITH CHECK (get_my_role() = 'superadmin');

INSERT INTO role_permissions (actor, module_key, access_level) VALUES
  ('Directeur Académique', 'etudiants', 'full'),
  ('Directeur Académique', 'enseignants', 'full'),
  ('Directeur Académique', 'examens', 'full'),
  ('Directeur Académique', 'paiements', 'full'),
  ('Directeur Académique', 'emploi_temps', 'full'),
  ('Directeur Académique', 'parametres', 'full'),
  ('Responsable Scolarité', 'etudiants', 'full'),
  ('Responsable Scolarité', 'enseignants', 'read'),
  ('Responsable Scolarité', 'examens', 'full'),
  ('Responsable Scolarité', 'paiements', 'full'),
  ('Responsable Scolarité', 'emploi_temps', 'full'),
  ('Responsable Scolarité', 'parametres', 'none'),
  ('Comptable', 'etudiants', 'read'),
  ('Comptable', 'enseignants', 'full'),
  ('Comptable', 'examens', 'none'),
  ('Comptable', 'paiements', 'full'),
  ('Comptable', 'emploi_temps', 'none'),
  ('Comptable', 'parametres', 'none'),
  ('Chef de département', 'etudiants', 'full'),
  ('Chef de département', 'enseignants', 'read'),
  ('Chef de département', 'examens', 'full'),
  ('Chef de département', 'paiements', 'none'),
  ('Chef de département', 'emploi_temps', 'read'),
  ('Chef de département', 'parametres', 'none'),
  ('enseignant', 'etudiants', 'read'),
  ('enseignant', 'enseignants', 'none'),
  ('enseignant', 'examens', 'full'),
  ('enseignant', 'paiements', 'none'),
  ('enseignant', 'emploi_temps', 'read'),
  ('enseignant', 'parametres', 'none'),
  ('etudiant', 'etudiants', 'none'),
  ('etudiant', 'enseignants', 'none'),
  ('etudiant', 'examens', 'none'),
  ('etudiant', 'paiements', 'none'),
  ('etudiant', 'emploi_temps', 'none'),
  ('etudiant', 'parametres', 'none'),
  ('parent', 'etudiants', 'none'),
  ('parent', 'enseignants', 'none'),
  ('parent', 'examens', 'none'),
  ('parent', 'paiements', 'none'),
  ('parent', 'emploi_temps', 'none'),
  ('parent', 'parametres', 'none')
ON CONFLICT (actor, module_key) DO NOTHING;

-- Backfill : les comptes admin déjà existants deviennent "Directeur
-- Académique" par défaut (c'est en pratique le fondateur du compte, plein
-- accès — cohérent avec le comportement actuel où tout admin a accès à
-- tout).
UPDATE profiles SET sub_role = 'Directeur Académique' WHERE role = 'admin' AND sub_role IS NULL;

-- Nouveaux admins créés via l'inscription (handle_new_user) : même défaut.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, full_name, role, university, matricule, sub_role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'etudiant'),
    new.raw_user_meta_data->>'university',
    new.raw_user_meta_data->>'matricule',
    case when coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'etudiant') = 'admin'
         then 'Directeur Académique' else null end
  );

  if coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'etudiant') = 'admin'
     and new.raw_user_meta_data->>'university' is not null
     and not exists (select 1 from public.universities where name = new.raw_user_meta_data->>'university')
  then
    insert into public.universities (name, country, city, plan, price_monthly, status, ref_affilie)
    values (
      new.raw_user_meta_data->>'university',
      new.raw_user_meta_data->>'onboarding_country',
      new.raw_user_meta_data->>'onboarding_city',
      initcap(new.raw_user_meta_data->>'onboarding_plan'),
      nullif(new.raw_user_meta_data->>'onboarding_price_monthly','')::numeric,
      'En attente',
      new.raw_user_meta_data->>'onboarding_ref_affilie'
    );
  end if;

  return new;
end;
$function$;

-- Un admin peut modifier le sous-rôle d'un autre admin de sa propre
-- université (le bouton "Modifier" de la liste équipe). Restriction de
-- colonnes en défense en profondeur : impossible de modifier role/email/
-- university/id via ce chemin, même en contournant l'UI.
CREATE POLICY "admins_can_update_sub_role_own_university_staff" ON profiles
  FOR UPDATE
  USING (get_my_role() = 'admin' AND role = 'admin' AND university = get_my_university())
  WITH CHECK (get_my_role() = 'admin' AND role = 'admin' AND university = get_my_university());

-- Découvert en vérifiant le GRANT ci-dessous : `authenticated` avait en
-- réalité un GRANT UPDATE table-large préexistant sur profiles (privilège
-- par défaut Supabase, jamais restreint jusqu'ici). Combiné à la policy RLS
-- "Users can update own profile" (USING auth.uid() = id, sans restriction de
-- colonnes), n'importe quel utilisateur connecté pouvait en théorie
-- modifier sa propre colonne `role` via un appel REST direct (ex: passer
-- etudiant -> admin), en contournant entièrement l'interface. Aucun code de
-- l'app n'appelle profiles.update(...) actuellement (vérifié) — pure
-- surface d'attaque dormante, corrigée ici. Restreint à la seule colonne
-- sub_role. Vérifié en prod : un update() incluant role/full_name est bien
-- rejeté avec "permission denied for table profiles".
REVOKE UPDATE ON profiles FROM authenticated, anon;
GRANT UPDATE (sub_role) ON profiles TO authenticated;
