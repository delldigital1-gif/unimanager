/* Savoir+ — menu mobile, formulaire de contact, choix de la démo et application de démonstration (données fictives). */
(function () {
  "use strict";

  // ---- Menu mobile
  var burger = document.querySelector(".burger");
  var menu = document.getElementById("menu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var ouvert = menu.classList.toggle("ouvert");
      burger.setAttribute("aria-expanded", String(ouvert));
    });
  }

  // ---- Formulaire de contact : prépare un message WhatsApp (rien n'est enregistré)
  var NUMERO_WHATSAPP = ""; // à renseigner (chiffres seulement, avec l'indicatif) : tant qu'il est vide, le message est affiché à copier.
  var form = document.getElementById("formulaire-contact");
  if (form) {
    var params = new URLSearchParams(location.search);
    if (params.get("offre")) {
      var sel = form.querySelector("#offre");
      Array.prototype.forEach.call(sel.options, function (o) { if (o.text === params.get("offre")) sel.value = o.text; });
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var lignes = [
        "Bonjour, je souhaite en savoir plus sur Savoir+.",
        "Nom : " + d.get("nom"),
        "Établissement : " + d.get("ecole"),
      ];
      if (d.get("eleves")) lignes.push("Nombre d'élèves : " + d.get("eleves"));
      if (d.get("offre")) lignes.push("Formule envisagée : " + d.get("offre"));
      if (d.get("message")) lignes.push("Message : " + d.get("message"));
      var texte = lignes.join("\n");
      if (NUMERO_WHATSAPP) {
        location.href = "https://wa.me/" + NUMERO_WHATSAPP + "?text=" + encodeURIComponent(texte);
        return;
      }
      var zone = document.getElementById("message-prepare");
      if (!zone) {
        zone = document.createElement("div");
        zone.id = "message-prepare";
        zone.className = "note-tarifs";
        zone.setAttribute("role", "status");
        form.appendChild(zone);
      }
      zone.textContent = "Le numéro WhatsApp de Savoir+ n'est pas encore renseigné. Votre message est prêt, copiez-le : \n\n" + texte;
      zone.style.whiteSpace = "pre-line";
    });
  }

  // ---- Page de démo : le type d'école choisi est transmis aux liens des rôles
  var choixTypes = document.getElementById("choix-types");
  if (choixTypes) {
    var type = new URLSearchParams(location.search).get("type") || "complexe";
    var majType = function (t) {
      type = t;
      Array.prototype.forEach.call(choixTypes.querySelectorAll(".choix-carte"), function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-type") === t));
      });
      Array.prototype.forEach.call(document.querySelectorAll("#roles .role"), function (a) {
        a.href = "/demo-app.html?role=" + a.getAttribute("data-role") + "&type=" + t;
      });
    };
    choixTypes.addEventListener("click", function (e) {
      var b = e.target.closest(".choix-carte");
      if (b) majType(b.getAttribute("data-type"));
    });
    majType(type);
  }

  // ---- Application de démonstration
  var conteneur = document.getElementById("app-contenu");
  var barre = document.getElementById("app-menu");
  if (!conteneur || !barre) return;

  var q = new URLSearchParams(location.search);
  var role = q.get("role") || "directeur";
  var typeEcole = q.get("type") || "complexe";

  var ECOLES = {
    maternelle: { nom: "Maternelle Démo", eleves: 84, classes: 3, niveaux: ["Pré-maternelle", "Petite section", "Grande section"] },
    maternelle_primaire: { nom: "École Démo", eleves: 380, classes: 9, niveaux: ["Pré-maternelle", "CP1", "CM2"] },
    primaire: { nom: "École Primaire Démo", eleves: 290, classes: 6, niveaux: ["CP1", "CE2", "CM2"] },
    primaire_college: { nom: "Groupe Scolaire Démo", eleves: 540, classes: 10, niveaux: ["CP1", "CM2", "3e"] },
    college: { nom: "Collège Démo", eleves: 360, classes: 8, niveaux: ["6e", "5e", "3e"] },
    college_lycee: { nom: "Collège-Lycée Démo", eleves: 470, classes: 11, niveaux: ["6e", "3e", "Tle"] },
    lycee: { nom: "Lycée Démo", eleves: 310, classes: 7, niveaux: ["2nde", "1re", "Tle"] },
    complexe: { nom: "Complexe Scolaire Démo", eleves: 650, classes: 13, niveaux: ["CP1", "6e", "Tle"] },
  };
  var ecole = ECOLES[typeEcole] || ECOLES.complexe;
  var fcfa = function (n) { return n.toLocaleString("fr-FR").replace(/ | /g, " ") + " FCFA"; };
  var cel = function (t) { return "<td>" + t + "</td>"; };
  var tag = function (t, c) { return '<span class="tag tag-' + c + '">' + t + "</span>"; };
  var table = function (entetes, lignes) {
    return '<table class="donnees"><thead><tr>' + entetes.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr></thead><tbody>" +
      lignes.map(function (l) { return "<tr>" + l.map(cel).join("") + "</tr>"; }).join("") + "</tbody></table>";
  };
  var stat = function (lib, val, note) { return '<div class="stat"><small>' + lib + "</small><strong>" + val + "</strong>" + (note ? "<em>" + note + "</em>" : "") + "</div>"; };
  var bloc = function (titre, html) { return '<section class="bloc"><h2>' + titre + "</h2>" + html + "</section>"; };
  var liens = function (items) { return '<div class="liste-actions">' + items.map(function (i) { return '<a href="#" data-bientot>→ ' + i + "</a>"; }).join("") + "</div>"; };

  var VUES = {
    directeur: {
      libelle: "Directeur", salut: "Bonjour, Madame la Directrice",
      menu: ["🏠 Tableau de bord", "📝 Admissions", "👤 Élèves", "🏫 Classes", "👨‍👩‍👧 Parents", "💳 Paiements", "📝 Notes", "🚫 Absences", "📈 Analyse IA", "👩‍🏫 Enseignants", "⚙️ Paramètres", "✉️ Messagerie"],
      html: function () {
        return '<div class="stats">' + stat("Élèves", ecole.eleves) + stat("Classes actives", ecole.classes) + stat("Saisie des notes", "100 %", "0 note manquante") + stat("Absences (7 jours)", 4) +
          stat("Encaissé ce mois", fcfa(3140000)) + stat("Impayés", fcfa(52535000)) + "</div>" +
          bloc("Actions rapides", liens(["Inscrire un nouvel élève", "Saisir des notes", "Enregistrer une absence", "Paiements et impayés", "Voir les classes"])) +
          bloc("Absences récentes", table(["Élève", "Classe", "Date", "Motif"], [["Élève A", ecole.niveaux[1], "Hier", "Maladie"], ["Élève B", ecole.niveaux[0], "Hier", "Non justifiée"], ["Élève C", ecole.niveaux[1], "Lundi", "Rendez-vous médical"]]));
      },
    },
    secretaire: {
      libelle: "Secrétaire", salut: "Bonjour, Monsieur le Secrétaire",
      menu: ["🏠 Tableau de bord", "📝 Demandes d'admission", "👤 Élèves", "👨‍👩‍👧 Parents et tuteurs", "📥 Importer des données", "✉️ Messagerie"],
      html: function () {
        return '<div class="stats">' + stat("Demandes en attente", 6) + stat("Dossiers incomplets", 3) + stat("Élèves inscrits", ecole.eleves) + "</div>" +
          bloc("Demandes d'admission", table(["Candidat", "Niveau visé", "Reçue le", "État"], [
            ["Candidat 1", ecole.niveaux[0], "Il y a 2 jours", tag("À valider par le directeur", "orange")],
            ["Candidat 2", ecole.niveaux[1], "Il y a 3 jours", tag("Dossier incomplet", "rouge")],
            ["Candidat 3", ecole.niveaux[2], "La semaine dernière", tag("Validée", "vert")],
          ])) + bloc("Actions rapides", liens(["Saisir une demande d'admission", "Compléter un dossier élève", "Ajouter un parent ou tuteur"]));
      },
    },
    comptable: {
      libelle: "Comptable", salut: "Bonjour, Monsieur le Comptable",
      menu: ["🏠 Tableau de bord", "💳 Paiements", "🧾 Reçus", "⏰ Impayés", "📊 Rapports", "✉️ Messagerie"],
      html: function () {
        return '<div class="stats">' + stat("Encaissé ce mois", fcfa(3140000)) + stat("Impayés", fcfa(52535000)) + stat("Paiements en ligne", 18, "Flooz et TMoney (simulés)") + stat("Espèces et chèques", 27) + "</div>" +
          bloc("Derniers encaissements", table(["Reçu", "Élève", "Moyen", "Montant", "État"], [
            ["R-2026-0412", "Élève A", "Flooz", fcfa(45000), tag("Payé", "vert")],
            ["R-2026-0411", "Élève B", "Espèces", fcfa(30000), tag("Payé", "vert")],
            ["R-2026-0410", "Élève C", "Chèque", fcfa(60000), tag("Payé", "vert")],
            ["—", "Élève D", "TMoney", fcfa(45000), tag("En retard", "rouge")],
          ])) + bloc("Actions rapides", liens(["Enregistrer un encaissement", "Imprimer un reçu", "Relancer les familles en retard"]));
      },
    },
    enseignant: {
      libelle: "Enseignant", salut: "Bonjour, Monsieur le Professeur",
      menu: ["🏠 Tableau de bord", "📝 Notes", "✅ Appel", "📅 Emploi du temps", "📘 Cahier de textes", "✉️ Messagerie"],
      html: function () {
        return '<div class="stats">' + stat("Mes classes", 3) + stat("Notes à saisir", 2, "Devoir du 3e trimestre") + stat("Prochain cours", "08 h 00", ecole.niveaux[1]) + "</div>" +
          bloc("Mon emploi du temps du jour", table(["Heure", "Classe", "Matière", "Salle"], [["08 h 00", ecole.niveaux[1], "Mathématiques", "Salle 4"], ["10 h 00", ecole.niveaux[0], "Mathématiques", "Salle 2"], ["14 h 00", ecole.niveaux[2], "Mathématiques", "Salle 7"]])) +
          bloc("Notes à saisir", table(["Classe", "Évaluation", "Date limite", "État"], [[ecole.niveaux[1], "Devoir 2", "Vendredi", tag("À saisir", "orange")], [ecole.niveaux[2], "Composition", "Lundi", tag("À saisir", "orange")]]));
      },
    },
    surveillant: {
      libelle: "Surveillant", salut: "Bonjour, Monsieur le Surveillant",
      menu: ["🏠 Tableau de bord", "🚫 Absences et retards", "👤 Suivi des élèves", "✉️ Messagerie"],
      html: function () {
        return '<div class="stats">' + stat("Absents aujourd'hui", 4) + stat("Retards aujourd'hui", 2) + stat("Parents prévenus", "100 %") + "</div>" +
          bloc("Aujourd'hui", table(["Élève", "Classe", "Type", "Parent prévenu"], [["Élève A", ecole.niveaux[1], tag("Absence", "rouge"), "Oui"], ["Élève B", ecole.niveaux[2], tag("Retard", "orange"), "Oui"], ["Élève C", ecole.niveaux[0], tag("Absence", "rouge"), "Oui"]])) +
          bloc("Actions rapides", liens(["Enregistrer une absence", "Enregistrer un retard", "Voir le suivi d'un élève"]));
      },
    },
    parent: {
      libelle: "Parent", salut: "Bonjour, Madame",
      menu: ["🏠 Mon enfant", "📝 Notes et bulletins", "🚫 Absences", "💳 Paiements", "📘 Cahier de textes", "✉️ Messagerie"],
      html: function () {
        return '<div class="stats">' + stat("Moyenne du trimestre", "15,8 / 20", "Rang : 3e sur 42") + stat("Absences", 1) + stat("Reste à payer", fcfa(45000), "Échéance dans 6 jours") + "</div>" +
          bloc("Dernières notes", table(["Matière", "Évaluation", "Note"], [["Mathématiques", "Devoir 2", "16 / 20"], ["Français", "Dictée", "14 / 20"], ["Histoire", "Interrogation", "17 / 20"]])) +
          bloc("Payer la prochaine échéance", '<p>Montant : <strong>' + fcfa(45000) + '</strong></p><p><button class="bouton bouton-petit" type="button" data-bientot>Payer par Flooz (simulé)</button> <button class="bouton bouton-clair bouton-petit" type="button" data-bientot>Payer par TMoney (simulé)</button></p><p class="sous">En démo, aucun paiement n\'est réellement effectué.</p>');
      },
    },
    eleve: {
      libelle: "Élève", salut: "Salut !",
      menu: ["🏠 Accueil", "📝 Mes notes", "📘 Devoirs", "📅 Emploi du temps", "🤖 Tuteur IA"],
      html: function () {
        return '<div class="stats">' + stat("Ma moyenne", "15,8 / 20") + stat("Devoirs à rendre", 2) + stat("Prochain cours", "08 h 00", "Mathématiques") + "</div>" +
          bloc("Mes devoirs", table(["Matière", "À rendre pour", "État"], [["Mathématiques", "Jeudi", tag("À faire", "orange")], ["Français", "Vendredi", tag("À faire", "orange")]])) +
          '<section class="bloc tuteur"><h2>🤖 Mon tuteur IA</h2><p>Voici ce que j\'ai remarqué dans tes dernières notes : les fractions te posent encore quelques difficultés.</p>' +
          '<div class="bulle bulle-ia"><strong>Tuteur :</strong> Essayons ensemble. Combien font 3/4 + 1/8 ?</div>' +
          '<div class="bulle"><strong>Toi :</strong> 4/12 ?</div>' +
          '<div class="bulle bulle-ia"><strong>Tuteur :</strong> Pas tout à fait. On commence par mettre les deux fractions sur le même dénominateur : 3/4 = 6/8. Que vaut alors 6/8 + 1/8 ?</div>' +
          '<p class="sous">Exemple fictif : le tuteur IA fait partie de la formule Premium.</p></section>';
      },
    },
  };

  var vue = VUES[role] || VUES.directeur;
  document.title = vue.libelle + " — démo Savoir+";
  barre.innerHTML = vue.menu.map(function (m, i) { return '<a href="#"' + (i === 0 ? ' class="actif"' : "") + " data-bientot>" + m + "</a>"; }).join("");
  conteneur.innerHTML = "<h1>" + vue.salut + "</h1><p class=\"sous\">" + ecole.nom + " · Année 2026-2027 · 3e trimestre · Rôle : " + vue.libelle + "</p>" + vue.html() +
    '<p class="sous">Changer de rôle : ' + Object.keys(VUES).map(function (r) { return '<a href="/demo-app.html?role=' + r + "&type=" + typeEcole + '">' + VUES[r].libelle + "</a>"; }).join(" · ") + "</p>";

  // Les rubriques qui ne sont pas encore construites l'annoncent au clic au lieu de ne rien faire.
  document.addEventListener("click", function (e) {
    var cible = e.target.closest("[data-bientot]");
    if (!cible) return;
    e.preventDefault();
    var note = document.getElementById("note-bientot");
    if (!note) {
      note = document.createElement("div");
      note.id = "note-bientot";
      note.setAttribute("role", "status");
      note.className = "note-tarifs";
      conteneur.insertBefore(note, conteneur.firstChild);
    }
    note.textContent = "Cette rubrique de la démo arrive bientôt. Le tableau de bord de chaque rôle est déjà consultable.";
  });
})();
