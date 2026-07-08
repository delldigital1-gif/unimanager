# 🎓 UniManage — Plateforme SaaS Universitaire

> **La plateforme de gestion universitaire complète pour l'Afrique francophone**
> Développée par **U2P-Togo / Dell Digital** · Lomé, Togo 🇹🇬

![UniManage](https://img.shields.io/badge/UniManage-v1.0-blue?style=for-the-badge)
![HTML](https://img.shields.io/badge/HTML5-100%25-orange?style=for-the-badge)
![CSS](https://img.shields.io/badge/CSS3-Vanilla-blue?style=for-the-badge)
![JS](https://img.shields.io/badge/JavaScript-ES6-yellow?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 🌐 Démo en ligne

> **URL GitHub Pages :** `https://[votre-username].github.io/unimanage/`

**Point d'entrée :** [`hub.html`](hub.html) — Hub central avec accès à tous les modules

---

## 📁 Structure du projet

```
📁 unimanage/
│
├── 🗂️  hub.html              ← HUB CENTRAL — Démarrer ici
├── 🏠  index.html            ← Landing page publique
├── 🔐  login.html            ← Connexion unifiée
├── 📋  onboarding.html       ← Inscription université
│
├── ── PORTAILS ──
├── 📊  dashboard.html        ← Admin université
├── 🎓  etudiant.html         ← Portail étudiant
├── 👨‍🏫  enseignant.html       ← Portail enseignant
├── 👨‍👩‍👧  parents.html          ← Portail parents
├── ⚡  superadmin.html       ← Super Admin SaaS
├── 📱  mobile.html           ← Version mobile
│
├── ── MODULES ACADÉMIQUES ──
├── 📝  examens.html          ← Examens + PV + Proclamation
├── 📜  resultats.html        ← Résultats + Relevés + QR code
├── 📆  calendrier.html       ← Calendrier académique
├── 🎓  diplomes.html         ← Diplômes & Certificats
│
├── ── COMMUNICATION ──
├── 💬  messagerie.html       ← Messagerie interne
├── 🔔  notifications.html    ← SMS / Email / Push
│
├── ── ANALYSE & GESTION ──
├── 📊  rapports.html         ← Analytics + Exports PDF/Excel
├── 🏢  multicampus.html      ← Multi-campus (3 sites)
│
└── 📖  README.md             ← Ce fichier
```

---

## 🚀 Déploiement sur GitHub Pages

### Étape 1 — Créer le repository

```bash
# Sur GitHub.com
# 1. Cliquer sur "New repository"
# 2. Nom : unimanage
# 3. Visibilité : Public
# 4. Cliquer "Create repository"
```

### Étape 2 — Uploader les fichiers

```bash
# Option A — Via l'interface GitHub (recommandé)
# 1. Ouvrir votre repository
# 2. Cliquer "Add file" → "Upload files"
# 3. Glisser-déposer les 18 fichiers HTML + README.md
# 4. Cliquer "Commit changes"

# Option B — Via Git (ligne de commande)
git init
git add .
git commit -m "🎓 UniManage v1.0 — Plateforme SaaS Universitaire complète"
git branch -M main
git remote add origin https://github.com/[username]/unimanage.git
git push -u origin main
```

### Étape 3 — Activer GitHub Pages

```
1. Aller dans votre repository GitHub
2. Cliquer sur "Settings" (onglet en haut)
3. Scroll jusqu'à "Pages" dans le menu gauche
4. Source : "Deploy from a branch"
5. Branch : "main" → dossier : "/ (root)"
6. Cliquer "Save"
7. Attendre 2-3 minutes
8. Votre site est en ligne !
```

### Étape 4 — Accéder au site

```
https://[votre-username].github.io/unimanage/hub.html
```

---

## 📱 Modules disponibles

| Module | Fichier | Description |
|--------|---------|-------------|
| 🗂️ Hub Central | `hub.html` | Navigation globale, recherche modules |
| 🏠 Landing Page | `index.html` | Page publique, tarifs, inscription |
| 🔐 Connexion | `login.html` | Login intelligent par rôle |
| 📋 Onboarding | `onboarding.html` | Inscription guidée 6 étapes |
| 📊 Dashboard Admin | `dashboard.html` | Gestion complète université |
| 🎓 Portail Étudiant | `etudiant.html` | Notes, planning, paiements |
| 👨‍🏫 Portail Enseignant | `enseignant.html` | Cours, notes, salaire |
| 👨‍👩‍👧 Portail Parents | `parents.html` | Suivi enfants, absences |
| ⚡ Super Admin | `superadmin.html` | Vue globale SaaS |
| 📱 Mobile | `mobile.html` | App mobile 4 rôles |
| 📝 Examens | `examens.html` | Délibération, PV, proclamation |
| 📜 Résultats | `resultats.html` | Relevés notes + QR code |
| 📆 Calendrier | `calendrier.html` | Planning académique interactif |
| 🎓 Diplômes | `diplomes.html` | Diplômes + certificats officiels |
| 💬 Messagerie | `messagerie.html` | Chat interne complet |
| 🔔 Notifications | `notifications.html` | SMS/Email/Push automatisé |
| 📊 Rapports | `rapports.html` | Analytics + exports PDF/Excel |
| 🏢 Multi-Campus | `multicampus.html` | Gestion 3 campus |

---

## 👥 Rôles utilisateurs

| Rôle | Accès | Fichier |
|------|-------|---------|
| 🏛️ Administrateur | Gestion complète université | `dashboard.html` |
| 🎓 Étudiant | Notes, planning, paiements, docs | `etudiant.html` |
| 👨‍🏫 Enseignant | Cours, notes, salaire | `enseignant.html` |
| 👨‍👩‍👧 Parent | Suivi enfants | `parents.html` |
| ⚡ Super Admin | Vue globale SaaS | `superadmin.html` |

---

## 💻 Stack technique

```
✅ HTML5          — Structure sémantique
✅ CSS3 Vanilla   — Styles et animations (pas de framework)
✅ JavaScript ES6 — Logique et interactions
✅ Google Fonts   — Syne + Inter
✅ SessionStorage — Gestion de session locale
✅ SVG            — QR codes de vérification
✅ Print CSS      — Export PDF natif navigateur
✅ 0 dépendances  — Aucun npm, aucun build required
```

---

## 🎨 Design System

```css
/* Couleurs principales */
--navy:   #0D1B2A  /* Fond sombre */
--blue:   #1A56DB  /* Couleur principale */
--sky:    #3B82F6  /* Accent bleu */
--gold:   #F59E0B  /* Or / Enseignant */
--success:#10B981  /* Vert succès */
--danger: #EF4444  /* Rouge erreur */
--purple: #8B5CF6  /* Violet / Parent */

/* Typographie */
Syne     — Titres et valeurs (font-weight: 700-800)
Inter    — Corps de texte (font-weight: 400-600)
```

---

## 🔗 Flux de navigation

```
hub.html (point d'entrée)
    │
    ├── index.html ──→ login.html ──→ dashboard.html
    │                                      │
    │                          ┌───────────┼───────────┐
    │                          ▼           ▼           ▼
    │                     examens.html  rapports.html  messagerie.html
    │                     calendrier.html  notifications.html
    │                     diplomes.html    multicampus.html
    │
    ├── etudiant.html  ←── (rôle étudiant)
    ├── enseignant.html ←── (rôle enseignant)
    ├── parents.html   ←── (rôle parent)
    └── superadmin.html ←── (super admin)
```

---

## 📞 Contact & Support

**Développé par Dell Digital / U2P-Togo**

- 🌍 Site : [u2p-togo.com](https://u2p-togo.com)
- 📧 Email : contact@u2p-togo.com
- 📱 WhatsApp : +228 XX XX XX XX
- 📍 Lomé, Togo 🇹🇬

---

## 📄 Licence

```
MIT License — Libre d'utilisation
Copyright © 2025 UniManage / Dell Digital / U2P-Togo
```

---

> **UniManage** — *L'excellence au service du numérique universitaire* 🎓
