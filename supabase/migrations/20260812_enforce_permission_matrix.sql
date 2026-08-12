-- La matrice de permissions (role_permissions) n'était jusqu'ici
-- qu'informative : elle s'affichait dans Paramètres > Équipe mais aucune
-- policy RLS ne s'appuyait dessus, donc n'importe quel membre admin
-- (Comptable, Chef de département, etc.) avait en réalité un accès complet
-- via les policies existantes ("role = 'admin' AND university = ..."), quel
-- que soit son sous-rôle. On fait maintenant appliquer réellement ce que la
-- matrice affiche.
-- Appliqué via Supabase MCP le 2026-08-12 — ce fichier documente ce qui est
-- en prod, il n'est pas exécuté automatiquement (pas de pipeline de
-- migration ici).

-- ── Fonctions utilitaires (même style que get_my_role()/get_my_university()) ──

CREATE OR REPLACE FUNCTION public.get_my_sub_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT sub_role FROM profiles WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_sub_role() TO authenticated;

-- Résout l'"acteur" à utiliser dans role_permissions pour l'utilisateur
-- courant : le sous-rôle s'il est admin avec un sous-rôle défini, sinon son
-- rôle de base (enseignant/etudiant/parent). Un admin sans sous-rôle
-- (ne devrait plus arriver après le backfill de la migration précédente)
-- retombe sur 'Directeur Académique' — plein accès, comportement historique.
CREATE OR REPLACE FUNCTION public.get_my_access_level(p_module_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT access_level FROM role_permissions
       WHERE actor = CASE
         WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
           THEN COALESCE((SELECT sub_role FROM profiles WHERE id = auth.uid()), 'Directeur Académique')
         ELSE (SELECT role::text FROM profiles WHERE id = auth.uid())
       END
       AND module_key = p_module_key),
    'full'
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_my_access_level(text) TO authenticated;

-- Utilisée par le frontend (dashboard.html) pour masquer les onglets / griser
-- les boutons d'ajout selon l'accès réel de l'utilisateur courant.
CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE(module_key text, access_level text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT rp.module_key, rp.access_level
  FROM role_permissions rp
  WHERE rp.actor = CASE
    WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
      THEN COALESCE((SELECT sub_role FROM profiles WHERE id = auth.uid()), 'Directeur Académique')
    ELSE (SELECT role::text FROM profiles WHERE id = auth.uid())
  END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;

-- ── Policies d'écriture resserrées selon la matrice ──
--
-- Portée volontairement limitée aux tables/opérations où la matrice a un
-- sens direct. `teachers` et `schedule_slots` gardent leurs policies SELECT
-- larges existantes (annuaire de contacts messagerie.html, emploi du temps
-- étudiant etudiant.html) — seules leurs policies d'écriture sont gatées ici.
--
-- students (module 'etudiants') : write nécessite accès 'full'.
DROP POLICY IF EXISTS "admins_can_insert_students_own_university" ON students;
CREATE POLICY "admins_can_insert_students_own_university" ON students
  FOR INSERT
  WITH CHECK (get_my_role() = 'admin' AND university = get_my_university() AND get_my_access_level('etudiants') = 'full');

DROP POLICY IF EXISTS "admins_can_update_students_own_university" ON students;
CREATE POLICY "admins_can_update_students_own_university" ON students
  FOR UPDATE
  USING (get_my_role() = 'admin' AND university = get_my_university())
  WITH CHECK (get_my_role() = 'admin' AND university = get_my_university() AND get_my_access_level('etudiants') = 'full');

DROP POLICY IF EXISTS "admins_can_delete_students_own_university" ON students;
CREATE POLICY "admins_can_delete_students_own_university" ON students
  FOR DELETE
  USING (get_my_role() = 'admin' AND university = get_my_university() AND get_my_access_level('etudiants') = 'full');

-- teachers (module 'enseignants') : write nécessite accès 'full'. SELECT reste inchangé (large).
DROP POLICY IF EXISTS "admins_can_insert_teachers_own_university" ON teachers;
CREATE POLICY "admins_can_insert_teachers_own_university" ON teachers
  FOR INSERT
  WITH CHECK (get_my_role() = 'admin' AND university = get_my_university() AND get_my_access_level('enseignants') = 'full');

DROP POLICY IF EXISTS "admins_can_update_teachers_own_university" ON teachers;
CREATE POLICY "admins_can_update_teachers_own_university" ON teachers
  FOR UPDATE
  USING (get_my_role() = 'admin' AND university = get_my_university())
  WITH CHECK (get_my_role() = 'admin' AND university = get_my_university() AND get_my_access_level('enseignants') = 'full');

DROP POLICY IF EXISTS "admins_can_delete_teachers_own_university" ON teachers;
CREATE POLICY "admins_can_delete_teachers_own_university" ON teachers
  FOR DELETE
  USING (get_my_role() = 'admin' AND university = get_my_university() AND get_my_access_level('enseignants') = 'full');

-- payments (module 'paiements') : write nécessite accès 'full'.
DROP POLICY IF EXISTS "admins_can_insert_payments_own_university" ON payments;
CREATE POLICY "admins_can_insert_payments_own_university" ON payments
  FOR INSERT
  WITH CHECK (get_my_role() = 'admin' AND get_my_access_level('paiements') = 'full'
    AND EXISTS (SELECT 1 FROM students WHERE students.id = payments.student_id AND students.university = get_my_university()));

DROP POLICY IF EXISTS "admins_can_update_payments_own_university" ON payments;
CREATE POLICY "admins_can_update_payments_own_university" ON payments
  FOR UPDATE
  USING (get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM students WHERE students.id = payments.student_id AND students.university = get_my_university()))
  WITH CHECK (get_my_role() = 'admin' AND get_my_access_level('paiements') = 'full'
    AND EXISTS (SELECT 1 FROM students WHERE students.id = payments.student_id AND students.university = get_my_university()));

