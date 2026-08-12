-- Journal réel des envois d'email (notifications.html). Le "composer" était
-- 100% simulé (setTimeout + toast), avec des canaux SMS/Push/WhatsApp
-- fictifs, des statistiques d'ouverture inventées et des "connecteurs"
-- Twilio/SendGrid/Firebase jamais réellement configurés. Seul l'Email est
-- câblé pour de vrai ici (via Resend, edge function send-notification-email)
-- — SMS/Push restent explicitement affichés comme "bientôt disponible" côté
-- UI plutôt que simulés (décision utilisateur du 2026-08-12).
-- Appliqué via Supabase MCP le 2026-08-12 — ce fichier documente ce qui est
-- en prod, il n'est pas exécuté automatiquement (pas de pipeline de
-- migration ici).

CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university text NOT NULL,
  sent_by uuid REFERENCES profiles(id),
  recipient_type text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'Envoyé' CHECK (status IN ('Envoyé', 'Échec', 'Partiel')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- FOR ALL est sûr ici (contrairement à invites) : cette table n'est jamais
-- mise à jour par quelqu'un d'autre que celui qui vient de créer la ligne
-- (l'edge function insère juste après l'envoi, avec le JWT de l'appelant).
CREATE POLICY "admins_manage_own_university_notification_log" ON notification_log
  FOR ALL
  USING (get_my_role() = 'admin' AND university = get_my_university())
  WITH CHECK (get_my_role() = 'admin' AND university = get_my_university() AND sent_by = auth.uid());
