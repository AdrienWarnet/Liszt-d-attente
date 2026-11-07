# Epic 2 — Projets, sections et tâches (MVP)

Objectif : Adele crée et organise ses projets, leurs sections et leurs tâches ; elle archive et réactive ; elle fait sa revue de semaine.

_Révisé le 07/11/2026 d'après le proto validé (`docs/design/proto-piano.html`, onglet Projets, détail projet, Revue de semaine). Ajouts au proto validés par le PO : modifier un projet, modifier le libellé d'une tâche. Abandonnés : réordonner les sections, déplacer une tâche, « Annuler » après archivage._

---

## Ticket 2.1 — Fonctions de données projets, sections, tâches

Type : Donnée

En tant que développeur, je veux toutes les opérations sur projets, sections et tâches dans `src/data/`, afin que les écrans n'implémentent aucune règle.

**Contexte technique**
Règles R1, R3, R6, R6b, R7, R8, R9 (`docs/brief.md`). Tables `projects`, `sections`, `tasks`. Suppression **logique** : `deletedAt` renseigné, rien n'est effacé, le temps reste compté.

**À faire**
`src/data/projects.ts` (ou découpage équivalent) :
- `createProject({ name, startDate?, endDate? })` : nom obligatoire (trim, non vide) ; dates absentes → `null` ; erreur si `endDate < startDate` quand les deux sont renseignées.
- `updateProject(id, patch)` (mêmes validations).
- `deleteProject(id)` : `deletedAt = Date.now()` ; sections et tâches inchangées (masquées par filtre).
- `listProjects()` : projets non supprimés, triés par date de création.
- `getProjectColor(projectId)` / champ `color` dans chaque projet renvoyé : `c0` à `c5` selon le rang de création parmi **tous** les projets (supprimés compris), modulo 6 ; ne change jamais quand un projet est supprimé ou que l'ordre d'affichage change.
- `createSection(projectId, name)` : `order` = dernier + 1, `progress = null`.
- `updateSection(id, { name?, progress? })` : `progress` vide → `null`.
- `createTask(sectionId, label)` : `projectId` recopié depuis la section, `status = 'active'`, `archivedAt = null`. Refus si la section appartient à un projet supprimé.
- `updateTask(id, { label })` (libellé obligatoire, trim, non vide).
- `archiveTask(id)` / `reactivateTask(id)`.
- `listSectionsWithTasks(projectId, { includeArchived })`.
- `listActiveTasksGrouped()` : tâches actives des projets non supprimés, groupées projet (avec couleur) → section (utilisé par les sessions, la vue Jour, l'ajout manuel et la revue).
- Hooks `useLiveQuery` correspondants dans `src/data/hooks.ts`.

**Definition of Done**
- Tests : création de projet sans dates → `startDate` et `endDate` valent `null` (pas `""`, pas `0`).
- Tests : un projet supprimé disparaît de `listProjects()` et `listActiveTasksGrouped()`, mais ses tâches existent toujours en base.
- Tests : une tâche archivée n'apparaît plus dans les tâches actives et revient après `reactivateTask`.
- Tests : `createTask` sur une section inexistante ou d'un projet supprimé lève une erreur.
- Tests : projets créés dans l'ordre A à G → `c0` à `c5` puis `c0` pour G ; supprimer A ne change pas les couleurs des autres.

**Hors périmètre**
Suppression de section ou de tâche (non demandée au cadrage : à valider avec Adele si le besoin apparaît). Écrans (2.2 à 2.6).

**Dépendances**
1.4. Bloque 2.2 à 2.6, 3.1, 4.1, 5.1.

---

## Ticket 2.2 — Écran liste des projets et création / édition d'un projet

Type : Front

En tant qu'Adele, je veux voir mes projets et en créer, afin d'y ranger mon travail.

**Contexte technique**
Onglet **Projets** (`/projets`). Fonctions de 2.1. Libellés glossaire : Projet, Date de début, Date de fin. Proto : écran Projets (`V.projets`), feuille `SH.newProject`.

**Référence visuelle (proto)**
- Liste de cartes (bordure `line`, coins 16 px) : nom du projet en gras, en petit « depuis le 3 nov. · jusqu'au 20 déc. · 4 tâches actives » (dates seulement si renseignées).
- Sous la liste, bouton pointillé « + Nouveau projet ».
- Formulaire en **feuille en bas d'écran** « Nouveau projet » : Nom (placeholder « Un morceau, le déchiffrage… »), Date de début (facultative), Date de fin (facultative), boutons Annuler / Enregistrer. Après enregistrement, ouverture du détail du projet créé.
- Erreurs sous les champs : « Donne un nom au projet. », « La date de fin doit être après la date de début. »
- État vide : « Aucun projet. Crée ton premier projet (un morceau, le déchiffrage…). »

**À faire**
- Liste, création, édition (bouton « Modifier » dans le détail, ticket 2.3).
- Champ date vidé → `null` envoyé à la couche donnée.
- Erreur affichée sous le champ si nom vide ou fin avant début.

**Definition of Done**
- Créer un projet sans date : la carte n'affiche aucune date, aucun « 01/01/1970 ».
- Le bouton Enregistrer est désactivé tant que le nom est vide.
- Taper sur une carte ouvre `/projets/:id`.

**Hors périmètre**
Détail du projet (2.3), suppression (2.4).

**Dépendances**
1.5, 2.1, lot 1.

---

## Ticket 2.3 — Écran détail d'un projet : sections, tâches, avancement

Type : Front

En tant qu'Adele, je veux organiser un projet en sections et tâches, afin de découper mon morceau comme dans mon Excel.

**Contexte technique**
Route `/projets/:id`. Fonctions de 2.1. Une tâche est toujours dans une section ; s'il n'y a aucune section, proposer d'en créer une avant d'ajouter une tâche. Proto : détail projet (`V.projet`).

**Référence visuelle (proto)**
- En-tête : bouton retour, titre = nom du projet, sous-titre « Depuis le 3 nov. · jusqu'au 20 déc. » ou « Sans date de début ».
- Puces : « Modifier » (rouvre la feuille de 2.2 préremplie, ajout au proto validé), « Planning » (5.2), « Bilan du projet » (6.5), « Supprimer » (2.4, texte et contour rouge brique `danger`).
- Une carte par section, dans l'ordre : nom en gras, champ **Avancement** (zone de texte, placeholder « Avancement : où en est cette section ? »), tâches actives (une ligne chacune, action « Archiver » à droite, 2.5), champ « + Ajouter une tâche » (Entrée pour valider, reste ouvert pour enchaîner).
- Champ « + Nouvelle section » en bas (Entrée pour valider).
- Taper le libellé d'une tâche permet de le modifier sur place (Entrée ou sortie du champ pour valider ; vide = annulé). Ajout au proto validé.

**À faire**
- Avancement enregistré à la sortie du champ ; vidé → `null`.
- Ajout rapide de plusieurs tâches à la suite.

**Definition of Done**
- Créer 2 sections et 3 tâches, recharger : tout est conservé dans le même ordre.
- Vider l'avancement d'une section l'enregistre à `null` (vérifiable dans DevTools > IndexedDB).
- Impossible de créer une tâche hors section.

**Hors périmètre**
Archivage (2.5), revue (2.6), temps prévu (3.4).

**Dépendances**
2.2.

---

## Ticket 2.4 — Supprimer un projet avec confirmation

Type : Front

En tant qu'Adele, je veux supprimer un projet que je n'utilise plus, sans perdre le temps que j'y ai passé.

**Contexte technique**
`deleteProject` (2.1), suppression logique (R6b). Le temps reste dans les bilans.

**Référence visuelle (proto, feuille `SH.delProject`)**
Feuille en bas d'écran : titre « Supprimer « {nom} » ? », texte « Le projet, ses sections et ses tâches disparaîtront de tes listes. Le temps déjà passé reste compté dans tes bilans. », boutons « Annuler » et « Supprimer ». Après suppression : retour à `/projets`, message bref « Projet supprimé ».

**Definition of Done**
- Annuler ne change rien.
- Supprimer ramène à `/projets` ; le projet n'y figure plus.
- Le projet existe toujours en base avec `deletedAt` renseigné.

**Hors périmètre**
Restauration d'un projet supprimé (non demandée). Affichage dans le bilan (6.4, hypothèse H2).

**Dépendances**
2.3.

---

## Ticket 2.5 — Archiver et réactiver des tâches

Type : Front

En tant qu'Adele, je veux retirer une tâche de mes listes quand je n'y travaille plus, et la récupérer si besoin.

**Contexte technique**
`archiveTask`, `reactivateTask` (2.1). R3 : l'historique de temps reste dans les bilans. Libellés : « Archiver », « Réactiver », « Tâches archivées ».

**Référence visuelle (proto, détail projet)**
- Dans le détail projet (2.3), chaque tâche a un petit bouton texte « Archiver » à droite.
- Après archivage : message bref « Tâche archivée ».
- En bas de chaque section : bloc repliable « Tâches archivées (n) » listant les tâches archivées en gris barré, chacune avec « Réactiver » (vert) → message « Tâche réactivée ». Bloc masqué si n = 0.

**Definition of Done**
- Archiver une tâche la retire de la liste active et l'ajoute aux « Tâches archivées ».
- Une tâche réactivée reprend sa place dans sa section.
- Le compteur « Tâches archivées (n) » est juste.

**Hors périmètre**
Archivage en série (2.6).

**Dépendances**
2.3.

---

## Ticket 2.6 — Écran Revue de semaine

Type : Front

En tant qu'Adele, je veux un écran qui rassemble toutes mes tâches actives, afin de faire ma revue quand je veux : archiver, ajouter, mettre à jour l'avancement.

**Contexte technique**
Route `/revue`, accessible depuis l'écran Semaine (lien « Revue de semaine », ticket 3.2) et depuis Projets. `listActiveTasksGrouped`, `archiveTask`, `createTask`, `updateSection` (2.1). Aucune obligation de passage, aucun rappel.

**Référence visuelle (proto, `V.revue`)**
- En-tête : bouton retour, « Revue de semaine », sous-titre « Archive, ajoute, mets à jour l'avancement ».
- Liste groupée Projet → Section ; pour chaque section : nom en petit, zone Avancement éditable, tâches actives avec une case à cocher (pour archiver) et, à droite, leur temps réel de la semaine en cours (`getRealTime`, 4.1 ; « — » si aucun), champ « + Ajouter une tâche ».
- Phrase : « À droite : temps réel de la semaine. »
- Bouton principal « Archiver la sélection (n) », désactivé si n = 0 → message « 3 tâches archivées ».

**Definition of Done**
- Cocher 3 tâches et valider les archive toutes les 3 en une transaction.
- Une tâche ajoutée ici apparaît dans le détail du projet.
- Les modifications d'avancement sont visibles dans le détail du projet.

**Hors périmètre**
Saisie du budget de la semaine suivante (3.2).

**Dépendances**
2.5, 4.1 (temps réel de la semaine).
