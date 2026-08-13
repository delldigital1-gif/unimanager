// Envoi d'email réel aux étudiants/enseignants d'une université, via Resend.
// Remplace le "composer" 100% simulé de notifications.html (SMS/Push/
// WhatsApp restent hors-scope — pas de fournisseur configuré, cf. décision
// utilisateur 2026-08-12). Nécessite un JWT valide (verify_jwt=true) —
// l'appelant doit être l'admin de l'université concernée.
//
// FIX (2026-08-13) : toutes les erreurs "métier" (pas de destinataire, pas
// admin, clé Resend absente...) renvoient désormais un statut HTTP 200 avec
// {error: "..."} dans le corps, au lieu de 400/401/403/500. Avec un statut
// non-2xx, supabase-js v2 lève une FunctionsHttpError dont le corps de
// réponse est parfois déjà consommé en interne — .context.json() échoue
// silencieusement côté frontend et un message générique s'affiche à la
// place du vrai message d'erreur. Un 200 avec un champ `error` explicite
// est lisible de façon fiable via `data.error`.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_URL = 'https://api.resend.com/emails/batch';
const BATCH_SIZE = 100; // limite Resend par requête batch

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' });

  const { data: profile } = await userClient
    .from('profiles').select('role, university').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin' || !profile.university) {
    return json({ error: 'Réservé aux administrateurs' });
  }

  let body: { recipient_type?: string; department?: string; subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corps de requête invalide' });
  }

  const { recipient_type, department, subject, message } = body;
  if (!recipient_type || !subject || !message) {
    return json({ error: 'recipient_type, subject et message sont requis' });
  }

  // ── Résolution des destinataires réels (jamais de liste inventée) ──
  const recipients: { email: string; full_name: string }[] = [];
  if (recipient_type === 'etudiants' || recipient_type === 'tous') {
    let q = userClient.from('students').select('email, full_name').eq('university', profile.university).not('email', 'is', null);
    if (department) q = q.eq('department', department);
    const { data } = await q;
    (data || []).forEach(s => { if (s.email) recipients.push({ email: s.email, full_name: s.full_name }); });
  }
  if (recipient_type === 'enseignants' || recipient_type === 'tous') {
    let q = userClient.from('teachers').select('email, full_name').eq('university', profile.university).not('email', 'is', null);
    if (department) q = q.eq('department', department);
    const { data } = await q;
    (data || []).forEach(t => { if (t.email) recipients.push({ email: t.email, full_name: t.full_name }); });
  }

  const uniqueRecipients = Array.from(new Map(recipients.map(r => [r.email, r])).values());
  if (uniqueRecipients.length === 0) {
    return json({ error: 'Aucun destinataire trouvé pour ce critère (aucun étudiant/enseignant avec un email renseigné pour votre université)' });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') || 'UniManage <onboarding@resend.dev>';
  const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  if (!resendKey) {
    await serviceClient.from('notification_log').insert({
      university: profile.university, sent_by: user.id, recipient_type,
      recipient_count: uniqueRecipients.length, sent_count: 0, failed_count: uniqueRecipients.length,
      subject, body: message, status: 'Échec',
    });
    return json({ error: "Aucune clé Resend configurée côté serveur (RESEND_API_KEY manquante)." });
  }

  const htmlBody = message.split('\n').map(line => `<p>${line}</p>`).join('');
  let sentCount = 0;
  let failedCount = 0;
  let lastError: string | null = null;

  for (let i = 0; i < uniqueRecipients.length; i += BATCH_SIZE) {
    const chunk = uniqueRecipients.slice(i, i + BATCH_SIZE);
    const payload = chunk.map(r => ({
      from: fromAddress,
      to: [r.email],
      subject,
      html: `<p>Bonjour ${r.full_name || ''},</p>${htmlBody}`,
    }));
    try {
      const resp = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (resp.ok) {
        sentCount += chunk.length;
      } else {
        failedCount += chunk.length;
        lastError = data?.message || JSON.stringify(data);
      }
    } catch (e) {
      failedCount += chunk.length;
      lastError = String(e);
    }
  }

  const status = failedCount === 0 ? 'Envoyé' : sentCount === 0 ? 'Échec' : 'Partiel';
  await serviceClient.from('notification_log').insert({
    university: profile.university, sent_by: user.id, recipient_type,
    recipient_count: uniqueRecipients.length, sent_count: sentCount, failed_count: failedCount,
    subject, body: message, status,
  });

  return json({ recipient_count: uniqueRecipients.length, sent_count: sentCount, failed_count: failedCount, error: lastError });
});
