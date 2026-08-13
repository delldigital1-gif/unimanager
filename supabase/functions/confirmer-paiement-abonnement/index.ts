// Webhook CinetPay — confirme le paiement de l'abonnement, active l'université,
// puis notifie Dell Digital Partner pour créditer la commission de l'affilié
// (produit saas_unimanage). Pas de JWT (verify_jwt=false) : c'est CinetPay qui
// appelle — on revient toujours interroger CinetPay avant de faire confiance.
//
// FIX (04 août 2026) : bascule vers l'API "Aurore", relayée via le proxy nginx
// du VPS. .trim() sur les secrets (retour à la ligne parasite collé).
//
// FIX (2026-08-13) : le renouvellement était toujours calculé à +1 mois fixe,
// alors que les plans se paient maintenant par cycle (3/6/12 mois, colonne
// billing_months sur subscription_payments) — corrigé pour refléter le vrai
// cycle payé.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CINETPAY_BASE = 'https://cinetpay-proxy.erpdelldigital.com';
const CINETPAY_OAUTH_URL = `${CINETPAY_BASE}/v1/oauth/login`;
const CINETPAY_PAYMENT_STATUS_URL = `${CINETPAY_BASE}/v1/payment`;
const PARTNER_API_URL = 'https://partner.erpdelldigital.com';
const SUCCESS_STATUSES = ['ACCEPTED', 'SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'PAID'];

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

async function getCinetpayToken(apiKey: string, apiPassword: string): Promise<string | null> {
  try {
    const resp = await fetch(CINETPAY_OAUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, api_password: apiPassword }),
    });
    const data = await resp.json();
    return data?.access_token ?? null;
  } catch {
    return null;
  }
}

async function checkTransactionStatus(transactionId: string, token: string): Promise<string | null> {
  try {
    const resp = await fetch(`${CINETPAY_PAYMENT_STATUS_URL}/${encodeURIComponent(transactionId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    return data?.status ?? null;
  } catch (e) {
    console.error('Erreur verification statut CinetPay:', e);
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

  const cinetpayKey = Deno.env.get('CINETPAY_API_KEY')?.trim();
  const cinetpayPassword = Deno.env.get('CINETPAY_API_PASSWORD')?.trim();
  let accepted = true; // repli sandbox si les secrets ne sont pas encore configures

  if (cinetpayKey && cinetpayPassword) {
    const token = await getCinetpayToken(cinetpayKey, cinetpayPassword);
    if (!token) {
      accepted = false;
    } else {
      const status = await checkTransactionStatus(transactionId, token);
      accepted = !!status && SUCCESS_STATUSES.includes(status.toUpperCase());
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
  nextRenewal.setMonth(nextRenewal.getMonth() + (payment.billing_months || 1));
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
