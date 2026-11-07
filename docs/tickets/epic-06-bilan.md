# Epic 6 — Bilan (MVP)

Objectif : Adele consulte à tout moment un tableau de bord de sa semaine et de chaque projet : budget vs réel, prévu vs réel, répartition par projet, planning.

_Révisé le 07/11/2026 d'après le proto validé (`docs/design/proto-piano.html`, onglet Bilan et « Bilan du projet »). Le récap texte proposé à l'origine (H1) est remplacé par le format du proto (R25 mise à jour), à confirmer avec Adele en démo (6.1)._

Règles communes :
- Calcul à la volée à chaque lecture (`useLiveQuery`), aucun bilan stocké. Les écrans n'implémentent aucun calcul : pourcentages, répartition, écarts et sélection par défaut viennent de `src/data/`.
- `null` affiché « — ». Projet supprimé suffixé « (supprimé) », tâche archivée « (archivée) » (H2).
- Dépassements du réel : constat neutre (`ink`), jamais de rouge (R12).
- Graphiques en SVG maison, sans librairie.

---

## Ticket 6.1 — Valider le tableau de bord avec Adele

Type : Décision (validation client, pas de code)

En tant que PO, je veux montrer le bilan du proto à Adele, afin de construire un bilan qu'elle lira vraiment.

**À faire**
- Montrer le proto (`docs/design/proto-piano.html`, onglet Bilan puis « Bilan du projet ») ou une capture de 6.4 si déjà prête.
- Questions : les 3 chiffres clés sont-ils les bons ? le graphique par jour se lit-il sans explication ? la répartition par projet est-elle utile ? sections et tâches repliées par défaut, OK ? affichage d'un projet supprimé (H2 : « Sonate en do (supprimé) ») ?
- Consigner les réponses dans `docs/suivi.md` (Décisions) ; tout changement passe par un lot.

**Definition of Done**
- H1 et H2 marquées confirmées ou corrigées dans `docs/brief.md`.

**Dépendances**
Aucune pour démarrer ; 6.4 et 6.5 peuvent être codés d'après le proto avant la réponse.

---

## Ticket 6.2 — Calculs du bilan hebdo

Type : Donnée

En tant que développeur, je veux une fonction qui produit toutes les données du tableau de bord hebdo, afin que l'écran ne fasse qu'afficher.

**Contexte technique**
R12, R21, R23, R25. S'appuie sur `getWeekOverview` / `formatGap` (3.1), `getRealTime` (4.1), `getWeekPlanningAllProjects` (5.1), couleur projet (2.1).

**À faire**
- `getWeeklyReport(weekStart, now)` → objet typé :
  - `isEmpty` : ni budget, ni réel, ni projet à afficher ;
  - `live` : une session en cours compte dans cette semaine ;
  - `week` : réel, budget, total prévu projets, écart réel − budget, ratio réel / budget pour la barre ;
  - `days[7]` : jour, libellé court (« lun. 9 »), réel, budget, écart, `isToday` ;
  - `defaultSelectedDay` : aujourd'hui s'il est dans la semaine, sinon le dernier jour avec réel ou budget, sinon le premier jour ;
  - `projects[]` : nom, couleur, `deleted`, prévu projet de la semaine, réel, part du réel de la semaine en % (arrondi), % du temps prévu (`null` sans prévu), écart réel − prévu ; `sections[]` : nom, réel, part du réel du projet ; `tasks[]` : libellé, section, prévu (somme des temps prévus jour de la semaine, `sumNullable`), réel, `archived` ;
  - `planning[]` : groupé par projet (nom, couleur) → sections placées (revu) sur la semaine, avec `inInitial: boolean` (« initial » ou « ajouté au revu »).
- Inclure tout projet / section / tâche ayant du réel **ou** du prévu sur la semaine (y compris archivés, supprimés) ; exclure ceux qui n'ont ni l'un ni l'autre.
- Écart = `null` dès qu'une des deux valeurs est `null`.

**Definition of Done**
- Tests : semaine vide → `isEmpty = true`, `week.budget = null`, `week.real = null`, `projects = []`.
- Tests : tâche archivée avec du réel dans la semaine → présente, `archived = true`.
- Tests : projet supprimé avec du réel → présent, `deleted = true`.
- Tests : session en cours comptée jusqu'à `now`, `live = true`.
- Tests : 2 projets à 3:00 et 1:00 → parts 75 % et 25 % ; projet sans prévu → % du temps prévu `null`.
- Tests : `defaultSelectedDay` = aujourd'hui ; semaine passée → dernier jour avec données.

**Dépendances**
3.1, 4.1, 5.1. Bloque 6.4.

---

## Ticket 6.3 — Calculs du bilan projet

Type : Donnée

En tant que développeur, je veux une fonction qui produit le tableau de bord d'un projet sur toute sa durée.

**Contexte technique**
R24, R25. `getRealTime` (4.1), `getProjectPlanning` (5.1), `projectWeekPlans`, couleur projet (2.1).

**À faire**
- `getProjectReport(projectId, now)` → réel total, nombre de semaines avec du réel, nombre de tâches actives, couleur ;
  - `weeks[]` : toutes les semaines de la plage (y compris sans données, pour le graphique), avec prévu projet, réel, écart, libellés court (« 9 nov ») et long (« Semaine du 9 nov. »), `isCurrent` ; plage = de la plus ancienne semaine parmi date de début, placements, prévu et réel, jusqu'à la semaine suivant la semaine courante ;
  - `defaultSelectedWeek` (même logique que 6.2) ;
  - `sections[]` (ordre) : réel, part du réel du projet, initial / revu (plage « 9 → 22 nov. » si contiguës, sinon liste, « non placé » si vide), avancement ; `tasks[]` : réel, `archived`.
