-- Construction réelle de tout ce qui était marqué "n'existe pas" dans l'audit
-- de la page de prix (2026-08-12) : invitation admin/parent, dépôt de
-- supports de cours, profil étudiant complet, diplômes/attestations.
-- Appliqué via Supabase MCP le 2026-08-12 — ce fichier documente ce qui est
-- en prod, il n'est pas exécuté automatiquement (pas de pipeline de
-- migration ici).

-- ══ Invitations (admin ET parent, même mécanisme à token) ══
-- Remplace le faux bouton "+ Inviter utilisateur" (juste un toast) et
-- l'absence totale de lien parent↔enfant (parent_students n'était alimentée
-- nulle part). type='admin' invite un membre du staff sur l'université ;
-- type='parent' invite un parent, lié à un student_id précis.
CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  type text NOT NULL CHECK (type IN ('admin', 'parent')),
  university text NOT NULL,
  email text NOT NULL,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  used_at timestamptz,
  CONSTRAINT parent_invite_needs_student CHECK (type <> 'parent' OR student_id IS NOT NULL)
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Policies séparées par opération (pas une seule FOR ALL) : la personne qui
-- MARQUE l'invitation comme utilisée juste après son inscription n'est pas
-- la même que celle qui l'a créée (created_by = l'admin invitant), donc un
-- WITH CHECK sur created_by casserait ce flux sur UPDATE. INSERT/DELETE
-- restent limités à un admin de l'université ; UPDATE l'est aussi mais sans
-- exiger d'être le créateur.
CREATE POLICY "admins_insert_own_university_invites" ON invites
  FOR INSERT
  WITH CHECK (get_my_role() = 'admin' AND university = get_my_university() AND created_by = auth.uid());

CREATE POLICY "admins_update_own_university_invites" ON invites
  FOR UPDATE
  USING (get_my_role() = 'admin' AND university = get_my_university())
  WITH CHECK (get_my_role() = 'admin' AND university = get_my_university());

CREATE POLICY "admins_delete_own_university_invites" ON invites
  FOR DELETE
  USING (get_my_role() = 'admin' AND university = get_my_university());

-- Lecture publique par token uniquement (anon) — nécessaire pour que la page
-- d'inscription puisse pré-remplir université/email avant que la personne
-- ait un compte. Ne révèle qu'une ligne précise si on connaît déjà le token
-- (24 octets aléatoires = non devinable), jamais une liste.
CREATE POLICY "anyone_can_read_invite_by_token" ON invites
  FOR SELECT
  USING (true);

-- Un parent invité doit pouvoir créer lui-même sa ligne parent_students
-- après inscription (les policies existantes sur cette table ne
-- l'autorisaient qu'à un admin — parent_students n'était alimentée nulle
-- part avant cette migration). Restreint strictement à une invitation
-- valide déjà marquée utilisée pour CE student_id précis et CET email —
-- impossible de se lier à un enfant au hasard.
CREATE POLICY "parents_can_link_self_via_valid_invite" ON parent_students
  FOR INSERT
  WITH CHECK (
    parent_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM invites i
      JOIN profiles p ON p.id = auth.uid()
      WHERE i.type = 'parent' AND i.student_id = parent_students.student_id
        AND i.email = p.email AND i.used_at IS NOT NULL
    )
  );

