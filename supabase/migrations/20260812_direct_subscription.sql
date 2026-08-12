-- Souscription directe : suppression de l'essai gratuit de 14 jours. Une
-- université qui s'inscrit doit désormais payer immédiatement pour activer
-- son espace (gate déplacé dans auth-guard.js, plus de fenêtre de grâce basée
-- sur trial_ends_at). Appliqué via Supabase MCP le 2026-08-12 — ce fichier
-- documente ce qui est en prod, il n'est pas exécuté automatiquement (pas de
-- pipeline de migration ici).

alter table universities drop constraint universities_status_check;
alter table universities add constraint universities_status_check
  check (status = any (array['Actif', 'Trial', 'En attente', 'Expiré', 'Suspendu']));

-- handle_new_user() : les nouvelles universités sont créées avec le statut
-- 'En attente' et trial_ends_at non renseigné (colonne conservée pour
-- l'historique des universités déjà en essai avant ce changement).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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