- Période = toutes les données du projet, sans borne (dates du projet indicatives seulement).
- Utilitaire `formatWeekRange(weekStarts[])` testé.

**Definition of Done**
- Tests : projet sans aucun temps → réel total `null`, sections présentes avec réel `null`.
- Tests : semaines [9 nov., 16 nov.] → « 9 → 22 nov. » ; [9 nov., 23 nov.] → « 9 nov, 23 nov » ; [] → « non placé ».
- Tests : une semaine sans données au milieu de la plage figure dans `weeks[]` avec réel `null`.

**Dépendances**
4.1, 5.1. Bloque 6.5.

---

## Ticket 6.4 — Écran Bilan hebdo

Type : Front

En tant qu'Adele, je veux voir en un coup d'œil où j'en suis cette semaine par rapport à mon budget et à ce que j'avais prévu.

**Contexte technique**
Onglet **Bilan** (`/bilan`, paramètre `?w=`). `getWeeklyReport` (6.2). Proto : écran Bilan (`V.bilan`, `colChart`).

**Référence visuelle (proto)**
- Navigation ‹ semaine › (semaine en cours par défaut).
- 3 tuiles (`felt-soft`) : **Réel** (point vert « en direct » si une session tourne), **Budget**, **Prévu projets**. Barre réel / budget. Phrase : « Réel 2:20 sous le budget. » ou « Budget non saisi. » ; + « La session en cours est comptée en direct. »
- Panneau **Par jour** : graphique en colonnes (SVG). Pour chaque jour, le budget est une colonne claire en pointillés (`felt-soft`, contour `felt`), le réel la remplit (`felt`), la partie au-dessus du budget est en `ink`, séparée de 2 px. Graduations en heures à gauche. Jour sélectionné (`defaultSelectedDay`) : les autres colonnes estompées, valeur du réel au-dessus de sa colonne, libellé en gras ; encart au-dessus du graphique : date, « Réel 1:20 · Budget 1:30 », écart (ou « Budget non saisi »). Toucher une colonne change la sélection (zone tactile = toute la largeur de la colonne). Légende : Réel, Budget, Au-dessus du budget. « Touche un jour pour voir son détail. »
- Panneau **Par projet** : « Répartition de ton temps réel cette semaine », barre de répartition (segments couleur projet, 2 px d'écart), légende avec %. Puis une fiche par projet : pastille + nom (« (supprimé) »), réel en grand « / 4:00 prévu » ou « / pas de prévu », barre réel / prévu, « 83 % du temps prévu » (+ écart si au-dessus) ou « Aucun temps prévu pour ce projet cette semaine », deux blocs dépliables fermés par défaut : « Voir les sections (n) » (une ligne par section : nom, mini-barre couleur projet, temps) et « Voir les tâches (n) » (libellé, section, « prévu 1:00 · 1:20 ») ; lien « Bilan du projet » (sauf projet supprimé).
- Panneau **Planning de la semaine** : sections placées regroupées sous le nom du projet (petit, gris, pastille couleur), sections en puces avec « initial » ou « ajouté au revu ». Vide : « Aucune section placée cette semaine. »
- État vide : « Rien de prévu ni de travaillé cette semaine pour l'instant. »
- Rafraîchissement en direct toutes les 5 s si un chrono tourne (comme le proto), sans perdre la position de défilement ni la sélection du graphique.
- **L'état ouvert / fermé des blocs dépliables survit au rafraîchissement en direct** (état gardé hors du rendu des données).

**Definition of Done**
- Avec des données de test (budget, sessions, ajout manuel, tâche archivée, projet supprimé), chaque panneau correspond au proto.
- Aucun « 0:00 » affiché pour une valeur non saisie ; aucun rouge sur l'écran.
- Chrono en cours, bloc « Voir les tâches » ouvert : après 10 s, le réel a avancé et le bloc est toujours ouvert.
- Toucher la colonne de mercredi met à jour l'encart et estompe les autres jours.

**Dépendances**
6.2, 1.5, lot 1.

---

## Ticket 6.5 — Écran Bilan d'un projet

Type : Front

En tant qu'Adele, je veux voir tout le temps passé sur un morceau depuis le début, semaine par semaine et section par section, avec mon planning et mon avancement.

**Contexte technique**
Route `/projets/:id/bilan` (lien depuis le détail projet 2.3 et le bilan hebdo 6.4). `getProjectReport` (6.3). Proto : « Bilan du projet » (`V.bilanProjet`).

**Référence visuelle (proto)**
- En-tête : bouton retour, titre « Bilan du projet », sous-titre = nom du projet.
- 3 tuiles : **Réel total**, **Semaines** (« travaillées »), **Tâches** (« actives »).
- Panneau **Par semaine** : même graphique en colonnes que 6.4, référence = temps prévu projet (légende « Prévu », « Au-dessus du prévu »), encart « Semaine du 9 nov. · Réel · Prévu · écart » ou « Pas de temps prévu ». « Touche une semaine pour voir son détail. »
- Panneau **Par section** : une barre horizontale par section (couleur du projet), « Réel 6:20 » ; toucher la section la déplie : Planning « initial 9 → 22 nov. · revu 9 → 29 nov. », Avancement (texte ou « — »), tâches avec leur réel et « (archivée) ». L'état déplié survit au rafraîchissement.

**Definition of Done**
- Avec des données de test, les 3 panneaux correspondent au proto.
- Un projet sans aucune donnée affiche ses sections avec « Réel — » et des tuiles « — » / 0.

**Dépendances**
6.3, 2.3, lot 1.
