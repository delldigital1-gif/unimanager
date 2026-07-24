// Webhook CinetPay — confirme le paiement de l'abonnement, active l'université,
// puis notifie Dell Digital Partner pour créditer la commission de l'affilié
// (produit saas_unimanage, même pourcentage que consultant_ai). Pas de JWT
// (verify_jwt=false) : c'est CinetPay qui appelle, jamais un utilisateur —
// on ne fait donc jamais confiance au corps de la requête, on revérifie
// systématiquement auprès de CinetPay (mode sandbox : toujours accepté si
// CINETPAY_API_KEY n'est pas configuré, même convention qu'ERP IA).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CINETPAY_BASE_URL = 'https://api-checkout.cinetpay.com/v2';
const PARTNER_API_URL = 'https://partner.erpdelldigital.com';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function extractTransactionId(req: Request): Promise<string | null> {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get('transaction_id') ?? url.searchParams.get('cpm_trans_id');
  if (fromQuery) return fromQuery;
  try {
    const body = await req.json();
    return body.transaction_id ?? body.cpm_trans_id ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const transactionId = await extractTransactionId(req);
  if (!transactionId) return json({ error: 'Missing transaction_id' }, 400);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: payment } = await serviceClient
    .from('subscription_payments').select('*').eq('transaction_id', transactionId).maybeSingle();
  if (!payment) return json({ error: 'Transaction introuvable' }, 404);
  if (payment.statut === 'Confirmé') return json({ received: true, skipped: 'already_processed' });

  const cinetpayKey = Deno.env.get('CINETPAY_API_KEY');
  let accepted = true;
  if (cinetpayKey) {
    try {
      const resp = await fetch(`${CINETPAY_BASE_URL}/payment/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey: cinetpayKey,
          site_id: Deno.env.get('CINETPAY_SITE_ID'),
          transaction_id: transactionId,
        }),
      });
      const data = await resp.json();
      accepted = data?.data?.status === 'ACCEPTED';
    } catch {
      accepted = false;
    }
  }

  if (!accepted) {
    await serviceClient.from('subscription_payments').update({ statut: 'Annulé' }).eq('transaction_id', transactionId);
    return json({ received: true, accepted: false });
  }

  await serviceClient
    .from('subscription_payments')
    .update({ statut: 'Confirmé', paid_at: new Date().toISOString() })
    .eq('transaction_id', transactionId);

  const nextRenewal = new Date();
  nextRenewal.setMonth(nextRenewal.getMonth() + 1);
  // universities.plan a une contrainte CHECK sur 'Starter'/'Pro'/'Enterprise' (capitalisé)
  // alors que payment.plan est en minuscule (clé interne starter/pro).
  const planCapitalized = payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1);
  await serviceClient
    .from('universities')
    .update({
      status: 'Actif',
      plan: planCapitalized,
      price_monthly: payment.amount_fcfa,
      subscription_renews_at: nextRenewal.toISOString().slice(0, 10),
    })
    .eq('id', payment.university_id);

  // Notifie Partner pour créditer la commission — best-effort, ne doit jamais
  // faire échouer la confirmation du paiement elle-même (leçon apprise sur le
  // pont ERP IA : isoler chaque effet de bord).
  if (payment.ref_affilie) {
    try {
      const { data: secret } = await serviceClient.rpc('get_partner_webhook_secret');
      if (secret) {
        await fetch(`${PARTNER_API_URL}/api/webhooks/external-sale`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
          body: JSON.stringify({
            eventId: transactionId,
            productType: 'saas_unimanage',
            amountCents: Number(payment.amount_fcfa) * 100,
            currency: 'XOF',
            referralCode: payment.ref_affilie,
            providerTransactionId: transactionId,
            metadata: { university_id: payment.university_id, plan: payment.plan },
          }),
        });
      }
    } catch (e) {
      console.error('Notification Partner échouée:', e);
    }
  }

  return json({ received: true, accepted: true });
});
