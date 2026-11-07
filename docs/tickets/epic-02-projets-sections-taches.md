# Epic 2 — Projets, sections et tâches (MVP)

Objectif : Adele crée et organise ses projets, leurs sections et leurs tâches ; elle archive et réactive ; elle fait sa revue de semaine.

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
- `listProjects()` : projets non supprimés, triés par nom.
- `createSection(projectId, name)` : `order` = dernier + 1, `progress = null`.
- `updateSection(id, { name?, progress? })` : `progress` vide → `null`.
- `reorderSections(projectId, orderedIds)`.
- `createTask(sectionId, label)` : `projectId` recopié depuis la section, `status = 'active'`, `archivedAt = null`. Refus si la section appartient à un projet supprimé.
- `updateTask(id, { label?, sectionId? })` (changer de section dans le même projet uniquement).
- `archiveTask(id)` / `reactivateTask(id)`.
- `listSectionsWithTasks(projectId, { includeArchived })`.
- `listActiveTasksGrouped()` : tâches actives des projets non supprimés, groupées projet → section (utilisé par les sessions et la revue).
- Hooks `useLiveQuery` correspondants dans `src/data/hooks.ts`.

**Definition of Done**
- Tests : création de projet sans dates → `startDate` et `endDate` valent `null` (pas `""`, pas `0`).
- Tests : un projet supprimé disparaît de `listProjects()` et `listActiveTasksGrouped()`, mais ses tâches existent toujours en base.
- Tests : une tâche archivée n'apparaît plus dans les tâches actives et revient après `reactivateTask`.
- Tests : `createTask` sur une section inexistante ou d'un projet supprimé lève une erreur.

**Hors périmètre**
Suppression de section ou de tâche (non demandée au cadrage : à valider avec Adele si le besoin apparaît). Écrans (2.2 à 2.6).

**Dépendances**
1.4. Bloque 2.2 à 2.6, 3.1, 4.1, 5.1.

---

## Ticket 2.2 — Écran liste des projets et création / édition d'un projet

Type : Front

En tant qu'Adele, je veux voir mes projets et en créer, afin d'y ranger mon travail.

**Contexte technique**
Onglet **Projets** (`/projets`). Fonctions de 2.1. Libellés glossaire : Projet, Date de début, Date de fin.

**Référence visuelle**
- Liste de cartes : nom du projet, dates si renseignées (« depuis le 3 nov. », « jusqu'au 20 déc. »), nombre de tâches actives.
- Bouton flottant « + Nouveau projet ».
- Formulaire (feuille plein écran) : Nom (obligatoire), Date de début (facultative), Date de fin (facultative), boutons Annuler / Enregistrer.
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
1.5, 2.1.

---

## Ticket 2.3 — Écran détail d'un projet : sections, tâches, avancement

Type : Front

En tant qu'Adele, je veux organiser un projet en sections et tâches, afin de découper mon morceau comme dans mon Excel.

**Contexte technique**
Route `/projets/:id`. Fonctions de 2.1. Une tâche est toujours dans une section ; s'il n'y a aucune section, proposer d'en créer une avant d'ajouter une tâche.

**Référence visuelle**
- En-tête : nom du projet, dates, bouton « Modifier », menu « … » (Supprimer, ticket 2.4 ; Planning, ticket 5.2 ; Bilan du projet, ticket 6.5).
- Une carte par section, dans l'ordre : nom, champ **Avancement** (texte libre, placeholder « Où en est cette section ? »), liste des tâches actives, lien « + Ajouter une tâche » (champ inline, Entrée pour valider, reste ouvert pour enchaîner).
- Bouton « + Nouvelle section » en bas.
- Réordonner les sections : boutons monter / descendre (pas de glisser-déposer au MVP).
- Taper une tâche ouvre l'édition inline (libellé, déplacement vers une autre section du projet).

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

**Référence visuelle**
Fenêtre de confirmation : titre « Supprimer « {nom} » ? », texte « Le projet, ses sections et ses tâches disparaîtront de tes listes. Le temps déjà passé reste compté dans tes bilans. », boutons « Annuler » (par défaut) et « Supprimer ».

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

**Référence visuelle**
- Dans le détail projet (2.3), chaque tâche a une action « Archiver » (menu ou balayage).
- Après archivage : message bref « Tâche archivée » avec bouton « Annuler » (5 s).
- En bas de chaque section : lien repliable « Tâches archivées (n) » listant les tâches archivées en gris, chacune avec « Réactiver ». Lien masqué si n = 0.

**Definition of Done**
- Archiver puis « Annuler » restaure la tâche active.
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

**Référence visuelle**
- Liste groupée Projet → Section ; pour chaque section : champ Avancement éditable, tâches actives avec une case « Archiver » à cocher, « + Ajouter une tâche ».
- Bouton fixe en bas « Archiver la sélection (n) », désactivé si n = 0.
- Optionnel pour l'aide à la décision : à côté de chaque tâche, son temps réel de la semaine en cours si la fonction existe (6.2) ; sinon rien.

**Definition of Done**
- Cocher 3 tâches et valider les archive toutes les 3 en une transaction.
- Une tâche ajoutée ici apparaît dans le détail du projet.
- Les modifications d'avancement sont visibles dans le détail du projet.

**Hors périmètre**
Saisie du budget de la semaine suivante (3.2).

**Dépendances**
2.5.