-- schedule_slots (module 'emploi_temps' pour les créneaux normaux, 'examens'
-- pour type='Examen') : write nécessite l'accès 'full' du module concerné.
-- SELECT reste inchangé (large — utilisé par etudiant.html).
DROP POLICY IF EXISTS "admins_can_insert_schedule_slots_own_university" ON schedule_slots;
CREATE POLICY "admins_can_insert_schedule_slots_own_university" ON schedule_slots
  FOR INSERT
  WITH CHECK (get_my_role() = 'admin' AND university = get_my_university()
    AND get_my_access_level(CASE WHEN type = 'Examen' THEN 'examens' ELSE 'emploi_temps' END) = 'full');

DROP POLICY IF EXISTS "admins_can_update_schedule_slots_own_university" ON schedule_slots;
CREATE POLICY "admins_can_update_schedule_slots_own_university" ON schedule_slots
  FOR UPDATE
  USING (get_my_role() = 'admin' AND university = get_my_university())
  WITH CHECK (get_my_role() = 'admin' AND university = get_my_university()
    AND get_my_access_level(CASE WHEN type = 'Examen' THEN 'examens' ELSE 'emploi_temps' END) = 'full');

DROP POLICY IF EXISTS "admins_can_delete_schedule_slots_own_university" ON schedule_slots;
CREATE POLICY "admins_can_delete_schedule_slots_own_university" ON schedule_slots
  FOR DELETE
  USING (get_my_role() = 'admin' AND university = get_my_university()
    AND get_my_access_level(CASE WHEN type = 'Examen' THEN 'examens' ELSE 'emploi_temps' END) = 'full');

-- grades (résultats d'examens, module 'examens') : write nécessite accès 'full'.
DROP POLICY IF EXISTS "admins_can_insert_grades_own_university" ON grades;
CREATE POLICY "admins_can_insert_grades_own_university" ON grades
  FOR INSERT
  WITH CHECK (get_my_role() = 'admin' AND get_my_access_level('examens') = 'full'
    AND EXISTS (SELECT 1 FROM students WHERE students.id = grades.student_id AND students.university = get_my_university()));

DROP POLICY IF EXISTS "admins_can_update_grades_own_university" ON grades;
CREATE POLICY "admins_can_update_grades_own_university" ON grades
  FOR UPDATE
  USING (get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM students WHERE students.id = grades.student_id AND students.university = get_my_university()))
  WITH CHECK (get_my_role() = 'admin' AND get_my_access_level('examens') = 'full'
    AND EXISTS (SELECT 1 FROM students WHERE students.id = grades.student_id AND students.university = get_my_university()));

-- universities (module 'parametres', colonnes de contact uniquement — voir
-- migration précédente pour la restriction de colonnes) : write nécessite
-- accès 'full' sur 'parametres', en plus de la restriction déjà en place.
DROP POLICY IF EXISTS "admins_can_update_own_university_contact_info" ON universities;
CREATE POLICY "admins_can_update_own_university_contact_info" ON universities
  FOR UPDATE
  USING (get_my_role() = 'admin' AND name = get_my_university())
  WITH CHECK (get_my_role() = 'admin' AND name = get_my_university() AND get_my_access_level('parametres') = 'full');

-- ── Vérification effectuée en prod ──
-- 1. Compte réel Directeur Académique (accès 'full' partout) : CRUD complet
--    inchangé sur students/teachers/payments/grades/schedule_slots/universities
--    (aucune régression).
-- 2. Compte de test jetable, sous-rôle 'Comptable' (etudiants=read,
--    enseignants=full, examens=none, paiements=full, emploi_temps=none,
--    parametres=none) : les 6 combinaisons module × niveau d'accès
--    confirmées correctes, notamment via .select() chaîné ou relecture SQL
--    directe pour les cas où PostgREST ne renvoie pas d'erreur sur un
--    UPDATE filtré à 0 ligne par RLS.
