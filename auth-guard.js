const ROLE_REDIRECTS = {
  admin: 'dashboard.html',
  enseignant: 'enseignant.html',
  etudiant: 'etudiant.html',
  superadmin: 'superadmin.html',
  parent: 'parents.html'
};

// Call at the top of any protected page. Pass an expected role (e.g. 'admin')
// to enforce that this page belongs to that role, or call with no argument
// to just require any logged-in user (shared pages like hub.html, examens.html...).
async function requireAuth(expectedRole) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
    return null;
  }

  if (expectedRole && profile.role !== expectedRole) {
    window.location.href = ROLE_REDIRECTS[profile.role] || 'login.html';
    return null;
  }

  // Gate d'abonnement : bloque l'accès si l'université n'a pas d'abonnement payant
  // actif. Souscription directe, plus de période d'essai — le paiement est requis
  // dès la création du compte (trial_ends_at n'est plus renseigné pour les
  // nouvelles inscriptions, voir handle_new_user()). Fail-open si aucune ligne
  // universities ne correspond (comptes démo, superadmin, données créées avant
  // l'introduction du suivi d'abonnement). Exempte aussi paiement-retour.html :
  // sinon un paiement tout juste effectué (webhook pas encore traité) renverrait
  // l'université vers paiement-requis.html au lieu de lui montrer la confirmation.
  const pageExempteDuGate = location.pathname.endsWith('paiement-retour.html');
  if (!pageExempteDuGate && profile.role !== 'superadmin' && profile.university) {
    const { data: uni } = await supabaseClient
      .from('universities')
      .select('status')
      .eq('name', profile.university)
      .maybeSingle();
    const abonnementInactif = uni && uni.status !== 'Actif';
    if (abonnementInactif) {
      window.location.href = 'paiement-requis.html';
      return null;
    }
  }

  window.currentUser = profile;
  document.documentElement.style.visibility = 'visible';
  return profile;
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

// Gate un module entier réservé à certains plans (répartition stratégique
// décidée le 2026-08-13 : Notifications/Rapports = Pro+, Diplômes =
// Enterprise). Remplace le contenu de containerSelector par une carte de
// verrouillage si le plan de l'université ne suffit pas. Retourne true si
// l'accès est autorisé (rien n'est modifié), false sinon.
async function gateByPlan(containerSelector, requiredPlans, moduleLabel) {
  const { data: uni } = await supabaseClient
    .from('universities').select('plan').eq('name', window.currentUser?.university).maybeSingle();
  const plan = uni?.plan || 'Starter';
  if (requiredPlans.includes(plan)) return true;

  const container = document.querySelector(containerSelector);
  if (!container) return false;
  const minPlan = requiredPlans[0];
  const enterpriseOnly = requiredPlans.length === 1 && requiredPlans[0] === 'Enterprise';

  container.innerHTML = `
    <div style="max-width:480px;margin:4rem auto;text-align:center;padding:2.5rem;background:white;border:1.5px solid var(--border,#E2E8F0);border-radius:16px;">
      <div style="font-size:2.5rem;margin-bottom:1rem">🔒</div>
      <h2 style="font-family:'Playfair Display',serif;font-size:1.3rem;margin-bottom:.5rem">${moduleLabel} — plan ${minPlan}+</h2>
      <p style="color:var(--gray,#64748B);font-size:.9rem;margin-bottom:1.5rem">Votre université est actuellement sur le plan <strong>${plan}</strong>. Passez au plan ${minPlan} pour débloquer ${moduleLabel}.</p>
      ${enterpriseOnly
        ? `<a href="https://wa.me/22898069111" target="_blank" style="display:inline-block;padding:.85rem 1.75rem;border-radius:10px;background:var(--blue,#1A56DB);color:white;text-decoration:none;font-weight:700;font-size:.9rem;">Nous contacter</a>`
        : `<button onclick="startPlanUpgrade('${minPlan.toLowerCase()}')" style="padding:.85rem 1.75rem;border-radius:10px;background:var(--blue,#1A56DB);color:white;border:none;font-weight:700;font-size:.9rem;cursor:pointer;">Passer au plan ${minPlan}</button>`}
      <div id="planUpgradeStatus" style="margin-top:1rem;font-size:.82rem;color:var(--gray,#64748B)"></div>
    </div>`;
  document.documentElement.style.visibility = 'visible';
  return false;
}

async function startPlanUpgrade(plan) {
  const statusEl = document.getElementById('planUpgradeStatus');
  if (statusEl) statusEl.textContent = '⏳ Préparation du paiement…';
  const { data: { session } } = await supabaseClient.auth.getSession();
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/initier-paiement-abonnement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ plan }),
    });
    const data = await resp.json();
    if (!resp.ok || data.erreur) {
      if (statusEl) statusEl.textContent = '⚠️ ' + (data.erreur || data.error || 'Erreur inconnue');
      return;
    }
    if (data.mode === 'sandbox' && statusEl) {
      statusEl.textContent = `🧪 Mode sandbox — transaction ${data.transaction_id} créée.`;
    }
    window.location.href = data.url_paiement + (data.url_paiement.includes('?') ? '&' : '?') + 'transaction_id=' + data.transaction_id;
  } catch (e) {
    if (statusEl) statusEl.textContent = '⚠️ Impossible de contacter le service de paiement.';
  }
}
