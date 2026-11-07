# CLAUDE.md — Suivi de travail piano (Adele)

PWA mobile de suivi du temps de travail au piano. Utilisatrice unique : Adele (pianiste), Android + Chrome, usage au piano et dans le bus, souvent hors ligne. L'app remplace son Excel : elle compare ce qu'elle **prévoit** à ce qu'elle **fait réellement**.

Avant chaque ticket, lire : ce fichier, `docs/brief.md` (règles métier R1–R25), le ticket dans `docs/tickets/`, et `docs/suivi.md`.

## Stack (figée)
- Vite + React + TypeScript (strict), Tailwind CSS.
- PWA : `vite-plugin-pwa` (manifest, service worker, cache hors ligne, `registerType: 'autoUpdate'`).
- Données : IndexedDB via Dexie + `dexie-react-hooks` (`useLiveQuery`). Aucun serveur, aucune API externe, aucun secret.
- Routage : `react-router` en **HashRouter** (compatible GitHub Pages).
- Tests : Vitest + Testing Library + `fake-indexeddb` pour la couche donnée.
- Qualité : ESLint + Prettier.
- Hébergement : GitHub Pages en mode « Deploy from a branch » (`gh-pages`), publié par `npm run deploy` depuis `main`. Pas de GitHub Actions. `base` Vite = `/<nom-du-repo>/`.

## Commandes
- `npm run dev` — lancer
- `npm run build` — build (doit passer avant tout commit)
- `npm run test` — tests (Vitest)
- `npm run lint` — ESLint
- `npm run format` — Prettier

## Conventions
- Code en anglais. Textes affichés en français, **uniquement** depuis `src/labels.ts` (jamais de libellé en dur dans un composant).
- Git : voir « Workflow Git » ci-dessous.
- `git status` avant chaque commit. Jamais de `.env`, d'export JSON d'Adele ni de données locales commités.
- Une couche par ticket : un ticket « Donnée » ne touche pas l'UI, un ticket « Front » n'ajoute pas de table ni de règle de calcul (il appelle la couche donnée).
- Mobile d'abord : largeur cible 360–412 px, zones tactiles ≥ 44 px, utilisable d'une main.

## Règles de donnée (non négociables)
- **Une valeur absente vaut `null`, jamais 0.** Budget non saisi, temps prévu non défini, avancement vide, date absente : `null`. Afficher « — » à l'écran. Un total dont toutes les composantes sont `null` vaut `null` ; s'il y en a au moins une saisie, il vaut la somme des valeurs saisies.
- Durées stockées en **secondes entières** (`number`). Saisie et affichage en `h:mm` (ex. `1:05`), précision minute.
- Jour = chaîne `YYYY-MM-DD` en heure locale du téléphone. Semaine = lundi → dimanche, identifiée par `weekStart` (`YYYY-MM-DD` du lundi).
- Horodatages = `number` (epoch ms).
- IDs = `crypto.randomUUID()`.
- Chrono : temps **toujours calculé** depuis les horodatages (`(endedAt ?? Date.now()) - startedAt`), jamais par un compteur incrémenté (les timers sont suspendus écran verrouillé). Le `setInterval` d'affichage ne sert qu'à rafraîchir l'écran.
- Archivage et suppression de projet ne suppriment **jamais** le temps passé (suppression logique).
- Toute écriture multi-tables passe par `db.transaction('rw', ...)`.

## Modèle de données (Dexie, version 1)
| Table | Clé / index | Champs |
|---|---|---|
| `projects` | `id`, `deletedAt` | `name`, `startDate: string\|null`, `endDate: string\|null`, `deletedAt: number\|null`, `createdAt` |
| `sections` | `id`, `projectId` | `projectId`, `name`, `progress: string\|null`, `order`, `createdAt` |
| `tasks` | `id`, `sectionId`, `projectId`, `status` | `sectionId`, `projectId` (dénormalisé), `label`, `status: 'active'\|'archived'`, `archivedAt: number\|null`, `createdAt` |
| `sessions` | `id`, `day`, `endedAt` | `startedAt`, `endedAt: number\|null`, `day` (jour de démarrage) |
| `sessionTasks` | `[sessionId+taskId]`, `sessionId`, `taskId` | `order`, `correctedDurationSec: number\|null` |
| `timeSegments` | `id`, `[sessionId+taskId]`, `endedAt` | `sessionId`, `taskId`, `startedAt`, `endedAt: number\|null` |
| `manualEntries` | `id`, `taskId`, `day` | `taskId`, `day`, `durationSec`, `createdAt` |
| `dailyBudgets` | `day` | `durationSec: number\|null` |
| `projectWeekPlans` | `[projectId+weekStart]`, `weekStart` | `durationSec: number\|null` |
| `taskDayPlans` | `[taskId+day]`, `day` | `durationSec: number\|null` (marquage « prévue » = la ligne existe) |
| `sectionPlacements` | `id`, `sectionId`, `[sectionId+kind]` | `sectionId`, `weekStart`, `kind: 'initial'\|'revised'` |
| `meta` | `key` | `value` (ex. `lastExportAt`) |

