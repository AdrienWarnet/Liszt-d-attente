# Brief — Adele / Suivi de travail piano

## Contexte
Utilisatrice unique : Adele, pianiste (cours avec Jenifer). Elle planifie son travail de piano sur Excel mais ne mesure pas le temps réellement passé et surestime son temps libre. L'app compare le prévu au réel, sur son téléphone Android, hors ligne. Elle remplace un Excel (un onglet par semaine + un onglet planning multi-semaines). Correspondances Excel : « BUDGET TEMPS » = Budget ; « DEPENSES TEMPS » = Temps réel ; colonne A (« PASSAGES A TEMPO »…) = Section ; « Nom » = Projet ; « Détail » = Tâche ; onglet PLANNING = Planning + bilan multi-semaines. Pas de reprise d'historique.

## Flow métier
1. **Mise en place** : projets, sections, tâches.
2. **Planning** : placement des sections sur des semaines ; le premier placement reste visible (prévu initial), les révisions forment le prévu revu.
3. **Début de semaine** : budget jour par jour ; éventuellement temps prévu (tâche / jour, projet / semaine) ou tâches marquées prévues tel jour.
4. **Au quotidien** : session → choix ou création de tâches → chrono tâche par tâche, pause, navigation libre pendant le chrono → fin de session. Oubli : ajout manuel ou correction d'un chrono.
5. **En continu** : bilan semaine et projet (tableau de bord, R25).
6. **Revue de semaine** (quand elle veut) : archiver, ajouter, mettre à jour l'avancement.

## Règles
**Données**
- R1. Valeur absente = `null`, jamais 0.
- R2. Durées en secondes.
- R3. L'archivage ne supprime rien ; le temps d'une tâche archivée reste dans les bilans.

**Semaine et budget**
- R4. Semaine = lundi 00:00 → dimanche 23:59, heure locale.
- R5. Budget = temps libre estimé pour le piano, une valeur par jour. Budget semaine = somme des jours saisis ; aucun jour saisi → `null`.

**Projets, sections, tâches**
- R6. Projet : nom obligatoire ; dates de début et de fin facultatives (`null`).
- R6b. Suppression de projet après confirmation ; suppression logique : projet, sections, tâches masqués ; le temps reste compté dans le temps réel et les bilans.
- R7. Section : texte libre, rattachée à un projet ; regroupe des tâches ; unité du planning.
- R8. Tâche : texte libre, toujours rattachée à une section ; active / archivée ; réactivable.
- R9. Une tâche active le reste d'une semaine à l'autre. Seule Adele archive.

**Temps prévu**
- R10. Temps prévu projet : par projet et par semaine, facultatif.
- R11. Temps prévu tâche : par tâche et par jour, facultatif.
- R11b. Tâche marquable « prévue » un jour sans durée (durée `null`, marquage vrai).
- R12. **RÈGLE MISE À JOUR (proto validé le 07/11/2026)** — Les dépassements du réel (réel > budget, réel > prévu) restent un constat neutre (couleur `ink`, pas de rouge). **Exception** : un temps prévu supérieur au budget (jour ou semaine) est signalé en rouge (`over`) avec « ▲ » et une phrase (« ▲ 0:30 au-dessus du budget de la semaine »). Ni popup ni blocage. Écart de moins d'une minute = « pile dans le budget ».
  _Ancienne version : dépassements (prévu > budget, réel > budget, réel > prévu) : constat affiché, jamais d'alerte ni de blocage._

**Planning**
- R13. Section placée sur une ou plusieurs semaines. Premier placement = prévu initial (figé) ; modifications = prévu revu. Les deux visibles côte à côte.
- R14. Avancement par section en texte libre ; aucun lien calculé avec le temps.

**Sessions**
- R15. Session = tâches de un ou plusieurs projets, choisies parmi les actives ou créées pendant la session (section obligatoire).
- R16. Une seule tâche chronométrée à la fois ; en démarrer une met en pause la précédente.
- R17. Temps calculé à partir d'horodatages ; le chrono continue en naviguant ou écran verrouillé.
- R18. Session rattachée au jour de démarrage, même après minuit.
- R19. Durée d'un chrono corrigeable après coup.
- R20. Ajout manuel : tâche + jour + durée, sans heures.
- R21. Temps réel = chronos (corrigés) + ajouts manuels, y compris projets supprimés.
- R22. Pas de commentaire de session, pas d'audio.

**Affichage des tâches**
- R26. **RÈGLE AJOUTÉE (proto validé le 07/11/2026)** — Partout où des tâches sont listées (session, prévu aujourd'hui, jour, ajout de tâches), elles sont groupées par projet (pastille de couleur + nom du projet), avec la section en petit au-dessus du libellé de la tâche.

**Bilan**
- R23. Bilan hebdo : budget vs réel (jour, semaine) ; par projet et par tâche : prévu vs réel.
- R24. Bilan projet sur toute sa durée : réel cumulé par section et tâche ; planning (initial, revu, avancement).
- R25. **RÈGLE MISE À JOUR (proto validé le 07/11/2026)** — Le bilan est un **tableau de bord** : chiffres clés, barres et graphiques, détail en dépliant. Calculé en continu.
  _Ancienne version : calcul en continu, récap texte, pas de graphique._

## Priorisation
- MVP : epics 1 à 7, puis démo à Adele après une semaine d'usage réel.
- P2 : epics 8 à 10.
- P3 (pas de ticket) : synchro multi-appareils (Supabase), lecture auto des photos (OCR/IA via serveur).

## Hypothèses non vérifiées
- H1. **HYPOTHÈSE MISE À JOUR (proto validé le 07/11/2026)** — Le format du bilan est celui du proto (`docs/design/proto-piano.html`, onglet Bilan et Bilan du projet), à confirmer avec Adele en démo (ticket 6.1).
  _Ancienne version : format du récap texte du bilan (ticket 6.1)._
- H2. Temps d'un projet supprimé affiché dans le bilan hebdo sous son nom, suffixé « (supprimé) ».
- H3. Adele lancera le chrono à chaque session (observé pendant la démo).
- H4. Une seule session en cours à la fois.
- H5. Volume de photos compatible avec le quota navigateur (epic 9).
- H6. Note de cours : date + texte, projet lié facultatif (epic 10).
