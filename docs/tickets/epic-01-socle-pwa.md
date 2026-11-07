# Epic 1 — Socle PWA (MVP)

Objectif : une app vide mais installable depuis Chrome Android, hors ligne, déployée automatiquement, avec sa base de données et sa navigation.

---

## Ticket 1.1 — Initialiser le projet et l'outillage

Type : Technique

En tant que développeur, je veux un projet initialisé avec l'outillage figé, afin de démarrer tous les tickets sur une base identique.

**Contexte technique**
Stack et commandes : voir `CLAUDE.md`. Le repo contient déjà `CLAUDE.md` et `docs/`.

**À faire**
- Vite + React + TypeScript (`strict: true`), Tailwind CSS.
- ESLint (règles React + TS) et Prettier ; scripts `dev`, `build`, `test`, `lint`, `format` dans `package.json`.
- Vitest + Testing Library + jsdom ; un test d'exemple qui passe.
- `.gitignore` : `node_modules`, `dist`, `.env*`, `*.export.json`.
- `README.md` : prérequis (version Node), installation, commandes.
- `src/labels.ts` créé (objet exporté, vide ou avec le nom de l'app « Piano »).

**Definition of Done**
- `npm install` puis `npm run dev` affiche une page « Piano ».
- `npm run lint`, `npm run test`, `npm run build` passent sans erreur.
- Un second développeur peut lancer le projet en suivant uniquement le README.

**Hors périmètre**
PWA (1.2), déploiement (1.3), base de données (1.4), navigation (1.5).

**Dépendances**
Aucune. Bloque tous les autres tickets.

---

## Ticket 1.2 — Rendre l'app installable et utilisable hors ligne

Type : Technique

En tant qu'Adele, je veux installer l'app sur mon téléphone et l'ouvrir sans réseau, afin de m'en servir au piano et dans le bus.

**Contexte technique**
`vite-plugin-pwa`, `registerType: 'autoUpdate'`. Base Vite = `/<nom-du-repo>/` (GitHub Pages) : le `start_url` et le `scope` du manifest doivent en tenir compte. Données locales uniquement : demander au navigateur un stockage persistant pour limiter le risque d'effacement.

**À faire**
- Manifest : nom « Piano — suivi de travail », nom court « Piano », `display: standalone`, `orientation: portrait`, couleurs thème / fond, icônes 192 et 512 px (+ maskable). Icône simple générée (pas de logo existant).
- Service worker : précache de tous les assets du build ; l'app démarre sans réseau.
- Au premier lancement, appeler `navigator.storage.persist()` (si disponible) ; ignorer silencieusement si refusé.
- Mise à jour : nouvelle version appliquée au prochain lancement, sans perte de données.

**Definition of Done**
- Lighthouse (onglet PWA / installabilité) : app installable, aucune erreur de manifest.
- Après un premier chargement, en mode avion (DevTools « Offline »), l'app se recharge et s'affiche.
- `navigator.storage.persisted()` est appelé ; le résultat est loggué en développement uniquement.

**Hors périmètre**
Déploiement (1.3). Test sur le téléphone d'Adele (1.6).

**Dépendances**
1.1. Bloque 1.3, 1.6.

---

## Ticket 1.3 — Déployer automatiquement sur GitHub Pages

Type : Technique

En tant que PO, je veux que chaque push sur `main` mette l'app en ligne, afin qu'Adele ait toujours la dernière version sans manipulation.

**Contexte technique**
GitHub Actions, actions officielles `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`. HashRouter (pas de réécriture d'URL nécessaire). Aucun secret.

**À faire**
- Workflow `.github/workflows/deploy.yml` : sur push `main` → `npm ci`, `npm run lint`, `npm run test`, `npm run build`, déploiement Pages.
- Le déploiement échoue si lint, tests ou build échouent.
- README : section « Déploiement » (activer Pages en source « GitHub Actions », URL de l'app).

**Definition of Done**
- Un push sur `main` publie l'app à `https://<compte>.github.io/<repo>/`.
- L'app publiée est installable (même contrôle que 1.2).
- Un test volontairement cassé empêche le déploiement.

**Hors périmètre**
Environnement de préproduction (non prévu).

**Dépendances**
1.2. Action manuelle du PO : activer GitHub Pages dans les réglages du repo.

---

## Ticket 1.4 — Créer la base de données et les utilitaires de date et de durée

Type : Donnée

En tant que développeur, je veux le schéma Dexie complet et des utilitaires fiables de dates et de durées, afin que tous les tickets s'appuient sur les mêmes règles.

**Contexte technique**
Schéma : tableau « Modèle de données » de `CLAUDE.md` (version 1, à reproduire exactement). Règles : durées en secondes, jours `YYYY-MM-DD` en heure locale, semaine du lundi, valeur absente = `null` (R1, R2, R4).

**À faire**
- `src/data/db.ts` : classe Dexie, toutes les tables v1 avec leurs index, types TypeScript de chaque entité dans `src/data/types.ts`.
- `src/data/dates.ts` : `toDay(date|ms)`, `today()`, `weekStart(day)` (lundi), `weekDays(weekStart)` (7 jours), `addWeeks(weekStart, n)`, `formatDayLabel(day)` (ex. « lun. 9 nov. »), `formatWeekLabel(weekStart)` (ex. « Semaine du 9 nov. »). Tout en heure locale (pas de `toISOString()` pour calculer un jour).
- `src/data/durations.ts` : `formatDuration(sec: number|null)` → `"1:05"` ou `"—"` si `null` ; `parseDuration("1:05" | "65" | "1h05")` → secondes ou `null` si vide / invalide ; `sumNullable(values)` → `null` si toutes `null`, sinon somme des non-`null`.
- Tests Vitest de tous les utilitaires.

**Definition of Done**
- `weekStart` d'un dimanche renvoie le lundi précédent ; d'un lundi renvoie lui-même.
- Un jour calculé à 23:30 heure locale reste ce jour-là (test avec fuseau `Europe/Paris`, `TZ` fixé dans le test).
- `formatDuration(null)` = `"—"` ; `formatDuration(0)` = `"0:00"`.
- `sumNullable([null, null])` = `null` ; `sumNullable([null, 600])` = `600`.
- `parseDuration("")` = `null`.
- La base s'ouvre dans les tests avec `fake-indexeddb`.

**Hors périmètre**
Fonctions métier par entité (epics 2 à 7). Tables P2 (epics 9, 10).

**Dépendances**
1.1. Bloque 2.1, 3.1, 4.1, 5.1, 6.2, 7.1.

---

## Ticket 1.5 — Mettre en place la navigation et la mise en page mobile

Type : Front

En tant qu'Adele, je veux passer d'un écran à l'autre d'un pouce, afin de m'y retrouver rapidement entre deux passages au piano.

**Contexte technique**
HashRouter. Libellés dans `src/labels.ts`. Mobile d'abord (360–412 px). Les écrans sont des pages vides avec leur titre ; ils seront remplis par les epics suivants.

**Référence visuelle**
- Barre d'onglets fixe en bas, 5 onglets avec icône + libellé : **Session** (`/`), **Semaine** (`/semaine`), **Projets** (`/projets`), **Bilan** (`/bilan`), **Plus** (`/plus`).
- En haut de chaque écran : titre de l'écran.
- Zone réservée sous le titre pour le bandeau de chrono (rempli au ticket 4.4), invisible tant que vide.
- « Plus » liste des liens : Sauvegarde (`/plus/sauvegarde`), À propos (version de l'app). Les liens futurs (Notes de cours) s'y ajouteront.
- Style sobre : fond clair, une couleur d'accent, typographie lisible (corps ≥ 16 px).

**À faire**
- Composant `Layout` (titre, zone bandeau, contenu défilant, barre d'onglets) et routes des 5 écrans + `/plus/sauvegarde`.
- Onglet actif mis en évidence.
- Respect des zones sûres (`env(safe-area-inset-bottom)`).

**Definition of Done**
- Sur un viewport 375 px, les 5 onglets sont visibles et cliquables sans zoom.
- Recharger la page sur `#/bilan` réaffiche l'écran Bilan.
- Aucun libellé en dur hors de `src/labels.ts`.

**Hors périmètre**
Contenu des écrans (epics 2 à 7).

**Dépendances**
1.1. Bloque tous les tickets Front.

---

## Ticket 1.6 — Valider l'installation sur le téléphone d'Adele

Type : Décision (validation client, pas de code)

En tant que PO, je veux vérifier l'installation sur le téléphone réel d'Adele, afin de lever le risque technique avant de construire les écrans.

**À faire**
- Envoyer l'URL à Adele ; elle installe l'app depuis Chrome (« Ajouter à l'écran d'accueil » / « Installer »).
- Vérifier : icône sur l'écran d'accueil, ouverture plein écran, ouverture en mode avion.
- Noter le modèle de téléphone et la version Android dans `docs/suivi.md` (Décisions).

**Definition of Done**
- Les 3 vérifications sont OK, ou les problèmes sont consignés dans `docs/suivi.md`.

**Dépendances**
1.3. Responsable : PO + Adele.