Règles de calcul de référence :
- Temps d'une tâche dans une session = `correctedDurationSec` si non `null`, sinon somme de ses segments.
- **Temps réel** (tâche, projet, jour, semaine) = temps des sessions (rattaché à `session.day`) + saisies a posteriori (`manualEntries.day`), **y compris** tâches archivées et projets supprimés.
- Un seul segment ouvert (`endedAt = null`) dans toute la base. Une seule session en cours à la fois.
- Prévu initial d'une section = premier placement, figé ; prévu revu = placement courant.

Toute la logique métier vit dans `src/data/` (fonctions pures + accès Dexie), testée. Les composants n'implémentent aucune règle de calcul.

## Glossaire — libellés affichés
Les noms marqués *(provisoire)* sont à valider avec Adele : les centraliser dans `src/labels.ts` pour les changer en un endroit.

| Terme | Libellé affiché | Définition |
|---|---|---|
| Projet | Projet | Morceau ou pratique (ex. Déchiffrage). Dates de début / fin facultatives. |
| Section | Section | Groupe de tâches d'un projet ; unité du planning. |
| Tâche | Tâche | Texte libre, toujours dans une section. Active ou archivée, jamais « finie ». |
| Avancement | Avancement | Texte libre par section. Pas de métrique. |
| Session | Session | Moment de travail, tâches de un ou plusieurs projets. Rattachée au jour de démarrage. |
| Chrono | Chrono | Temps mesuré sur une tâche ; une seule à la fois ; pause ; corrigeable. |
| Saisie a posteriori | Ajout manuel *(provisoire)* | Durée oubliée : tâche + jour + durée. |
| Budget | Budget | Temps libre estimé pour le piano, par jour. |
| Temps réel | Temps réel *(provisoire)* | Chronos + ajouts manuels. |
| Temps prévu | Temps prévu | Par projet / semaine, et par tâche / jour. Facultatif. |
| Planning macro | Planning *(provisoire)* | Placement des sections sur les semaines. |
| Prévu initial | Prévu initial *(provisoire)* | Premier placement, figé. |
| Prévu revu | Prévu revu *(provisoire)* | Placement modifié. |
| Bilan | Bilan | Récap texte, prévu vs réel. |
| Revue de semaine | Revue de semaine *(provisoire)* | Archiver, ajouter des tâches, mettre à jour l'avancement. |
| Archivage | Archiver / Réactiver | Retrait réversible de la liste active. |
| Mode concentration | Mode concentration *(provisoire)* | Chrono plein écran (P2). |
| Photo de cahier | Photo de cahier *(provisoire)* | Photo rattachée à un projet (P2). |
| Note de cours | Note de cours *(provisoire)* | Notes après un cours avec Jenifer (P2). |

Ton de l'interface : sobre, tutoiement, aucun message culpabilisant. Un dépassement est un **constat** (« 1:20 au-dessus du budget »), jamais une alerte rouge, une popup ou un blocage.

## Hors périmètre (ne pas implémenter sans ticket)
Authentification, multi-utilisateur, synchro multi-appareils, serveur, OCR / IA, enregistrement audio, commentaire de session, graphiques, notifications push.

## Façon de travailler sur un ticket
1. Lire le ticket et ses dépendances dans `docs/suivi.md`. Si une dépendance n'est pas `Fait`, s'arrêter et le signaler.
2. Créer la branche `ticket-<id>-<nom-du-ticket>` depuis la branche d'epic (voir « Workflow Git »).
3. Passer le ticket en `En cours` dans `docs/suivi.md`.
4. Implémenter **uniquement** le périmètre du ticket. Ticket « Donnée » : tests Vitest obligatoires, dont le cas valeur absente (`null`).
5. Vérifier : `npm run lint`, `npm run test`, `npm run build`.
6. Contrôler chaque ligne de la Definition of Done.
7. Rendre le compte rendu (format ci-dessous). Ne pas passer le ticket en `Fait` : c'est le PO qui valide après test.
8. Ticket de type **Décision** : ne pas coder. Préparer ce qui est demandé (exemple, question), puis s'arrêter.

