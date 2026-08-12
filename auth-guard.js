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
