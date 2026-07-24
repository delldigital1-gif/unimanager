-- Abonnement Dell Digital (l'université paie pour utiliser UniManage), distinct
-- des frais de scolarité (table payments, argent des étudiants vers l'université).
-- Appliqué via Supabase MCP le 2026-07-24 — ce fichier documente ce qui est en
-- prod, il n'est pas exécuté automatiquement (pas de pipeline de migration ici).

ALTER TABLE universities ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS ref_affilie varchar(20);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references universities(id) on delete cascade,
  plan text not null,
  amount_fcfa numeric not null,
  transaction_id text unique,
  statut text not null default 'En attente',
  ref_affilie varchar(20),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_payments_select_own_university" ON subscription_payments
  FOR SELECT USING (
    university_id IN (SELECT id FROM universities WHERE name = get_my_university())
  );

CREATE POLICY "subscription_payments_service_role" ON subscription_payments
  FOR ALL USING (auth.role() = 'service_role');

-- Un utilisateur (hors superadmin) doit pouvoir lire la ligne universities
-- correspondant à sa propre université, pour le gate d'essai côté client.
CREATE POLICY "universities_select_own" ON universities
  FOR SELECT USING (name = get_my_university());

-- handle_new_user() étendu : un nouvel admin qui s'inscrit avec une université
-- inconnue crée aussi sa ligne universities (essai 14j), sans dépendre d'une
-- policy RLS d'insertion côté client (universities reste écriture-superadmin
-- only). Capitalise plan (starter/pro/enterprise -> Starter/Pro/Enterprise)
-- pour respecter la contrainte CHECK universities_plan_check déjà en place.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, full_name, role, university, matricule)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'etudiant'),
    new.raw_user_meta_data->>'university',
    new.raw_user_meta_data->>'matricule'
  );

  if coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'etudiant') = 'admin'
     and new.raw_user_meta_data->>'university' is not null
     and not exists (select 1 from public.universities where name = new.raw_user_meta_data->>'university')
  then
    insert into public.universities (name, country, city, plan, price_monthly, status, trial_ends_at, ref_affilie)
    values (
      new.raw_user_meta_data->>'university',
      new.raw_user_meta_data->>'onboarding_country',
      new.raw_user_meta_data->>'onboarding_city',
      initcap(new.raw_user_meta_data->>'onboarding_plan'),
      nullif(new.raw_user_meta_data->>'onboarding_price_monthly','')::numeric,
      'Essai',
      now() + interval '14 days',
      new.raw_user_meta_data->>'onboarding_ref_affilie'
    );
  end if;

  return new;
end;
$function$;

-- Secret partagé avec Dell Digital Partner, stocké en Vault (pas de CLI Supabase
-- disponible pour `supabase secrets set` sur les Edge Functions) — accessible
-- uniquement via cette fonction, elle-même restreinte à service_role.
-- select vault.create_secret('<secret>', 'partner_webhook_secret', '...');
CREATE OR REPLACE FUNCTION public.get_partner_webhook_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  select decrypted_secret from vault.decrypted_secrets where name = 'partner_webhook_secret';
$$;

REVOKE ALL ON FUNCTION public.get_partner_webhook_secret() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_webhook_secret() TO service_role;

-- Note : côté projet dell-digital-partner (autre base Supabase), une migration
-- séparée ajoute 'saas_unimanage' à son enum product_type — voir ce repo-là.
