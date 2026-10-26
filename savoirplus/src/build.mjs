// Génère le site vitrine Savoir+ dans savoirplus/public/ : node savoirplus/src/build.mjs
// Textes écrits pour Savoir+ (aucun texte, logo ni image repris d'un autre site). Les tarifs sont PROVISOIRES (à réviser).
import fs from "node:fs";
import path from "node:path";

const SORTIE = path.resolve(import.meta.dirname, "..", "public");
const NOM = "Savoir+";
const URL_SITE = "https://savoirplus.vercel.app";
const CONTACT = {
  whatsapp: "[À COMPLÉTER : numéro WhatsApp]",
  telephone: "[À COMPLÉTER : téléphone]",
  email: "[À COMPLÉTER : e-mail]",
  adresse: "Lomé, Togo",
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const LOGO = `<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="#1d3a8a"/><path d="M10 14.5c4-1.6 9-1.4 14 1.3v19c-5-2.7-10-2.9-14-1.3v-19z" fill="#fff"/><path d="M38 14.5c-4-1.6-9-1.4-14 1.3v19c5-2.7 10-2.9 14-1.3v-19z" fill="#dbe6ff"/><circle cx="36" cy="12" r="8" fill="#f59e0b"/><path d="M36 8v8M32 12h8" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/></svg>`;

const NAV = [
  ["/#fonctionnalites", "Fonctionnalités"],
  ["/tarifs.html", "Tarifs"],
  ["/faq.html", "FAQ"],
  ["/contact.html", "Contact"],
];

function page({ fichier, titre, description, courant, corps, bandeDemo = false }) {
  const menu = NAV.map(([h, l]) => `<a href="${h}"${courant === h ? ' aria-current="page"' : ""}>${l}</a>`).join("");
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex, nofollow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${NOM}">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${URL_SITE}/assets/apercu.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1d3a8a">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<a class="lien-evitement" href="#contenu">Aller au contenu</a>
${bandeDemo ? `<div class="bande-demo"><div class="conteneur"><strong>Démo :</strong> données fictives, aucun e-mail envoyé, aucun paiement réel. <a href="/demo.html">Changer d'école ou de rôle</a> · <a href="/">Retour au site</a></div></div>` : ""}
<header class="entete">
  <div class="conteneur entete-ligne">
    <a class="marque" href="/" aria-label="${NOM}, accueil">${LOGO}<span>Savoir<span class="plus">+</span></span></a>
    <button class="burger" type="button" aria-expanded="false" aria-controls="menu" aria-label="Ouvrir le menu">☰</button>
    <nav class="menu" id="menu" aria-label="Navigation principale">
      ${menu}
      <a href="/demo.html">Essayer la démo</a>
      <a class="bouton bouton-petit" href="/connexion.html">Se connecter</a>
    </nav>
  </div>
</header>
<main id="contenu">
${corps}
</main>
<footer class="pied">
  <div class="conteneur">
    <div class="pied-grille">
      <div>
        <a class="marque" href="/">${LOGO}<span>Savoir<span class="plus">+</span></span></a>
        <p style="margin-top:12px">La plateforme de gestion pour les écoles d'Afrique francophone : notes, bulletins, absences, frais de scolarité et suivi des élèves.</p>
      </div>
      <div>
        <h3>Le site</h3>
        <ul>
          <li><a href="/#fonctionnalites">Fonctionnalités</a></li>
          <li><a href="/tarifs.html">Tarifs</a></li>
          <li><a href="/faq.html">Questions fréquentes</a></li>
          <li><a href="/demo.html">Essayer la démo</a></li>
        </ul>
      </div>
      <div>
        <h3>Nous joindre</h3>
        <ul>
          <li><a href="/contact.html">Demander une démo</a></li>
          <li>${esc(CONTACT.adresse)}</li>
          <li><a href="/connexion.html">Se connecter</a></li>
        </ul>
      </div>
    </div>
    <div class="pied-bas">© 2026 ${NOM} · Une solution développée par Dell Digital, Lomé (Togo).</div>
  </div>
</footer>
<script src="/assets/app.js" defer></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- Accueil
const accueil = `
<section class="heros">
  <div class="conteneur heros-grille">
    <div>
      <p class="surtitre">Pensé pour les écoles d'Afrique francophone</p>
      <h1>Toute votre école, <span>enfin au même endroit.</span></h1>
      <p class="lead">Notes et bulletins, absences, frais de scolarité et suivi de chaque élève : une seule plateforme, qui fonctionne dans le navigateur de n'importe quel téléphone, même avec une connexion limitée.</p>
      <div class="actions">
        <a class="bouton" href="/demo.html">Essayer la démo</a>
        <a class="bouton bouton-clair" href="/tarifs.html">Voir les tarifs</a>
      </div>
      <ul class="badges"><li>Sans installation</li><li>Mobile money</li><li>Français et anglais</li></ul>
    </div>
    <div class="maquette" aria-label="Exemple de bulletin, données fictives">
      <div class="maquette-ecole">École démo</div>
      <h3>Élève exemple — 5e B</h3>
      <div class="maquette-ligne"><span>Moyenne du trimestre</span><strong>15,8 / 20</strong></div>
      <div class="maquette-ligne"><span>Rang</span><strong>3e sur 42</strong></div>
      <div class="maquette-ligne"><span>Trimestre</span><strong>1 · 2026-2027</strong></div>
      <span class="sceau">Bulletin signé numériquement</span>
      <p class="maquette-note">Exemple fictif.</p>
    </div>
  </div>
</section>

<div class="conteneur chiffres" aria-label="Points forts">
  <div class="chiffre"><strong>1 clic</strong><span>pour générer les bulletins</span></div>
  <div class="chiffre"><strong>Mobile money</strong><span>pour régler les frais</span></div>
  <div class="chiffre"><strong>24 h / 24</strong><span>un tuteur IA pour les élèves</span></div>
</div>

<section class="section" id="fonctionnalites">
  <div class="conteneur">
    <div class="centre">
      <p class="surtitre">Trois piliers, une seule plateforme</p>
      <h2>Ce dont votre établissement a besoin</h2>
      <p class="intro">De l'inscription au bulletin, en passant par l'encaissement des frais et le suivi pédagogique, sans changer d'outil.</p>
    </div>
    <div class="grille g3">
      <article class="carte">
        <h3><span class="pastille">🏫</span> Gestion scolaire</h3>
        <p>Élèves, classes, notes, absences, emplois du temps et échanges avec les familles au même endroit.</p>
        <ul class="coches">
          <li>Dossiers d'élèves et inscriptions</li>
          <li>Notes saisies par les enseignants, moyennes et rangs calculés pour vous</li>
          <li>Bulletins prêts à imprimer, avec signature numérique</li>
          <li>Absences et retards suivis par la vie scolaire</li>
          <li>Emplois du temps et cahier de textes</li>
          <li>Messagerie entre l'école, les enseignants et les parents</li>
        </ul>
      </article>
      <article class="carte">
        <h3><span class="pastille">💳</span> Frais et paiements</h3>
        <p>Les familles paient depuis leur téléphone ; l'école garde une trace claire de chaque versement.</p>
        <ul class="coches">
          <li>Paiement par Flooz et TMoney</li>
          <li class="bientot">Carte bancaire et autres moyens <span class="etiquette">Bientôt</span></li>
          <li>Encaissements en espèces et par chèque saisis par le comptable</li>
          <li>Reçu généré à chaque paiement</li>
          <li>Échéanciers et relances automatiques</li>
          <li>Tableau de bord des encaissements et des impayés</li>
        </ul>
      </article>
      <article class="carte">
        <h3><span class="pastille">🤖</span> Tuteur IA</h3>
        <p>À partir des notes, l'IA repère les difficultés de chaque élève et lui propose de s'entraîner, comme un répétiteur disponible à toute heure.</p>
        <ul class="coches">
          <li>Points faibles repérés automatiquement</li>
          <li>Exercices adaptés à la matière et au niveau</li>
          <li>Correction avec explications pas à pas</li>
          <li>Suivi des compétences acquises</li>
          <li>Tableau de bord pédagogique pour la direction</li>
        </ul>
      </article>
    </div>
  </div>
</section>

<section class="section section-blanche">
  <div class="conteneur">
    <div class="grille g2">
      <article class="carte">
        <p class="surtitre">Pour l'école</p>
        <h2>Du temps gagné, des erreurs en moins</h2>
        <ul class="coches">
          <li>Moins de papier, plus de temps pour la pédagogie</li>
          <li>Plus d'erreurs de calcul sur les moyennes</li>
          <li>Une image moderne qui rassure les familles</li>
          <li>Moins d'impayés grâce au paiement mobile</li>
        </ul>
      </article>
      <article class="carte">
        <p class="surtitre">Pour les parents</p>
        <h2>Suivre son enfant, simplement</h2>
        <ul class="coches">
          <li>Payer les frais de chez soi, sans file d'attente</li>
          <li>Recevoir son reçu tout de suite</li>
          <li>Consulter notes et bulletins à tout moment</li>
          <li>Suivre les devoirs, les absences et les retards</li>
        </ul>
      </article>
    </div>
  </div>
</section>

<section class="section">
  <div class="conteneur">
    <div class="centre">
      <p class="surtitre">Un accès adapté à chacun</p>
      <h2>Sept espaces, un par métier</h2>
      <p class="intro">Chaque personne voit uniquement ce qui la concerne.</p>
    </div>
    <div class="grille g4">
      <article class="carte"><h3>Directeur</h3><p>Tableau de bord de l'école, validation des admissions, bulletins et paramètres.</p></article>
      <article class="carte"><h3>Secrétaire</h3><p>Demandes d'admission, dossiers des élèves et des parents.</p></article>
      <article class="carte"><h3>Comptable</h3><p>Frais de scolarité, encaissements, reçus et impayés.</p></article>
      <article class="carte"><h3>Enseignant</h3><p>Notes, appel, emploi du temps et cahier de textes.</p></article>
      <article class="carte"><h3>Surveillant</h3><p>Vie scolaire : absences, retards et suivi des élèves.</p></article>
      <article class="carte"><h3>Parent</h3><p>Suivi de l'enfant, bulletins, absences et paiement en ligne.</p></article>
      <article class="carte"><h3>Élève</h3><p>Notes, devoirs, emploi du temps et tuteur IA.</p></article>
      <article class="carte"><h3>Tous les types d'écoles</h3><p>Maternelle, primaire, collège, lycée ou complexe complet.</p></article>
    </div>
  </div>
</section>

<section class="section section-bleue">
  <div class="conteneur">
    <div class="centre">
      <p class="surtitre">Démarrer</p>
      <h2>Opérationnel en trois étapes</h2>
    </div>
    <div class="etapes">
      <div class="etape"><h3>On parle de votre école</h3><p>Un échange de 15 minutes, en visio ou sur WhatsApp, pour comprendre votre fonctionnement et vos priorités.</p></div>
      <div class="etape"><h3>On configure pour vous</h3><p>Nous importons vos élèves, vos classes et vos frais. Vous n'avez rien à ressaisir.</p></div>
      <div class="etape"><h3>Vous lancez</h3><p>Formation rapide des équipes, puis accompagnement pendant tout le trimestre.</p></div>
    </div>
    <p class="centre" style="margin-top:2rem"><a class="bouton bouton-orange" href="/tarifs.html">Voir les offres</a></p>
  </div>
</section>

<section class="section centre">
  <div class="etroit">
    <h2>Prêt à moderniser votre école ?</h2>
    <p class="intro">Essayez d'abord la démo, sans inscription ni mot de passe. Ou parlez-nous de votre établissement.</p>
    <div class="actions" style="justify-content:center">
      <a class="bouton" href="/demo.html">Essayer la démo</a>
      <a class="bouton bouton-clair" href="/contact.html">Demander une démo</a>
    </div>
  </div>
</section>`;

// ---------------------------------------------------------------- Tarifs (PROVISOIRES)
const PLANS = [
  {
    nom: "Essentiel",
    pour: "Petites écoles primaires et collèges qui passent au numérique.",
    prix: ["50 000", "80 000", "120 000"],
    vedette: false,
    points: [
      "Élèves, classes et inscriptions",
      "Notes et moyennes calculées automatiquement",
      "Bulletins en PDF prêts à imprimer",
      "Absences et retards",
      "Emplois du temps et cahier de textes",
      "Communication école, enseignants et parents",
      "Encaissement espèces et chèques, reçus imprimables",
      "Accès web sur mobile, tablette et ordinateur",
      "Assistance par e-mail sous un jour ouvré",
    ],
  },
  {
    nom: "Standard",
    pour: "Écoles établies qui veulent dématérialiser les paiements et réduire les impayés.",
    prix: ["100 000", "160 000", "240 000"],
    vedette: true,
    points: [
      "Tout ce qui est inclus dans Essentiel",
      "Paiement des frais par Flooz et TMoney",
      "Reçus envoyés automatiquement aux parents",
      "Échéanciers et relances automatiques des impayés",
      "Tableau de bord du trésorier",
      "Historique conservé sur plusieurs années",
      "Assistance par e-mail le jour même et par téléphone",
    ],
  },
  {
    nom: "Premium",
    pour: "Lycées privés et complexes scolaires à forte ambition pédagogique.",
    prix: ["150 000", "220 000", "300 000"],
    vedette: false,
    points: [
      "Tout ce qui est inclus dans Standard",
      "Tuteur IA : diagnostic du niveau par matière",
      "Exercices personnalisés générés par l'IA",
      "Corrections expliquées pas à pas",
      "Suivi des progrès par compétence",
      "Tableau de bord pédagogique pour la direction",
      "Exports avancés et accès à l'API",
      "Assistance prioritaire avec ligne directe",
    ],
  },
];
const PALIERS = ["Jusqu'à 150 élèves", "De 151 à 400 élèves", "Plus de 400 élèves"];

const tarifs = `
<section class="section">
  <div class="conteneur">
    <div class="centre">
      <p class="surtitre">Tarifs</p>
      <h1 style="font-size:clamp(1.9rem,4.6vw,3rem)">Une formule adaptée à chaque école</h1>
      <p class="intro">Choisissez selon les fonctionnalités dont vous avez besoin. Vous pouvez changer de formule à tout moment.</p>
    </div>
    <div class="note-tarifs"><strong>Tarifs provisoires.</strong> Les montants affichés sont en cours de révision et peuvent baisser avant le lancement officiel.</div>
    <div class="plans" id="offres">
      ${PLANS.map(
        (p) => `<article class="plan${p.vedette ? " plan-vedette" : ""}">
        ${p.vedette ? '<span class="plan-ruban">La plus choisie</span>' : ""}
        <h3>${p.nom}</h3>
        <p class="pour">${p.pour}</p>
        <div class="paliers">${p.prix.map((x, i) => `<div class="palier"><span>${PALIERS[i]}</span><strong>${x} <small>FCFA</small></strong></div>`).join("")}</div>
        <p class="par-an">par an et par établissement</p>
        <ul class="coches">${p.points.map((x) => `<li>${x}</li>`).join("")}</ul>
        <a class="bouton${p.vedette ? "" : " bouton-clair"}" href="/contact.html?offre=${encodeURIComponent(p.nom)}">Choisir ${p.nom}</a>
      </article>`
      ).join("")}
    </div>

    <div class="carte" style="margin-top:22px">
      <h3>Plus de 2 000 élèves, ou plusieurs établissements ?</h3>
      <p>Pour les complexes scolaires et les groupes, nous préparons une offre sur mesure : hébergement dédié, intégrations, niveau de service garanti.</p>
      <a class="bouton bouton-clair bouton-petit" href="/contact.html?offre=Sur-mesure">Demander un devis</a>
    </div>

    <div class="grille g3">
      <article class="carte"><h3>Frais d'installation</h3><p>Aucun. Vous ne payez que l'abonnement ; la reprise de vos données est incluse.</p></article>
      <article class="carte"><h3>Remises</h3><p>10 % en cas de paiement annuel d'avance, 5 % la deuxième année, et 50 % le premier mois après un parrainage validé.</p></article>
      <article class="carte"><h3>Modes de paiement</h3><p>Flooz, TMoney ou virement bancaire. Abonnement annuel payable en une fois ou en trois versements trimestriels.</p></article>
    </div>

    <h2 style="margin-top:2.4rem">Comparatif des formules</h2>
    <div class="tableau-cadre">
      <table class="comparatif">
        <thead><tr><th>Fonctionnalité</th><th>Essentiel</th><th>Standard</th><th>Premium</th></tr></thead>
        <tbody>
          <tr><td>Élèves, classes, inscriptions</td><td class="oui">✓</td><td class="oui">✓</td><td class="oui">✓</td></tr>
          <tr><td>Notes, bulletins, absences</td><td class="oui">✓</td><td class="oui">✓</td><td class="oui">✓</td></tr>
          <tr><td>Communication avec les parents</td><td class="oui">✓</td><td class="oui">✓</td><td class="oui">✓</td></tr>
          <tr><td>Encaissement espèces et chèques</td><td class="oui">✓</td><td class="oui">✓</td><td class="oui">✓</td></tr>
          <tr><td>Paiement mobile money (Flooz, TMoney)</td><td class="non">—</td><td class="oui">✓</td><td class="oui">✓</td></tr>
          <tr><td>Échéanciers et relances automatiques</td><td class="non">—</td><td class="oui">✓</td><td class="oui">✓</td></tr>
          <tr><td>Tableau de bord du trésorier</td><td class="non">—</td><td class="oui">✓</td><td class="oui">✓</td></tr>
          <tr><td>Historique conservé</td><td>1 année</td><td>Illimité</td><td>Illimité</td></tr>
          <tr><td>Tuteur IA (diagnostic et exercices)</td><td class="non">—</td><td class="non">—</td><td class="oui">✓</td></tr>
          <tr><td>Exports avancés et API</td><td class="non">—</td><td class="non">—</td><td class="oui">✓</td></tr>
          <tr><td>Assistance</td><td>E-mail, J+1</td><td>E-mail J+0 et téléphone</td><td>Prioritaire, ligne directe</td></tr>
        </tbody>
      </table>
    </div>

    <div class="centre" style="margin-top:2.4rem">
      <h2>Voir Savoir+ sur vos vraies données ?</h2>
      <p class="intro">Une démonstration gratuite de 30 minutes avec la liste de vos élèves. Sans engagement.</p>
      <div class="actions" style="justify-content:center"><a class="bouton" href="/contact.html">Demander une démo</a><a class="bouton bouton-clair" href="/demo.html">Essayer la démo en ligne</a></div>
    </div>
  </div>
</section>`;

// ---------------------------------------------------------------- FAQ
const FAQ = [
  ["Général", [
    ["Qu'est-ce que Savoir+ ?", "Une plateforme tout-en-un pour les écoles : gestion des élèves, des notes et des bulletins, suivi des absences, emplois du temps, encaissement des frais de scolarité et tuteur IA pour les élèves."],
    ["Savoir+ convient-il à la maternelle, au primaire, au collège et au lycée ?", "Oui. La plateforme s'adapte aux niveaux de chaque cycle, avec des types de notes et des calculs de moyennes propres à chacun. Elle sert aussi bien une école seule qu'un complexe qui va de la maternelle à la terminale."],
    ["Faut-il installer une application ?", "Non. Savoir+ s'ouvre dans le navigateur de n'importe quel téléphone, tablette ou ordinateur, même avec une connexion limitée. On peut l'ajouter à l'écran d'accueil pour y accéder comme à une application."],
  ]],
  ["Paiement des frais de scolarité", [
    ["Quels moyens de paiement sont acceptés ?", "Les parents règlent depuis leur téléphone par Flooz ou TMoney. Les autres moyens, comme la carte bancaire, seront ajoutés ensuite."],
    ["Peut-on encore payer en espèces ou par chèque à l'école ?", "Oui. Le comptable saisit l'encaissement dans Savoir+ ; un reçu est généré dans le même format que pour un paiement en ligne et l'échéance passe à « payée » chez le parent."],
    ["Comment le parent reçoit-il son reçu ?", "Un reçu est créé après chaque paiement, quel que soit le moyen, et reste consultable à tout moment dans l'espace du parent."],
    ["Que se passe-t-il en cas de retard ?", "Des relances sont envoyées aux familles avant et après l'échéance, et la direction dispose d'un tableau de bord pour suivre les impayés."],
  ]],
  ["Suivi pédagogique et bulletins", [
    ["Comment les moyennes et les bulletins sont-ils produits ?", "Les enseignants saisissent les notes ; Savoir+ calcule les moyennes et les rangs, puis génère le bulletin en un clic, avec signature numérique."],
    ["Les parents voient-ils les absences et les retards ?", "Oui. Chaque absence ou retard saisi par l'école est notifié au parent, qui le retrouve ensuite dans son espace."],
    ["Comment fonctionne le tuteur IA ?", "Il analyse les notes de l'élève, repère les matières à renforcer et propose des exercices adaptés. Il corrige les réponses, explique les erreurs pas à pas et propose de nouveaux exercices jusqu'à ce que la notion soit acquise. Il est inclus dans la formule Premium."],
  ]],
  ["Mise en route et données", [
    ["Comment s'abonner ?", "Rendez-vous sur la page Tarifs, choisissez votre formule, puis écrivez-nous : nous configurons votre école avec vous. Le compte est activé dès le règlement reçu."],
    ["Combien de temps faut-il pour démarrer ?", "Après un premier échange pour comprendre votre fonctionnement, nous importons vos élèves, vos classes et vos frais, puis nous formons vos équipes. Comptez quelques jours."],
    ["Que devient notre fichier Excel d'élèves ?", "Il sert de base à l'import de départ. La reprise de votre liste existante (Excel, CSV ou autre logiciel) est incluse, sans frais d'installation."],
    ["Nos données sont-elles protégées ?", "Elles sont hébergées sur une infrastructure sécurisée, ne sont ni vendues ni partagées, et chaque personne n'accède qu'à ce qui la concerne. Si vous résiliez, vous récupérez l'ensemble de vos données."],
  ]],
];
const faq = `
<section class="section">
  <div class="etroit">
    <div class="centre">
      <p class="surtitre">Questions fréquentes</p>
      <h1 style="font-size:clamp(1.9rem,4.6vw,3rem)">Tout ce que vous voulez savoir</h1>
      <p class="intro">Les réponses aux questions que les directeurs et les parents nous posent le plus souvent. La vôtre n'y est pas ? <a href="/contact.html">Écrivez-nous</a>.</p>
    </div>
    ${FAQ.map(([g, qs]) => `<div class="faq-groupe"><h2>${g}</h2>${qs.map(([q, r]) => `<details class="q"><summary>${q}</summary><p>${r}</p></details>`).join("")}</div>`).join("")}
    <div class="carte centre" style="margin-top:2rem">
      <h3 style="justify-content:center">Une question sans réponse ici ?</h3>
      <p>Écrivez-nous, nous répondons sous 24 heures ouvrées.</p>
      <div class="actions" style="justify-content:center"><a class="bouton" href="/contact.html">Nous contacter</a><a class="bouton bouton-clair" href="/tarifs.html">Voir les tarifs</a></div>
    </div>
  </div>
</section>`;

// ---------------------------------------------------------------- Contact
const contact = `
<section class="section">
  <div class="conteneur">
    <div class="centre">
      <p class="surtitre">Contact</p>
      <h1 style="font-size:clamp(1.9rem,4.6vw,3rem)">Parlons de votre école</h1>
      <p class="intro">Décrivez-nous votre établissement : nous vous répondons avec une démonstration adaptée.</p>
    </div>
    <div class="contact-grille">
      <form class="carte formulaire" id="formulaire-contact">
        <div><label for="nom">Votre nom</label><input id="nom" name="nom" autocomplete="name" required></div>
        <div><label for="ecole">Nom de l'établissement</label><input id="ecole" name="ecole" required></div>
        <div><label for="eleves">Nombre d'élèves (environ)</label><input id="eleves" name="eleves" inputmode="numeric"></div>
        <div><label for="offre">Formule envisagée</label>
          <select id="offre" name="offre"><option value="">Je ne sais pas encore</option><option>Essentiel</option><option>Standard</option><option>Premium</option><option>Sur-mesure</option></select></div>
        <div><label for="message">Votre message</label><textarea id="message" name="message" rows="4"></textarea></div>
        <button class="bouton" type="submit">Envoyer sur WhatsApp</button>
        <p class="sous" style="margin:0;font-size:0.88rem">Le bouton ouvre WhatsApp avec votre message déjà rédigé ; rien n'est enregistré sur le site.</p>
      </form>
      <div class="carte">
        <h3>Coordonnées</h3>
        <ul class="coches" style="--x:0">
          <li>WhatsApp : <span class="a-completer">${CONTACT.whatsapp}</span></li>
          <li>Téléphone : <span class="a-completer">${CONTACT.telephone}</span></li>
          <li>E-mail : <span class="a-completer">${CONTACT.email}</span></li>
          <li>${esc(CONTACT.adresse)}</li>
        </ul>
        <p class="sous">Nous répondons sous 24 heures ouvrées.</p>
      </div>
    </div>
  </div>
</section>`;

// ---------------------------------------------------------------- Démo : choix de l'école et du rôle
const TYPES = [
  ["maternelle", "École maternelle", "3 niveaux, de la pré-maternelle à la grande section."],
  ["maternelle_primaire", "Maternelle et primaire", "9 niveaux, de la pré-maternelle au CM2."],
  ["primaire", "École primaire", "6 niveaux, du CP1 au CM2."],
  ["primaire_college", "Primaire et collège", "10 niveaux, du CP1 au CM2 puis de la 6e à la 3e."],
  ["college", "Collège", "4 niveaux, de la 6e à la 3e."],
  ["college_lycee", "Collège et lycée", "7 niveaux, de la 6e à la terminale."],
  ["lycee", "Lycée", "3 niveaux, de la seconde à la terminale, avec séries."],
  ["complexe", "Complexe scolaire complet", "13 niveaux, du CP1 à la terminale."],
];
const ROLES = [
  ["directeur", "Directeur", "Tableau de bord de l'école, élèves, classes, notes, bulletins et paramètres."],
  ["secretaire", "Secrétaire", "Demandes d'admission à faire valider, dossiers des élèves et des parents."],
  ["comptable", "Comptable", "Frais de scolarité, encaissements en espèces ou par chèque, reçus et impayés."],
  ["enseignant", "Enseignant", "Saisie des notes, appel, emploi du temps et cahier de textes."],
  ["surveillant", "Surveillant", "Vie scolaire : absences, retards et suivi des élèves."],
  ["parent", "Parent", "Suivi de l'enfant, bulletins, absences et paiement en ligne (simulé)."],
  ["eleve", "Élève", "Notes, devoirs, emploi du temps et tuteur IA."],
];
const demo = `
<section class="section">
  <div class="etroit">
    <div class="centre">
      <p class="surtitre">Démo</p>
      <h1 style="font-size:clamp(1.9rem,4.6vw,3rem)">Découvrez Savoir+ de l'intérieur</h1>
      <p class="intro">Choisissez le type d'école, puis un rôle, pour explorer un établissement fictif. Sans inscription ni mot de passe.</p>
    </div>
    <h2 style="margin-top:2rem;font-size:1.3rem">1. Le type d'établissement</h2>
    <div class="choix" id="choix-types">
      ${TYPES.map(([id, nom, d], i) => `<button class="choix-carte" type="button" data-type="${id}" aria-pressed="${i === 7}"><strong>${nom}</strong><span>${d}</span></button>`).join("")}
    </div>
    <h2 style="margin-top:2rem;font-size:1.3rem">2. Votre rôle</h2>
    <div class="roles-grille" id="roles">
      ${ROLES.map(([id, nom, d]) => `<a class="role" href="/demo-app.html?role=${id}&amp;type=complexe" data-role="${id}"><strong>${nom}</strong><span>${d}</span></a>`).join("")}
    </div>
    <p class="note-tarifs">Toutes les données de la démo sont fictives. Aucun e-mail n'est envoyé et aucun paiement n'est réellement encaissé. <strong>La démo est un aperçu : certaines rubriques arrivent progressivement.</strong></p>
  </div>
</section>`;

// ---------------------------------------------------------------- Application de démonstration (données fictives, rendue par app.js)
const demoApp = `
<div class="app">
  <aside class="app-menu" id="app-menu" aria-label="Menu de l'application"></aside>
  <div class="app-contenu" id="app-contenu"><p>Chargement de la démo…</p></div>
</div>`;

// ---------------------------------------------------------------- Connexion (provisoire)
const connexion = `
<section class="section">
  <div class="etroit">
    <div class="carte centre">
      <h1 style="font-size:1.9rem">Se connecter</h1>
      <p class="intro">L'espace de connexion des établissements ouvrira avec le lancement de la plateforme.</p>
      <p>En attendant, vous pouvez explorer la démo ou nous écrire pour réserver votre place.</p>
      <div class="actions" style="justify-content:center"><a class="bouton" href="/demo.html">Essayer la démo</a><a class="bouton bouton-clair" href="/contact.html">Nous contacter</a></div>
    </div>
  </div>
</section>`;

// ---------------------------------------------------------------- Écriture
const PAGES = [
  { fichier: "index.html", titre: "Savoir+ : toute votre école dans une seule plateforme", description: "Notes et bulletins, absences, frais de scolarité par mobile money et tuteur IA : la plateforme de gestion pour les écoles d'Afrique francophone.", courant: "", corps: accueil },
  { fichier: "tarifs.html", titre: "Tarifs — Savoir+", description: "Trois formules selon la taille de l'école, sans frais d'installation. Tarifs provisoires.", courant: "/tarifs.html", corps: tarifs },
  { fichier: "faq.html", titre: "Questions fréquentes — Savoir+", description: "Paiement des frais, bulletins, absences, tuteur IA, mise en route et sécurité des données : les réponses aux questions les plus fréquentes.", courant: "/faq.html", corps: faq },
  { fichier: "contact.html", titre: "Contact — Savoir+", description: "Parlez-nous de votre école et demandez une démonstration de Savoir+.", courant: "/contact.html", corps: contact },
  { fichier: "demo.html", titre: "Démo — Savoir+", description: "Explorez Savoir+ avec une école fictive : choisissez un type d'établissement et un rôle.", courant: "", corps: demo },
  { fichier: "demo-app.html", titre: "Démo en cours — Savoir+", description: "Aperçu de l'application Savoir+ avec des données fictives.", courant: "", corps: demoApp, bandeDemo: true },
  { fichier: "connexion.html", titre: "Connexion — Savoir+", description: "Espace de connexion des établissements Savoir+.", courant: "", corps: connexion },
];
for (const p of PAGES) fs.writeFileSync(path.join(SORTIE, p.fichier), page(p));
fs.writeFileSync(path.join(SORTIE, "assets", "favicon.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${LOGO.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg>`);
fs.writeFileSync(path.join(SORTIE, "robots.txt"), "User-agent: *\nDisallow: /\n");
console.log(`${PAGES.length} pages écrites dans savoirplus/public/`);
