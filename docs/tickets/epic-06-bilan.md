# Epic 6 — Bilan (MVP)

Objectif : Adele consulte à tout moment un récap texte de sa semaine et de chaque projet : prévu vs réel, budget vs réel.

Format du récap : **hypothèse non vérifiée H1**, proposée ci-dessous, à valider avec Adele (6.1). Les tickets 6.4 et 6.5 l'implémentent tel quel ; tout changement validé par Adele passera par un lot.

### Format proposé — bilan hebdo
```
Semaine du 9 nov.
Budget 9:30 · Réel 7:10 · 2:20 sous le budget

Par jour
lun. 9    Budget 1:30 · Réel 1:45 · 0:15 au-dessus
mar. 10   Budget 1:00 · Réel —
mer. 11   Budget — · Réel 0:40
…

Par projet
Ballade n°1 — Prévu 4:00 · Réel 3:20
  Passages à tempo — Réel 2:10
    m. 23-30 main gauche — Prévu 1:00 · Réel 1:20
    m. 45-52 — Réel 0:50
  Page 1 — Réel 1:10
Déchiffrage — Prévu — · Réel 1:15
Sonate (supprimé) — Réel 0:30

Planning de la semaine
Ballade n°1 › Passages à tempo (prévu initial : oui)
```

### Format proposé — bilan projet
```
Ballade n°1 · depuis le 3 nov.
Réel total 12:40 · 4 semaines travaillées

Passages à tempo — Réel 6:20
  Planning : initial 9 → 22 nov. · revu 9 → 29 nov.
  Avancement : « tempo 80 atteint sur m. 23-30 »
  m. 23-30 main gauche — Réel 4:10
  m. 45-52 — Réel 2:10 (archivée)
Page 1 — Réel 6:20
  Planning : non placé
  Avancement : —

Par semaine
Semaine du 2 nov. — Prévu 3:00 · Réel 2:40
Semaine du 9 nov. — Prévu 4:00 · Réel 3:20
```

---

## Ticket 6.1 — Valider le format du récap avec Adele

Type : Décision (validation client, pas de code)

En tant que PO, je veux montrer le format proposé à Adele, afin de construire un bilan qu'elle lira vraiment.

**À faire**
- Montrer les deux exemples ci-dessus (ou une capture de 6.4 si déjà prête).
- Questions : ordre (par jour d'abord ou par projet d'abord ?) ; niveau de détail (tâches visibles par défaut ou repliées ?) ; écarts exprimés en durée (« 0:15 au-dessus ») ou autrement ; affichage d'un projet supprimé (H2 : « Sonate (supprimé) ») ; bilan projet par semaine utile ?
- Consigner les réponses dans `docs/suivi.md` (Décisions) et mettre à jour ce fichier.

**Definition of Done**
- H1 et H2 marquées confirmées ou corrigées dans `docs/brief.md`.

**Dépendances**
Aucune pour démarrer ; 6.4 et 6.5 peuvent être codés avec le format proposé avant la réponse.

---

## Ticket 6.2 — Calculs du bilan hebdo

Type : Donnée

En tant que développeur, je veux une fonction qui produit toutes les données du bilan hebdo, afin que l'écran ne fasse qu'afficher.

**Contexte technique**
R12, R21, R23, R25. S'appuie sur `getWeekBudget`, `getWeekPlan` (3.1), `getRealTime` (4.1), `getWeekPlanningAllProjects` (5.1). Calcul à la volée à chaque lecture (`useLiveQuery`), aucun bilan stocké.

**À faire**
- `getWeeklyReport(weekStart, now)` → objet typé :
  - `week` : budget, réel, écart réel − budget ;
  - `days[7]` : budget, réel, écart ;
  - `projects[]` : nom, `deleted: boolean`, temps prévu projet, réel ; `sections[]` : réel ; `tasks[]` : temps prévu (somme des temps prévus jour de la semaine, `sumNullable`), réel, `archived: boolean` ;
  - `planning[]` : sections placées (revu) sur la semaine, avec `inInitial: boolean`.
