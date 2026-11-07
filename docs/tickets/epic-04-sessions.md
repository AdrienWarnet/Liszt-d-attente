# Epic 4 — Sessions (MVP)

Objectif : Adele chronomètre son travail tâche par tâche dans une session, navigue dans l'app pendant que le chrono tourne, corrige un oubli ou ajoute une durée a posteriori.

---

## Ticket 4.1 — Moteur de session et de chrono

Type : Donnée

En tant que développeur, je veux toute la logique des sessions, chronos, corrections et ajouts manuels dans `src/data/`, testée, afin que le temps réel soit juste quoi qu'il arrive à l'écran.

**Contexte technique**
R15 à R21. Tables `sessions`, `sessionTasks`, `timeSegments`, `manualEntries`. Temps **toujours** calculé à partir des horodatages ; aucun état de chrono en mémoire qui ne soit pas en base (l'app peut être tuée à tout moment). Hypothèse non vérifiée H4 : une seule session en cours à la fois.

**À faire**
- `startSession()` : refus si une session est en cours ; `day = toDay(Date.now())`.
- `getCurrentSession()` : session avec `endedAt = null` (ou `null`).
- `addTaskToSession(sessionId, taskId)` (idempotent) ; `createTaskInSession(sessionId, sectionId, label)` = `createTask` + ajout.
- `startTask(sessionId, taskId)` : en transaction, ferme le segment ouvert (s'il existe, quelle que soit la tâche), ouvre un segment pour la tâche (R16). Ajoute la tâche à la session si absente.
- `pauseTask()` : ferme le segment ouvert.
- `endSession(sessionId)` : ferme le segment ouvert, `endedAt = Date.now()`.
- `getRunningSegment()` → segment ouvert ou `null`.
- `getSessionTaskDuration(sessionId, taskId, now)` = `correctedDurationSec` si non `null`, sinon somme des segments (segment ouvert compté jusqu'à `now`), en secondes entières.
- `correctSessionTaskDuration(sessionId, taskId, durationSec | null)` : `null` = annuler la correction (revenir au calcul des segments) ; refus si session en cours et tâche en train d'être chronométrée.
- `addManualEntry(taskId, day, durationSec)` (durée > 0 obligatoire), `updateManualEntry`, `deleteManualEntry`.
- `getRealTime({ taskIds?, projectId?, days })` → secondes ou `null` si aucune donnée : somme des sessions (rattachées à `session.day`) + ajouts manuels, tâches archivées et projets supprimés inclus (R21). Session en cours comptée jusqu'à `now`.
- `listSessions({ from?, to? })` avec durée totale par session.
- Hooks `useLiveQuery`.

**Definition of Done**
- Tests : démarrer A puis B → le segment de A est fermé, un seul segment ouvert en base.
- Tests : session démarrée le 9 à 23:50, terminée le 10 à 00:40 → tout le temps compte pour le 9 (R18).
- Tests : durée calculée avec `now` simulé (pas de dépendance au temps réel, `vi.useFakeTimers`).
- Tests : correction à 1 200 s remplace la somme des segments ; correction `null` la rétablit.
- Tests : `getRealTime` d'un jour sans aucune donnée = `null` ; avec une seule entrée de 0 s corrigée = `0`.
- Tests : le temps d'une tâche d'un projet supprimé est inclus dans le temps réel du jour.

**Hors périmètre**
Écrans (4.2 à 4.6).

**Dépendances**
1.4, 2.1. Bloque 4.2 à 4.6, 6.2, 6.3.

---

## Ticket 4.2 — Démarrer une session et choisir ses tâches

Type : Front

En tant qu'Adele, je veux lancer une session et y mettre les tâches que je vais travailler, y compris des tâches que je crée sur le moment.

**Contexte technique**
Onglet **Session** (`/`). Fonctions 4.1 et `getDayPlan(today)` (3.1). Libellés : Session, Tâche, Section.

**Référence visuelle**
- Sans session en cours : gros bouton « Démarrer une session » ; en dessous, « Prévu aujourd'hui » (tâches prévues du jour, 3.4) et lien « Ajout manuel » (4.6), lien « Historique » (4.5).
- Après démarrage : écran de session (4.3) avec un bouton « + Ajouter des tâches » qui ouvre une feuille :
  - section « Prévu aujourd'hui » en tête (pré-cochables d'un tap) ;
  - puis toutes les tâches actives groupées projet → section, avec recherche texte ;
  - en bas « + Créer une tâche » : choix projet → section (obligatoire) → libellé.
- On peut rouvrir la feuille à tout moment pendant la session.

**Definition of Done**
- Démarrer une session sans aucune tâche est possible.
- Une tâche créée depuis la session apparaît dans la session et dans le détail de son projet.
- Impossible de valider une tâche créée sans section.
- Le bouton « Démarrer une session » est remplacé par la session en cours tant qu'elle n'est pas terminée.

**Dépendances**
3.4, 4.1.

---

## Ticket 4.3 — Écran de la session en cours : chronos, pause, fin

Type : Front

En tant qu'Adele, je veux lancer et mettre en pause le chrono de chaque tâche d'un seul geste, et voir le temps passé.

**Contexte technique**
Onglet **Session** (`/`) quand une session est en cours. `startTask`, `pauseTask`, `endSession`, `getSessionTaskDuration` (4.1). Le `setInterval` (1 s) ne sert qu'à rafraîchir l'affichage ; les durées sont recalculées depuis la base à chaque tick. Rafraîchir aussi sur `visibilitychange`.

**Référence visuelle**
- En-tête : « Session · démarrée à 18:42 » et durée totale de la session.
- Une ligne par tâche (projet › section en petit, tâche en grand) : durée `h:mm:ss`, bouton rond ▶ / ⏸ (≥ 56 px). La tâche en cours est mise en évidence.
- Taper ▶ sur une autre tâche met la précédente en pause automatiquement.
- Bouton « Terminer la session » en bas → confirmation « Terminer la session ? Durée totale 1:12 » → retour à l'écran sans session, message « Session enregistrée ».

**Definition of Done**
- Lancer A, attendre, lancer B : A s'arrête, B tourne.
- Verrouiller l'écran 2 min puis revenir : le chrono affiche +2 min.
- Fermer l'app (tuer l'onglet) puis rouvrir : la session et le chrono en cours sont retrouvés avec le bon temps.
- Terminer la session ferme le chrono en cours.

**Hors périmètre**
Bandeau global (4.4). Plein écran, écran allumé (epic 8).

**Dépendances**
4.2. Bloque 4.4.

---

## Ticket 4.4 — Bandeau de chrono visible dans toute l'app

Type : Front

En tant qu'Adele, je veux continuer à voir et contrôler le chrono quand je consulte un autre écran.

**Contexte technique**
Zone bandeau du `Layout` (1.5). `getRunningSegment`, `getCurrentSession` (4.1). R17.

**Référence visuelle**
- Bandeau compact sous le titre, sur tous les écrans sauf l'écran Session : « ● Tâche — 0:12:34 » + bouton ⏸ ; si session en cours sans chrono actif : « Session en cours · en pause » + bouton « Reprendre » (relance la dernière tâche chronométrée).
- Taper le bandeau ouvre l'écran Session.
- Masqué s'il n'y a pas de session en cours.

**Definition of Done**
- Chrono lancé, aller dans Projets : le bandeau affiche la tâche et le temps qui avance.
- ⏸ depuis le bandeau met en pause sans changer d'écran.
- Aucun bandeau sans session en cours.

**Dépendances**
4.3.

---

## Ticket 4.5 — Historique des sessions et correction d'un chrono

Type : Front

En tant qu'Adele, je veux corriger la durée d'une tâche quand j'ai oublié d'arrêter le chrono.

**Contexte technique**
Route `/sessions`. `listSessions`, `correctSessionTaskDuration` (4.1). R19.

**Référence visuelle**
- Liste des sessions, plus récente en haut, groupées par jour : « Lun. 9 nov. · 18:42 · 1:12 ».
- Taper une session : détail des tâches et durées ; chaque durée a « Corriger » → `DurationInput` prérempli + « Annuler la correction » si une correction existe.
- Une durée corrigée est suivie de « (corrigée) ».

**Definition of Done**
- Corriger une durée de 3:10 en 0:40 : le détail, l'historique et le temps réel (bilan) affichent 0:40.
- « Annuler la correction » rétablit la durée chronométrée.
- La correction d'une tâche en cours de chronométrage est impossible (bouton désactivé, message « Mets d'abord le chrono en pause »).

