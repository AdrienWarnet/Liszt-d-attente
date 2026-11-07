# Epic 3 — Semaine et temps prévu (MVP)

Objectif : Adele voit sa semaine d'un coup d'œil (réel vs budget, jour par jour et par projet), saisit son budget jour par jour, son temps prévu par projet / semaine et par tâche / jour, et marque des tâches comme prévues tel jour.

_Révisé le 07/11/2026 d'après le proto validé (`docs/design/proto-piano.html`, onglet Semaine et vue Jour). L'onglet Semaine devient une vue globale ; le détail d'un jour passe dans une vue Jour._

---

## Ticket 3.1 — Fonctions de données budget, temps prévu et vue semaine

Type : Donnée

En tant que développeur, je veux les opérations et agrégats de budget, de temps prévu et de vue semaine, afin que les écrans Semaine, Jour et le bilan s'appuient sur les mêmes calculs.

**Contexte technique**
R1, R4, R5, R10, R11, R11b, R12 (mise à jour), R26. Tables `dailyBudgets`, `projectWeekPlans`, `taskDayPlans`. Temps réel via `getRealTime` (4.1). Jours `YYYY-MM-DD`, semaine = `weekStart` du lundi (utilitaires 1.4).

**À faire**
- `setDailyBudget(day, durationSec | null)` : `null` → supprimer la ligne (budget non saisi).
- `getWeekBudget(weekStart)` → `{ days: { day, durationSec: number|null }[7], total: number|null }` (total via `sumNullable`).
- `setProjectWeekPlan(projectId, weekStart, durationSec | null)` ; `null` → ligne supprimée.
- `planTaskOnDay(taskId, day, durationSec | null)` : crée ou met à jour la ligne (marquage = ligne présente, durée facultative).
- `unplanTaskOnDay(taskId, day)` : supprime la ligne.
- `setDayPlannedTasks(day, taskIds)` : en transaction, ajoute les tâches cochées (durée `null`), retire les tâches actives décochées ; ne retire jamais une tâche archivée déjà prévue (feuille « Prévoir des tâches » du proto).
- `getDayPlan(day)` → tâches prévues ce jour **groupées par projet** (R26) : projet (nom, couleur, `deleted`), puis pour chaque tâche : libellé, section, durée prévue (`null` possible), `archived`. Tâches archivées et projets supprimés inclus.
- `getWeekOverview(weekStart, now)` → données de l'onglet Semaine :
  - `week` : budget (`sumNullable`), réel, écart réel − budget ;
  - `days[7]` : jour, budget, réel, nombre de tâches prévues, total prévu (`sumNullable`), `isToday` ;
  - `projects[]` (non supprimés, ordre de 2.1) : couleur, temps prévu de la semaine, réel de la semaine ;
  - `plannedTotal` (somme des temps prévus projets, `sumNullable`), écart prévu − budget de la semaine, `plannedOverBudget: boolean`.
- `getDayOverview(day, now)` → budget, réel, total prévu des tâches, écart prévu − budget, `plannedOverBudget`.
- `formatGap(sec, ref)` → « 0:15 au-dessus du budget », « 2:20 sous le budget », « pile dans le budget » (|écart| < 60 s) ; `null` si l'une des valeurs est `null`. Variante « prévu » pour le bilan.
- `isPlannedOverBudget(planned, budget)` : vrai si les deux sont saisis et `planned − budget ≥ 60 s` (seuil du rouge, R12).
- Hooks `useLiveQuery`.

**Definition of Done**
- Tests : semaine sans aucune saisie → `week.budget = null`, `week.real = null`, chaque jour `null`.
- Tests : une tâche marquée prévue sans durée compte dans le nombre de tâches du jour mais pas dans le total prévu ; si c'est la seule, total prévu = `null`.
- Tests : écart prévu − budget = `null` si le budget n'est pas saisi ; `plannedOverBudget = false` dans ce cas.
- Tests : prévu 4:30 / budget 4:00 → `plannedOverBudget = true` ; prévu 4:00:30 / budget 4:00 → `false` et « pile dans le budget ».
- Tests : `setDailyBudget(day, 0)` enregistre bien 0 (0 saisi ≠ non saisi).
- Tests : `getDayPlan` regroupe deux tâches du même projet sous un seul groupe.

**Hors périmètre**
Bilan (6.2).

**Dépendances**
1.4, 2.1, 4.1 (temps réel). Bloque 3.2, 3.3, 3.4, 6.2.

---

## Ticket 3.2 — Onglet Semaine : vue globale et budget de chaque jour

Type : Front

En tant qu'Adele, je veux voir où en est ma semaine et saisir en début de semaine le temps libre que j'estime avoir chaque jour pour le piano.

**Contexte technique**
Onglet **Semaine** (`/semaine`, paramètre facultatif `?w=YYYY-MM-DD`). `getWeekOverview`, `setDailyBudget` (3.1). Saisie via `DurationInput` (accepte « 45 », « 1:30 », « 1h30 » ; champ vidé = `null`, affiché « — »). Proto : écran Semaine (`V.semaine`).