- Inclure tout projet / section / tâche ayant du réel **ou** du prévu sur la semaine (y compris archivés, supprimés) ; exclure ceux qui n'ont ni l'un ni l'autre.
- Écart = `null` dès qu'une des deux valeurs est `null`.
- `formatGap(sec)` → « 0:15 au-dessus », « 2:20 sous le budget », « pile dans le budget » (dans `src/data/`, testé).

**Definition of Done**
- Tests : semaine vide → `week.budget = null`, `week.real = null`, `projects = []`.
- Tests : tâche archivée avec du réel dans la semaine → présente, `archived = true`.
- Tests : projet supprimé avec du réel → présent, `deleted = true`.
- Tests : session en cours comptée jusqu'à `now`.

**Dépendances**
3.1, 4.1, 5.1. Bloque 6.4.

---

## Ticket 6.3 — Calculs du bilan projet

Type : Donnée

En tant que développeur, je veux une fonction qui produit le bilan d'un projet sur toute sa durée.

**Contexte technique**
R24. `getRealTime` (4.1), `getProjectPlanning` (5.1), `projectWeekPlans`.

**À faire**
- `getProjectReport(projectId, now)` → réel total, nombre de semaines avec du réel ; `sections[]` : réel, initial / revu (semaines, résumées en plage « 9 → 22 nov. » si contiguës), avancement ; `tasks[]` : réel, `archived` ; `weeks[]` : semaines avec prévu ou réel (prévu projet, réel).
- Période = toutes les données du projet, sans borne (dates du projet indicatives seulement).
- Utilitaire `formatWeekRange(weekStarts[])` testé (contiguës → plage ; sinon liste).

**Definition of Done**
- Tests : projet sans aucun temps → réel total `null`, sections présentes avec réel `null`.
- Tests : semaines [9 nov., 16 nov.] → « 9 → 22 nov. » ; [9 nov., 23 nov.] → « 9 nov., 23 nov. ».

**Dépendances**
4.1, 5.1. Bloque 6.5.

---

## Ticket 6.4 — Écran Bilan hebdo

Type : Front

En tant qu'Adele, je veux lire en un coup d'œil où j'en suis cette semaine par rapport à mon budget et à ce que j'avais prévu.

**Contexte technique**
Onglet **Bilan** (`/bilan`, paramètre `?w=`). `getWeeklyReport` (6.2). Format : « Format proposé — bilan hebdo » ci-dessus (H1). Récap texte, **pas de graphique** (R25). Constats neutres, pas de rouge (R12).

**Référence visuelle**
- Navigation semaine identique à l'écran Semaine (3.2).
- Texte structuré reprenant exactement le format proposé : bloc semaine, « Par jour », « Par projet » (projets repliables, sections et tâches en retrait), « Planning de la semaine ».
- `null` affiché « — ». Projet supprimé suffixé « (supprimé) », tâche archivée « (archivée) ».
- Mise à jour en direct si un chrono tourne (rafraîchissement toutes les 30 s).
- Taper un projet ouvre son bilan (6.5).
- État vide : « Rien de prévu ni de travaillé cette semaine pour l'instant. »

**Definition of Done**
- Avec des données de test (budget, sessions, ajout manuel, tâche archivée, projet supprimé), le texte affiché correspond ligne à ligne au format proposé.
- Aucun « 0:00 » affiché pour une valeur non saisie.

**Dépendances**
6.2, 1.5.

---

## Ticket 6.5 — Écran Bilan d'un projet

Type : Front

En tant qu'Adele, je veux voir tout le temps passé sur un morceau depuis le début, section par section, avec mon planning et mon avancement.

**Contexte technique**
Route `/projets/:id/bilan` (lien depuis le détail projet 2.3 et le bilan hebdo 6.4). `getProjectReport` (6.3). Format : « Format proposé — bilan projet » (H1).

**Référence visuelle**
Texte structuré selon le format proposé ; sections repliables ; « — » pour les valeurs absentes ; « (archivée) » pour les tâches archivées.

**Definition of Done**
- Le texte affiché correspond ligne à ligne au format proposé avec des données de test.
- Un projet sans aucune donnée affiche ses sections avec « Réel — ».

**Dépendances**
6.3, 2.3.
