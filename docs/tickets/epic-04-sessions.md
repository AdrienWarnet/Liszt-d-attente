# Epic 4 — Sessions (MVP)

Objectif : Adele chronomètre son travail tâche par tâche dans une session, navigue dans l'app pendant que le chrono tourne, corrige un oubli ou ajoute une durée a posteriori.

_Révisé le 07/11/2026 d'après le proto validé (`docs/design/proto-piano.html`, onglet Session, bandeau, Historique, Ajout manuel). Tâches groupées par projet (R26)._

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
- `setSessionTasks(sessionId, taskIds)` (feuille « Ajouter des tâches » du proto) : ajoute les tâches cochées ; retire une tâche décochée **seulement** si elle n'a aucun temps dans la session (sinon elle reste).
- `getSessionView(sessionId, now)` → heure de démarrage, durée totale, tâches **groupées par projet** (nom, couleur) avec section, libellé, durée, `running` (R26).
- `startTask(sessionId, taskId)` : en transaction, ferme le segment ouvert (s'il existe, quelle que soit la tâche), ouvre un segment pour la tâche (R16). Ajoute la tâche à la session si absente.
- `pauseTask()` : ferme le segment ouvert.
- `endSession(sessionId)` : ferme le segment ouvert, `endedAt = Date.now()`.
- `getRunningSegment()` → segment ouvert ou `null`.
- `getSessionTaskDuration(sessionId, taskId, now)` = `correctedDurationSec` si non `null`, sinon somme des segments (segment ouvert compté jusqu'à `now`), en secondes entières.
- `correctSessionTaskDuration(sessionId, taskId, durationSec | null)` : `null` = annuler la correction (revenir au calcul des segments) ; refus si session en cours et tâche en train d'être chronométrée.
- `addManualEntry(taskId, day, durationSec)` (durée > 0 obligatoire), `updateManualEntry`, `deleteManualEntry`.
- `getRealTime({ taskIds?, projectId?, days })` → secondes ou `null` si aucune donnée : somme des sessions (rattachées à `session.day`) + ajouts manuels, tâches archivées et projets supprimés inclus (R21). Session en cours comptée jusqu'à `now`.
- `listSessions({ from?, to? })` avec durée totale par session.
- `listHistory()` → sessions terminées et ajouts manuels mêlés, du plus récent au plus ancien, + session en cours à part (Historique du proto).
- Hooks `useLiveQuery`.

**Definition of Done**
- Tests : démarrer A puis B → le segment de A est fermé, un seul segment ouvert en base.
- Tests : session démarrée le 9 à 23:50, terminée le 10 à 00:40 → tout le temps compte pour le 9 (R18).
- Tests : durée calculée avec `now` simulé (pas de dépendance au temps réel, `vi.useFakeTimers`).
- Tests : correction à 1 200 s remplace la somme des segments ; correction `null` la rétablit.
- Tests : `getRealTime` d'un jour sans aucune donnée = `null` ; avec une seule entrée de 0 s corrigée = `0`.
- Tests : le temps d'une tâche d'un projet supprimé est inclus dans le temps réel du jour.
- Tests : `setSessionTasks` sans une tâche déjà chronométrée la garde dans la session ; sans une tâche à 0 s la retire.

**Hors périmètre**
Écrans (4.2 à 4.6).

**Dépendances**
1.4, 2.1. Bloque 3.1, 4.2 à 4.6, 6.2, 6.3.

---

## Ticket 4.2 — Démarrer une session et choisir ses tâches

Type : Front

En tant qu'Adele, je veux lancer une session et y mettre les tâches que je vais travailler, y compris des tâches que je crée sur le moment.

**Contexte technique**
Onglet **Session** (`/`). Fonctions 4.1 et `getDayPlan(today)` (3.1). Libellés : Session, Tâche, Section. R26. Proto : écran Session sans session en cours, feuille `SH.addTasks`.

**Référence visuelle (proto)**
- En-tête : « Session », sous-titre = date du jour (« lun. 9 nov. »).
- Sans session en cours : grand bouton vert « Démarrer une session » (texte serif, « Chronomètre tes tâches une par une » en petit) ; en dessous, libellé « Prévu aujourd'hui » : tâches prévues du jour **groupées par projet** (pastille + nom), section en petit, temps prévu à droite ; vide : « Aucune tâche prévue aujourd'hui. » ; puis puces « Ajout manuel » (4.6) et « Historique » (4.5).
- « Démarrer une session » démarre la session et ouvre directement la feuille « Ajouter des tâches » (feuille en bas d'écran) :
  - groupe « Prévu aujourd'hui » en tête (projet › section en petit) ;
  - puis toutes les tâches actives groupées projet → section, cases à cocher (cochées = déjà dans la session) ;
  - groupe « Créer une tâche » : sélecteur de section (groupé par projet, obligatoire) + libellé ;
  - boutons Annuler / « Ajouter à la session » (`setSessionTasks`, `createTaskInSession`).
- On rouvre la feuille à tout moment avec « + Ajouter des tâches » (4.3).

**Definition of Done**
- Démarrer une session sans aucune tâche est possible.
- Une tâche créée depuis la session apparaît dans la session et dans le détail de son projet.
- Impossible de valider une tâche créée sans section (message « Choisis une section pour la nouvelle tâche »).
- Deux tâches prévues du même projet apparaissent sous un seul en-tête de projet.
- Le bouton « Démarrer une session » est remplacé par la session en cours tant qu'elle n'est pas terminée.

**Dépendances**
3.4, 4.1, lot 1.

---

## Ticket 4.3 — Écran de la session en cours : chronos, pause, fin

Type : Front

En tant qu'Adele, je veux lancer et mettre en pause le chrono de chaque tâche d'un seul geste, et voir le temps passé.

**Contexte technique**
Onglet **Session** (`/`) quand une session est en cours. `startTask`, `pauseTask`, `endSession`, `getSessionView` (4.1). Le `setInterval` (1 s) ne sert qu'à rafraîchir l'affichage ; les durées sont recalculées depuis la base à chaque tick. Rafraîchir aussi sur `visibilitychange`. R26. Proto : écran Session avec session en cours, feuille `SH.endSession`.

**Référence visuelle (proto)**
- Bloc total : « Session démarrée à 18:42 », durée totale en grand (`h:mm:ss`, `tabular-nums`), « 3 tâches » à droite, trait sous le bloc.
- Tâches **groupées par projet** (pastille + nom) ; par tâche : section en petit au-dessus, libellé en gras, durée `h:mm:ss`, bouton rond ▶ / ⏸ de 56 px. Tâche en cours : barre verte à gauche, durée et bouton en `felt`.
- Taper ▶ sur une autre tâche met la précédente en pause automatiquement.
- Aucune tâche : « Ajoute les tâches que tu vas travailler. »
- Bouton pointillé « + Ajouter des tâches » (rouvre la feuille de 4.2), puis bouton principal « Terminer la session » → feuille « Terminer la session ? » : « Durée totale 1:12. Le chrono en cours sera arrêté. », Annuler / Terminer → retour à l'écran sans session, message bref « Session enregistrée ».

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
Zone bandeau du `Layout` (1.5). `getRunningSegment`, `getCurrentSession` (4.1). R17. Proto : bandeau `#band`.

**Référence visuelle (proto)**
- Bandeau vert (`felt`, texte `screen`, coins 14 px) sous le titre, sur tous les écrans sauf l'onglet Session : « ● Tâche » (tronqué si long) + temps `h:mm:ss` + bouton rond ⏸ (36 px, fond `screen`) ; si session en cours sans chrono actif : « Session en cours · en pause » + bouton ▶ (relance la dernière tâche chronométrée).
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
Route `/sessions`, accessible depuis la puce « Historique » de l'onglet Session et depuis l'onglet Plus (« Historique des sessions »). `listHistory`, `correctSessionTaskDuration` (4.1). R19. Proto : écran Historique (`V.historique`).

**Référence visuelle (proto)**
- En-tête : bouton retour, « Historique », sous-titre « Sessions et ajouts manuels ».
- Session en cours en tête : carte « lun. 9 · 18:42 » + étiquette « en cours » (non dépliable, non corrigeable).
- Puis, du plus récent au plus ancien, des cartes : session « lun. 9 · 18:30 » + durée totale, dépliable ; ajout manuel : « lun. 9 » + « Ajout manuel », tâche, durée.
- Session dépliée : par tâche, libellé (+ « (corrigée) »), projet › section en petit, `DurationInput` prérempli : modifier la valeur corrige la durée (message bref « Durée corrigée ») ; bouton ↺ « Annuler la correction » si une correction existe. Phrase : « Modifie une durée pour la corriger (oubli d'arrêt du chrono). »
- Ajouter l'entrée « Historique des sessions » dans l'onglet Plus.

**Definition of Done**
- Corriger une durée de 3:10 en 0:40 : le détail, l'historique et le temps réel (bilan) affichent 0:40.
- « Annuler la correction » rétablit la durée chronométrée.
- La session en cours n'est pas corrigeable depuis l'historique.
- Une durée vidée ou illisible ne modifie rien (message « Durée non comprise : écris 45 ou 1:30 »).

**Hors périmètre**
Suppression d'une session (non demandée ; correction à 0:00 possible).

**Dépendances**
4.3.

---

## Ticket 4.6 — Ajout manuel d'une durée

Type : Front

En tant qu'Adele, je veux ajouter une durée oubliée (« 45 min sur telle tâche mardi »), sans heures de début ni de fin.

**Contexte technique**
Route `/ajout-manuel`, accessible depuis la puce « Ajout manuel » de l'onglet Session et depuis l'onglet Plus. `addManualEntry`, `deleteManualEntry` (4.1). R20. Libellé provisoire : **Ajout manuel**. Proto : écran Ajout manuel (`V.manuel`).

**Référence visuelle (proto)**
- En-tête : bouton retour, « Ajout manuel », sous-titre « Une durée oubliée, sans heures ».
- Formulaire : **Tâche** (liste déroulante groupée par projet, options « Section › Tâche », « Choisir une tâche » par défaut), **Jour** (liste des jours jusqu'à aujourd'hui, du plus récent au plus ancien, aujourd'hui par défaut, 14 derniers jours — décision PO), **Durée** (champ texte, placeholder « ex. 45 ou 1:30 »). Bouton principal « Ajouter » → message bref « Ajout manuel enregistré ».
- Erreurs par message bref : « Choisis une tâche », « Indique une durée, par exemple 45 ou 1:30 ».
- Sous le formulaire : « Derniers ajouts manuels » (tâche, jour, durée, bouton ✕ supprimer) ; vide : « Aucun ajout manuel. »
- Dans l'historique (4.5), les ajouts manuels apparaissent avec la mention « Ajout manuel ».
- Ajouter l'entrée « Ajout manuel » dans l'onglet Plus.

**Definition of Done**
- Ajouter 0:45 mardi sur une tâche : le temps réel de mardi augmente de 0:45 dans le bilan.
- Durée vide ou 0 : rien n'est ajouté, message affiché.
- Supprimer un ajout manuel le retire du temps réel.

**Dépendances**
4.1, 1.5.
