// Initie le paiement de l'abonnement Dell Digital pour une université (plan
// Starter/Pro). Nécessite un JWT valide (verify_jwt=true) — l'appelant doit
// être l'admin de l'université concernée. Mode sandbox tant que CINETPAY_API_KEY
// n'est pas configuré (compte marchand CinetPay partagé, non vérifié).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const PRICES_FCFA: Record<string, number> = { starter: 25000, pro: 75000 };
const CINETPAY_BASE_URL = 'https://api-checkout.cinetpay.com/v2';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
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

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const plan = body.plan;
  const amount = plan ? PRICES_FCFA[plan] : undefined;
  if (!plan || !amount) {
    return json({ error: "Plan invalide — choix possibles : starter, pro. (enterprise = sur devis, nous contacter)" }, 400);
  }

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
  });

  const cinetpayKey = Deno.env.get('CINETPAY_API_KEY');
  if (!cinetpayKey) {
    return json({
      transaction_id: transactionId,
      url_paiement: `https://checkout.cinetpay.com/demo/${transactionId}`,
      montant: amount,
      mode: 'sandbox',
    });
  }

  try {
    const resp = await fetch(`${CINETPAY_BASE_URL}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: cinetpayKey,
        site_id: Deno.env.get('CINETPAY_SITE_ID'),
        amount,
        currency: 'XOF',
        transaction_id: transactionId,
        description: `Abonnement UniManage ${plan} — ${uni.name}`,
        return_url: `https://unimanagerdell.com/paiement-retour.html?transaction_id=${transactionId}`,
        notify_url: `${supabaseUrl}/functions/v1/confirmer-paiement-abonnement`,
        customer_name: uni.name,
        customer_email: Deno.env.get('DELLDIGITAL_EMAIL') || 'delldigital1@gmail.com',
        channels: 'ALL',
        lang: 'fr',
      }),
    });
    const data = await resp.json();
    if (data.code !== '201') {
      return json({
        transaction_id: transactionId, url_paiement: '', montant: amount,
        erreur: data.message || data.description || 'Réponse CinetPay inattendue',
      });
    }
    return json({
      transaction_id: transactionId,
      url_paiement: data.data?.payment_url || '',
      montant: amount,
      mode: 'production',
    });
  } catch (e) {
    return json({ transaction_id: transactionId, url_paiement: '', montant: amount, erreur: String(e) });
  }
});