**Référence visuelle (proto)**
- Navigation ‹ Semaine du 9 nov. › (boutons ronds 40 px).
- Panneau « Avancement » : « réel / budget » de la semaine à droite, barre réel / budget, phrase : « Réel 2:20 sous le budget » ; si budget non saisi : « Saisis ton budget jour par jour ci-dessous. »
- Libellé « Budget de chaque jour », puis une carte avec une ligne par jour : « lun. 9 » (+ « · aujourd'hui » en vert si c'est le jour courant), à droite « Réel 1:20 · 3 tâches », barre réel / budget, `DurationInput` du budget sur la ligne. Toucher la ligne (hors champ) ouvre la vue Jour (3.4).
- Bas de carte : « Budget de la semaine » + total.
- Lien « Revue de semaine » vers `/revue` (2.6).
- Barre : remplissage `felt` ; si réel > budget, remplissage `ink` (constat neutre, pas de rouge).
- Composant réutilisable `DurationInput` (valeur `number|null`, affiche `h:mm`, fond `felt-soft`).

**Definition of Done**
- Saisir « 1:30 » lundi → total de la semaine « 1:30 » ; vider le champ → « — ».
- Saisir « 0 » enregistre 0:00 (distinct de « — »).
- Navigation sur 3 semaines en arrière et retour : chaque semaine garde ses valeurs.
- Aucun rouge sur cet écran pour un réel au-dessus du budget.

**Hors périmètre**
Temps prévu par projet (3.3), vue Jour (3.4).

**Dépendances**
1.5, lot 1, 3.1. Bloque 3.3, 3.4.

---

## Ticket 3.3 — Temps prévu par projet pour la semaine

Type : Front

En tant qu'Adele, je veux indiquer combien de temps je prévois sur chaque projet cette semaine, si je le souhaite, et voir tout de suite si j'en prévois plus que mon budget.

**Contexte technique**
Onglet Semaine (3.2), sous la carte des jours. `getWeekOverview`, `setProjectWeekPlan` (3.1). Facultatif (R10). R12 mis à jour : rouge réservé au prévu > budget. Proto : écran Semaine, carte « Temps prévu par projet ».

**Référence visuelle (proto)**
- Libellé « Temps prévu par projet », carte avec une ligne par projet non supprimé : nom, « Réel 1:10 » (réel de la semaine), barre réel / prévu, `DurationInput` du temps prévu (« — » par défaut).
- Ligne **Total prévu** : à gauche « Total prévu » et « Budget de la semaine 9:30 » en petit ; à droite une case non éditable au style `DurationInput` avec le total (`sumNullable`).
- Si total prévu − budget ≥ 1 min : case en rouge (`over-soft`, texte et contour `over`) et phrase rouge « ▲ 0:30 au-dessus du budget de la semaine ».
- Sinon, si les deux sont saisis : phrase neutre « 2:30 sous le budget de la semaine » ou « pile dans le budget de la semaine ».

**Definition of Done**
- Projet sans saisie affiché « — » et absent du total.
- Phrase absente si le budget de la semaine ou le total prévu vaut `null`.
- Prévu 10:00 pour un budget de 9:30 : case et phrase en rouge avec « ▲ 0:30 ». Prévu 9:00 : aucun rouge.

**Dépendances**
3.2.

---

## Ticket 3.4 — Vue Jour : prévoir des tâches par jour

Type : Front

En tant qu'Adele, je veux ouvrir un jour, ajuster son budget et marquer les tâches que je prévois de travailler, avec ou sans durée, comme ma liste de choses à faire de l'Excel.

**Contexte technique**
Route `/semaine/jour/:day`, ouverte depuis une ligne jour de l'onglet Semaine (3.2). `getDayOverview`, `getDayPlan`, `setDailyBudget`, `planTaskOnDay`, `unplanTaskOnDay`, `setDayPlannedTasks` (3.1). R11, R11b, R12, R26. Proto : vue Jour (`V.jour`) et feuille « Prévoir … » (`SH.planTasks`).

**Référence visuelle (proto)**
- En-tête : bouton retour, titre « Lundi 9 nov. », sous-titre « Semaine du 9 nov. ».
- Clavier des 7 jours (touches blanches `key`, bord bas arrondi) : jour abrégé, numéro, budget en petit ; jour affiché en touche noire (`ebony`) ; point vert sur aujourd'hui. Toucher une touche change de jour sans empiler l'historique.
- Carte : « Budget » + `DurationInput`, « Réel » + valeur, barre réel / budget.
- Libellé « Tâches prévues » : tâches **groupées par projet** (pastille + nom), section en petit, `DurationInput` du temps prévu (« — » par défaut), bouton ✕ pour retirer. Tâche archivée suivie de « (archivée) ».
- Lien « + Prévoir des tâches » : feuille en bas d'écran « Prévoir lun. 9 », tâches actives groupées projet → section avec cases à cocher (cochées = déjà prévues), boutons Annuler / Enregistrer.
- Phrase de constat : « Prévu 2:15 · 0:45 au-dessus du budget ». Si prévu − budget ≥ 1 min : la partie écart en rouge `over` avec « ▲ ». Parties absentes si `null`.
- Aucune tâche : « Aucune tâche prévue ce jour. »

**Definition of Done**
- Prévoir une tâche sans durée : elle figure dans la liste, le total prévu reste « — » si c'est la seule.
- Retirer une tâche la supprime du jour, pas du projet.
- Une tâche archivée après avoir été prévue reste visible ce jour-là, libellé « (archivée) », et n'est pas retirée par la feuille.
- Prévu 2:15 pour un budget de 1:30 : « ▲ 0:45 au-dessus du budget » en rouge.
- Le nombre de tâches affiché sur la ligne du jour (3.2) suit les changements.

**Hors périmètre**
Utilisation des tâches prévues au lancement d'une session (4.2).

**Dépendances**
3.2. Bloque 4.2.
