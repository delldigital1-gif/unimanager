// Initie le paiement de l'abonnement Dell Digital pour une université
// (plan Starter/Pro/Max × cycle trimestriel/semestriel/annuel — plus de
// mensuel, ni de calcul par pourcentage : chaque combinaison plan×cycle a
// un prix fixe, décidé le 2026-08-13, sur le modèle du sélecteur de
// période de SynergySphere). Nécessite un JWT valide (verify_jwt=true) —
// l'appelant doit être l'admin de l'université concernée.
//
// FIX (04 août 2026) : bascule de l'ancienne API CinetPay (apikey+site_id,
// dépréciée confirmé par leur support) vers la nouvelle API "Aurore" (OAuth
// api_key+api_password -> token, POST /v1/payment), relayée via le proxy
// nginx du VPS (IP fixe whitelistée côté CinetPay). .trim() sur les secrets :
// un retour à la ligne parasite avait été collé dans CINETPAY_API_KEY.
//
// PROBLEME OUVERT (04 août 2026) : l'OAuth reussit (token obtenu, user_id 391)
// mais POST /v1/payment renvoie 422 INVALID_TOKEN (code 1002) avec ce même
// token, alors que le même enchainement fonctionne sur NAOLA. A signaler au
// support CinetPay.
//
// FIX (2026-08-13) : CORS manquant — aucun header Access-Control-Allow-*,
// donc tout appel fetch() depuis le navigateur échouait avant même
// d'atteindre ce code. Même bug que send-notification-email, corrigé
// selon le même pattern : préflight OPTIONS + headers CORS sur les réponses.
import { createClient } from 'jsr:@supabase/supabase-js@2';

type Cycle = 'trimestriel' | 'semestriel' | 'annuel';
const CYCLE_MONTHS: Record<Cycle, number> = { trimestriel: 3, semestriel: 6, annuel: 12 };

const PRICES_FCFA: Record<string, Record<Cycle, number>> = {
  starter: { trimestriel: 375000, semestriel: 750000, annuel: 1500000 },
  pro: { trimestriel: 300000, semestriel: 600000, annuel: 1200000 },
  max: { trimestriel: 450000, semestriel: 900000, annuel: 1800000 },
};

const CINETPAY_BASE = 'https://cinetpay-proxy.erpdelldigital.com';
const CINETPAY_OAUTH_URL = `${CINETPAY_BASE}/v1/oauth/login`;
const CINETPAY_PAYMENT_URL = `${CINETPAY_BASE}/v1/payment`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let body: { plan?: string; cycle?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const plan = body.plan;
  const cycle = body.cycle as Cycle | undefined;
  const amount = plan && cycle ? PRICES_FCFA[plan]?.[cycle] : undefined;
  if (!plan || !cycle || !amount) {
    return json({ error: "Plan ou période invalide — plans : starter, pro, max. Périodes : trimestriel, semestriel, annuel." }, 400);
  }
  const months = CYCLE_MONTHS[cycle];

  const { data: profile } = await userClient
    .from('profiles').select('university').eq('id', user.id).single();
  if (!profile?.university) return json({ error: 'Aucune université associée à ce compte' }, 400);

  const { data: uni } = await userClient
    .from('universities').select('id, name, ref_affilie').eq('name', profile.university).maybeSingle();
  if (!uni) return json({ error: 'Université introuvable' }, 404);

  const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const transactionId = `DDU-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  await serviceClient.from('subscription_payments').insert({
    university_id: uni.id,
    plan,
    amount_fcfa: amount,
    transaction_id: transactionId,
    statut: 'En attente',
    ref_affilie: uni.ref_affilie,
    billing_cycle: cycle,
    billing_months: months,
  });

  const cinetpayApiKey = Deno.env.get('CINETPAY_API_KEY')?.trim();
  const cinetpayApiPassword = Deno.env.get('CINETPAY_API_PASSWORD')?.trim();
  if (!cinetpayApiKey || !cinetpayApiPassword) {
    return json({
      transaction_id: transactionId,
      url_paiement: `https://checkout.cinetpay.com/demo/${transactionId}`,
      montant: amount,
      mode: 'sandbox',
    });
  }

  const token = await getCinetpayToken(cinetpayApiKey, cinetpayApiPassword);
  if (!token) {
    return json({
      transaction_id: transactionId, url_paiement: '', montant: amount,
      erreur: 'Authentification CinetPay échouée (vérifier CINETPAY_API_KEY / CINETPAY_API_PASSWORD)',
    });
  }

  try {
    const resp = await fetch(CINETPAY_PAYMENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        currency: 'XOF',
        merchant_transaction_id: transactionId,
        amount,
        lang: 'fr',
        designation: `Abonnement UniManage ${plan} (${cycle}) — ${uni.name}`.slice(0, 100),
        client_email: Deno.env.get('DELLDIGITAL_EMAIL') || 'delldigital1@gmail.com',
        client_first_name: uni.name,
        client_last_name: uni.name,
        success_url: `https://unimanagerdell.com/paiement-retour.html?transaction_id=${transactionId}`,
        failed_url: `https://unimanagerdell.com/paiement-retour.html?transaction_id=${transactionId}&status=failed`,
        notify_url: `${supabaseUrl}/functions/v1/confirmer-paiement-abonnement`,
        channel: 'ALL',
        direct_pay: false,
      }),
    });
    const data = await resp.json();
    const paymentUrl = data?.payment_url || data?.data?.payment_url || '';
    if (!paymentUrl) {
      return json({
        transaction_id: transactionId, url_paiement: '', montant: amount,
        erreur: data?.message || data?.description || 'Réponse CinetPay inattendue',
      });
    }
    return json({
      transaction_id: transactionId,
      url_paiement: paymentUrl,
      montant: amount,
      mode: 'production',
    });
  } catch (e) {
    return json({ transaction_id: transactionId, url_paiement: '', montant: amount, erreur: String(e) });
  }
});
