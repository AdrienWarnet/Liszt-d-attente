# Epic 5 — Planning macro (MVP)

Objectif : Adele place les sections d'un projet sur des semaines, garde son prévu initial à côté du prévu revu, et suit l'avancement en texte.

---

## Ticket 5.1 — Fonctions de données du planning

Type : Donnée

En tant que développeur, je veux la logique de placement initial / revu des sections, afin que le prévu initial ne puisse jamais être modifié par erreur.

**Contexte technique**
R13, R14. Table `sectionPlacements` (`kind: 'initial' | 'revised'`, une ligne par semaine). Avancement = `sections.progress` (2.1).

**À faire**
- `setSectionWeeks(sectionId, weekStarts: string[])` en transaction :
  - si la section n'a **aucune** ligne `initial` et que `weekStarts` n'est pas vide : créer les lignes `initial` **et** `revised` avec ces semaines ;
  - sinon : remplacer uniquement les lignes `revised` (les lignes `initial` ne sont jamais modifiées ni supprimées).
- `getProjectPlanning(projectId)` → par section (ordre) : `initialWeeks: string[]`, `revisedWeeks: string[]`, `progress: string|null`, `changed: boolean` (initial ≠ revu), et la plage de semaines à afficher : du plus petit au plus grand `weekStart` parmi placements, `startDate` et `endDate` du projet ; si rien : semaine courante + 7 semaines.
- `getWeekPlanningAllProjects(weekStart)` → sections (revu) placées sur cette semaine, tous projets non supprimés (utilisé par le bilan, 6.2).

**Definition of Done**
- Tests : premier placement sur S1, S2 → initial = revu = [S1, S2].
- Tests : nouveau placement [S2, S3] → initial reste [S1, S2], revu = [S2, S3], `changed = true`.
- Tests : placement vidé (`[]`) après un initial → revu vide, initial conservé.
- Tests : section jamais placée → `initialWeeks = []`, `revisedWeeks = []`, `progress = null`.

**Dépendances**
1.4, 2.1. Bloque 5.2, 6.3.

---

## Ticket 5.2 — Écran Planning d'un projet

Type : Front

En tant qu'Adele, je veux voir et ajuster sur quelles semaines je travaille chaque section de mon morceau, en gardant sous les yeux ce que j'avais prévu au départ.

**Contexte technique**
Route `/projets/:id/planning`, accessible depuis le détail projet (2.3). Fonctions 5.1 et `updateSection` (avancement). Libellés provisoires : **Planning**, **Prévu initial**, **Prévu revu** ; libellé **Avancement**. Remplace l'onglet PLANNING de l'Excel.

**Référence visuelle (proto, `V.planning`)**
- En-tête : bouton retour, « Planning », sous-titre = nom du projet.
- Légende : « Prévu initial » (pastille `line`), « Prévu revu » (pastille `felt`).
- Grille défilant horizontalement : colonnes = semaines (« 9 nov », semaine courante en vert) ; lignes = sections (nom figé à gauche, tronqué avec « … »).
- Chaque section placée occupe deux mini-lignes : « initial » (cases grises, non modifiables) et « revu » (cases vertes, taper une case ajoute / retire la semaine).
- Section jamais placée : une seule ligne « à placer » ; taper une case crée le prévu initial (message bref « Premier placement gardé comme prévu initial »).
- Phrase sous la grille : « Touche une case pour placer ou retirer une semaine. Le premier placement d'une section est gardé comme prévu initial. »
- Libellé « Avancement » puis, pour chaque section : nom + étiquette « modifié » si le revu diffère de l'initial, zone de texte « Où en est cette section ? ».
- Le proto dessine des cases de 46 × 28 px : garder ce dessin mais une zone tactile ≥ 44 px (règle `CLAUDE.md`).

**Definition of Done**
- Placer une section sur 2 semaines, recharger : prévu initial et revu affichent les 2 semaines.
- Décaler la section d'une semaine : l'initial ne bouge pas, le revu change, l'indicateur « modifié » apparaît.
- Les cases du prévu initial ne réagissent pas au toucher.

**Hors périmètre**
Vue planning tous projets confondus (non demandée ; le bilan hebdo liste les sections de la semaine, 6.4).

**Dépendances**
2.3, 5.1.
