# Epic 3 — Semaine et temps prévu (MVP)

Objectif : Adele saisit son budget jour par jour, son temps prévu par projet / semaine et par tâche / jour, et marque des tâches comme prévues tel jour.

---

## Ticket 3.1 — Fonctions de données budget et temps prévu

Type : Donnée

En tant que développeur, je veux les opérations et agrégats de budget et de temps prévu, afin que l'écran Semaine et le bilan s'appuient sur les mêmes calculs.

**Contexte technique**
R1, R4, R5, R10, R11, R11b, R12. Tables `dailyBudgets`, `projectWeekPlans`, `taskDayPlans`. Jours `YYYY-MM-DD`, semaine = `weekStart` du lundi (utilitaires 1.4).

**À faire**
- `setDailyBudget(day, durationSec | null)` : `null` → supprimer la ligne (budget non saisi).
- `getWeekBudget(weekStart)` → `{ days: { day, durationSec: number|null }[7], total: number|null }` (total via `sumNullable`).
- `setProjectWeekPlan(projectId, weekStart, durationSec | null)` ; `null` → ligne supprimée.
- `planTaskOnDay(taskId, day, durationSec | null)` : crée ou met à jour la ligne (marquage = ligne présente, durée facultative).
- `unplanTaskOnDay(taskId, day)` : supprime la ligne.
- `getDayPlan(day)` → tâches prévues ce jour (tâche, section, projet, durée `null` possible), y compris tâches archivées ou de projet supprimé (affichées comme telles par le front).
- `getWeekPlan(weekStart)` → par jour : budget, total prévu tâches (`sumNullable`), écart prévu − budget (`null` si l'un des deux est `null`) ; par projet : temps prévu projet de la semaine.
- Hooks `useLiveQuery`.

**Definition of Done**
- Tests : semaine sans aucune saisie → `total = null` et chaque jour `null`.
- Tests : une tâche marquée prévue sans durée compte dans la liste du jour mais pas dans le total prévu ; si c'est la seule, total prévu = `null`.
- Tests : écart prévu − budget = `null` si le budget du jour n'est pas saisi.
- Tests : `setDailyBudget(day, 0)` enregistre bien 0 (0 saisi ≠ non saisi).

**Hors périmètre**
Temps réel (4.1), bilan (6.2).

**Dépendances**
1.4, 2.1. Bloque 3.2, 3.3, 3.4, 6.2.

---

## Ticket 3.2 — Écran Semaine : navigation et budget par jour

Type : Front

En tant qu'Adele, je veux saisir en début de semaine le temps libre que j'estime avoir chaque jour pour le piano.

**Contexte technique**
Onglet **Semaine** (`/semaine`, paramètre facultatif `?w=YYYY-MM-DD`). Fonctions 3.1. Libellé : **Budget**. Saisie `h:mm` via `parseDuration` ; champ vidé = non saisi (`null`), affiché « — ».

**Référence visuelle**
- En-tête : « ‹ Semaine du 9 nov. › » (flèches semaine précédente / suivante), lien « Aujourd'hui » si on n'est pas sur la semaine courante.
- 7 lignes, une par jour (« lun. 9 », jour courant mis en évidence) : colonne **Budget** éditable (champ numérique `h:mm`, clavier numérique).
- Ligne total : « Budget de la semaine : 9:30 » ou « — ».
- Lien « Revue de semaine » vers `/revue` (2.6).
- Composant réutilisable `DurationInput` (valeur `number|null`, affiche `h:mm`, accepte « 45 », « 1:30 », « 1h30 »).

**Definition of Done**
- Saisir « 1:30 » lundi → total « 1:30 » ; vider le champ → total « — ».
- Saisir « 0 » enregistre 0:00 (distinct de « — »).
- Navigation sur 3 semaines en arrière et retour : chaque semaine garde ses valeurs.

**Hors périmètre**
Temps prévu (3.3, 3.4). Temps réel et comparaison (6.4).

**Dépendances**
1.5, 3.1. Bloque 3.3, 3.4.

---

## Ticket 3.3 — Saisir le temps prévu par projet pour la semaine

Type : Front

En tant qu'Adele, je veux indiquer combien de temps je prévois sur chaque projet cette semaine, si je le souhaite.

**Contexte technique**
Écran Semaine (3.2), section sous les jours. `setProjectWeekPlan` (3.1). Facultatif (R10). Libellé : **Temps prévu**.

**Référence visuelle**
- Bloc « Temps prévu par projet » : une ligne par projet non supprimé, `DurationInput` vide par défaut (« — »).
- Ligne « Total prévu projets » (`sumNullable`) et, si le budget de la semaine est saisi, constat neutre : « 1:00 au-dessus du budget » ou « 2:30 sous le budget ». Aucun rouge, aucune alerte (R12).

**Definition of Done**
- Projet sans saisie affiché « — » et absent du total.
- Constat absent si le budget semaine ou le total prévu vaut `null`.

**Dépendances**
3.2.

---

## Ticket 3.4 — Prévoir des tâches par jour

Type : Front

En tant qu'Adele, je veux marquer les tâches que je prévois de travailler tel jour, avec ou sans durée, comme ma liste de choses à faire de l'Excel.

**Contexte technique**
Écran Semaine (3.2) : taper un jour ouvre `/semaine/jour/:day`. `planTaskOnDay`, `unplanTaskOnDay`, `getDayPlan`, `getWeekPlan` (3.1). R11, R11b, R12.

**Référence visuelle**
- Écran jour : titre « Mardi 10 nov. », budget du jour (éditable), liste des tâches prévues (projet › section › tâche, durée éditable « — » par défaut, bouton retirer).
- Bouton « + Prévoir des tâches » : sélecteur des tâches actives groupées projet → section, cases à cocher multiples.
- Ligne de constat : « Prévu 2:15 · Budget 1:30 · 0:45 au-dessus du budget » ; parties absentes si `null`.
- Dans l'écran Semaine, chaque jour affiche à droite le nombre de tâches prévues et le total prévu (ex. « 3 tâches · 1:15 »).

**Definition of Done**
- Prévoir une tâche sans durée : elle figure dans la liste, le total prévu reste « — » si c'est la seule.
- Retirer une tâche la supprime du jour, pas du projet.
- Une tâche archivée après avoir été prévue reste visible ce jour-là, libellé « (archivée) ».

**Hors périmètre**
Utilisation des tâches prévues au lancement d'une session (4.2).

**Dépendances**
3.2. Bloque 4.2.