**Hors périmètre**
Suppression d'une session (non demandée ; correction à 0:00 possible).

**Dépendances**
4.3.

---

## Ticket 4.6 — Ajout manuel d'une durée

Type : Front

En tant qu'Adele, je veux ajouter une durée oubliée (« 45 min sur telle tâche mardi »), sans heures de début ni de fin.

**Contexte technique**
Route `/ajout-manuel` (lien depuis l'écran Session et depuis l'historique). `addManualEntry`, `updateManualEntry`, `deleteManualEntry` (4.1). R20. Libellé provisoire : **Ajout manuel**.

**Référence visuelle**
- Formulaire : Tâche (sélecteur des tâches actives groupées, recherche), Jour (aujourd'hui par défaut, sélecteur de date), Durée (`DurationInput`, obligatoire, > 0). Bouton « Ajouter ».
- Sous le formulaire : derniers ajouts manuels (jour, tâche, durée) avec modifier / supprimer.
- Dans l'historique (4.5), les ajouts manuels apparaissent au jour concerné avec la mention « Ajout manuel ».

**Definition of Done**
- Ajouter 0:45 mardi sur une tâche : le temps réel de mardi augmente de 0:45 dans le bilan.
- Durée vide ou 0 : bouton « Ajouter » désactivé.
- Supprimer un ajout manuel le retire du temps réel.

**Dépendances**
4.1, 1.5.
