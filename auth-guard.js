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

  window.currentUser = profile;
  document.documentElement.style.visibility = 'visible';
  return profile;
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}