**Ne rien inventer.** Si une règle métier manque ou se contredit, poser la question au PO avant de coder. Si un choix technique non prévu est nécessaire, le faire au plus simple et le noter dans le tableau « Décisions » de `docs/suivi.md`. Une hypothèse non vérifiée est marquée `// HYPOTHÈSE NON VÉRIFIÉE:` dans le code.

Compte rendu en fin de ticket : court et clair, sans salutations, sans récap de ce qui a été lu, sans détail technique non demandé.
1. Une ligne : « T<id> est prêt » + résultat des vérifications (tests, typecheck, lint, build). Si quelque chose échoue, le dire clairement avec l'erreur.
2. « Ce qui marche » : 3 à 6 puces max, chacune = un comportement visible pour Adele (ou pour le PO sur un ticket technique), avec un exemple concret testé.
3. Si besoin, « Défauts trouvés et corrigés en route » : 1 ligne par défaut (le problème, puis la correction).
4. Si besoin, « Décision à prendre » : une question précise, la recommandation et l'endroit où la valeur se règle. Ne pas choisir une règle métier à la place du PO : proposer et demander.
5. Si besoin, « À savoir » : une limite connue, ou ce qui est prévu dans un ticket suivant.
6. Captures d'écran : liens cliquables, une par ligne.
7. Dernière ligne : « Tu valides T<id> ? »

Règles : phrases courtes, vocabulaire de l'utilisatrice (pas de noms de fonctions ou de fichiers, sauf un lien utile) ; chiffres concrets plutôt qu'adjectifs ; ne pas répéter ce qui est déjà validé ; une correction demandée en cours de ticket = 2 à 4 lignes (ce qui a changé, preuve, capture, « Tu valides ? ») ; ne rien inventer : ce qui n'a pas été vérifié est signalé.

Après validation du PO : ticket `Fait` dans `docs/suivi.md`, décision éventuelle ajoutée au tableau « Décisions », puis commit selon le « Workflow Git ».

## Workflow Git (à appliquer sans qu'on le redemande)
- `main` = prod, seule branche déployée. Elle ne bouge pas pendant le développement des epics.
- Une branche par epic, créée depuis `main` : `epic-<n>-<nom-de-l-epic>` (ex : `epic-1-socle-pwa`).
- Une branche par ticket, créée depuis sa branche d'epic : `ticket-<id>-<nom-du-ticket>` (ex : `ticket-1.1-initialiser-le-projet-et-l-outillage`).
- Un ticket à la fois. Cycle d'un ticket :
  1. Coder le ticket, vérifier (build, tests, lint, capture d'écran si UI), puis s'arrêter et demander la validation au PO.
  2. Après validation : commit + push sur la branche du ticket. Message : `T1.1 – initialiser le projet`.
  3. Si on reprend le ticket : commits supplémentaires sur la même branche, puis push.
  4. Ticket validé définitivement : merge en local de `ticket-…` dans `epic-…` avec `git merge --squash` (un seul commit `T1.1 – …` par ticket sur l'epic), puis push de l'epic.
- Epic validée définitivement : merge en local de `epic-…` dans `main` avec `git merge --no-ff` (message `Epic 1 – …`), push de `main`, puis `npm run deploy` depuis `main`, puis vérification que l'app en ligne est à jour.
- Pas de pull request : tout se fait en git local + push.
- Ne jamais pousser ni merger sans validation explicite du PO.
- Avant de pousser, vérifier le compte : `git config user.email` = `Awarnet1009@gmail.com`, remote `https://AdrienWarnet@github.com/AdrienWarnet/Liszt-d-attente.git`.

## Contraintes navigateur connues
- Une web app ne peut pas activer Ne pas déranger : rappel affiché (P2, epic 8).
- Données dans le navigateur : risque de perte → export / import JSON (epic 7) + `navigator.storage.persist()` (ticket 1.2).
- Photos (P2) en Blob dans IndexedDB : compresser, surveiller `navigator.storage.estimate()`.