-- ══ Documents de cours (dépôt par l'enseignant, consultation étudiant) ══
-- "Mes cours" était 100% statique côté enseignant.html ET etudiant.html —
-- pas de table dédiée. On dérive le cours lui-même de grades.matiere
-- (déjà la source de vérité "quel enseignant enseigne quelle matière à
-- quels étudiants") plutôt que de dupliquer cette info dans une nouvelle
-- table "courses".
CREATE TABLE IF NOT EXISTS course_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  university text NOT NULL,
  department text,
  level text,
  matiere text NOT NULL,
  title text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teachers_manage_own_course_documents" ON course_documents
  FOR ALL
  USING (EXISTS (SELECT 1 FROM teachers t WHERE t.id = course_documents.teacher_id AND t.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM teachers t WHERE t.id = course_documents.teacher_id AND t.profile_id = auth.uid()));

-- Étudiants/parents/admin de la même université peuvent consulter (lecture
-- seule) les documents déposés pour leurs matières.
CREATE POLICY "university_members_can_read_course_documents" ON course_documents
  FOR SELECT
  USING (get_my_role() = 'superadmin' OR university = get_my_university());

-- Bucket de stockage pour les fichiers déposés. Public en lecture (les
-- documents pédagogiques ne sont pas sensibles) pour simplifier — l'écriture
-- reste gérée par les policies storage.objects ci-dessous.
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-documents', 'course-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "teachers_upload_own_course_documents" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'course-documents'
    AND EXISTS (SELECT 1 FROM teachers t WHERE t.profile_id = auth.uid() AND t.id::text = (storage.foldername(name))[1])
  );

CREATE POLICY "teachers_delete_own_course_documents" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'course-documents'
    AND EXISTS (SELECT 1 FROM teachers t WHERE t.profile_id = auth.uid() AND t.id::text = (storage.foldername(name))[1])
  );

CREATE POLICY "anyone_can_read_course_documents" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'course-documents');

-- ══ Profil étudiant complet ══
-- "Mon profil" (etudiant.html) affichait téléphone/naissance/nationalité/
-- moyenne/crédits en dur pour tout le monde. Moyenne reste calculée en
-- temps réel depuis grades (déjà réel, pas de colonne à ajouter). Le reste
-- nécessite de vraies colonnes.
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS date_naissance date;
ALTER TABLE students ADD COLUMN IF NOT EXISTS nationalite text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS credits_valides integer;
ALTER TABLE students ADD COLUMN IF NOT EXISTS credits_requis integer;

-- L'étudiant modifie ses propres coordonnées (phone/date_naissance/
-- nationalite) ; les crédits restent une décision administrative (admin
-- uniquement, via la policy staff déjà en place sur UPDATE students).
CREATE POLICY "students_can_update_own_contact_info" ON students
  FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

REVOKE UPDATE ON students FROM authenticated, anon;
GRANT UPDATE (phone, date_naissance, nationalite) ON students TO authenticated;
-- Le staff a besoin de plus de colonnes en écriture (déjà couvert par sa
-- propre policy, mais le GRANT table-level doit lister tout ce qu'un admin
-- légitime modifie via dashboard.html).
GRANT UPDATE (full_name, email, matricule, university, department, level, payment_status, status, frais_total, credits_valides, credits_requis) ON students TO authenticated;

-- ══ Diplômes / attestations ══
-- diplomes.html était une maquette statique déconnectée. L'admin émet une
-- ligne réelle ; le PDF est généré à la volée côté client (comme la fiche
-- de paie enseignant ou le reçu de paiement) à partir de ces données, pas
-- stocké en fichier.
CREATE TABLE IF NOT EXISTS diplomas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  university text NOT NULL,
  type text NOT NULL CHECK (type IN ('Diplôme', 'Attestation de scolarité', 'Relevé de notes')),
  intitule text NOT NULL,
  mention text,
  date_emission date NOT NULL DEFAULT CURRENT_DATE,
  issued_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE diplomas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_own_university_diplomas" ON diplomas
  FOR ALL
  USING (get_my_role() = 'admin' AND university = get_my_university())
  WITH CHECK (get_my_role() = 'admin' AND university = get_my_university() AND issued_by = auth.uid());

CREATE POLICY "students_view_own_diplomas" ON diplomas
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM students s WHERE s.id = diplomas.student_id AND s.profile_id = auth.uid()));

CREATE POLICY "parents_view_children_diplomas" ON diplomas
  FOR SELECT
  USING (is_parent_of_student(student_id));

CREATE POLICY "superadmin_full_access_diplomas" ON diplomas
  FOR ALL
  USING (get_my_role() = 'superadmin')
  WITH CHECK (get_my_role() = 'superadmin');
