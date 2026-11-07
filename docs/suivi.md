# Suivi — Adele / Suivi de travail piano

Statuts : `À faire` · `En cours` · `Bloqué` · `Fait`. Seul le PO passe un ticket en `Fait`.
Qui : PO · CC (Claude Code) · Adele

Ordre conseillé : 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6, puis 2.1 → 2.6, 3.1 → 3.4, 4.1 → 4.6, 5.1 → 5.2, 6.2 → 6.5 (6.1 en parallèle), 7.1 → 7.3.

## Epic 1 — Socle PWA (MVP)
| # | Ticket | Type | Qui | Dépend de | Statut |
|---|---|---|---|---|---|
| 1.1 | Initialiser le projet et l'outillage | Technique | CC | — | Fait |
| 1.2 | App installable et hors ligne | Technique | CC | 1.1 | Fait |
| 1.3 | Déploiement GitHub Pages | Technique | CC + PO | 1.2 | À faire |
| 1.4 | Base de données et utilitaires date / durée | Donnée | CC | 1.1 | À faire |
| 1.5 | Navigation et mise en page mobile | Front | CC | 1.1 | À faire |
| 1.6 | Valider l'installation sur le téléphone d'Adele | Décision | PO + Adele | 1.3 | À faire |

## Epic 2 — Projets, sections et tâches (MVP)
| # | Ticket | Type | Qui | Dépend de | Statut |
|---|---|---|---|---|---|
| 2.1 | Fonctions données projets / sections / tâches | Donnée | CC | 1.4 | À faire |
| 2.2 | Liste et création / édition de projet | Front | CC | 1.5, 2.1 | À faire |
| 2.3 | Détail projet : sections, tâches, avancement | Front | CC | 2.2 | À faire |
| 2.4 | Supprimer un projet avec confirmation | Front | CC | 2.3 | À faire |
| 2.5 | Archiver et réactiver des tâches | Front | CC | 2.3 | À faire |
| 2.6 | Revue de semaine | Front | CC | 2.5 | À faire |

## Epic 3 — Semaine et temps prévu (MVP)
| # | Ticket | Type | Qui | Dépend de | Statut |
|---|---|---|---|---|---|
| 3.1 | Fonctions données budget et temps prévu | Donnée | CC | 1.4, 2.1 | À faire |
| 3.2 | Écran Semaine : budget par jour | Front | CC | 1.5, 3.1 | À faire |
| 3.3 | Temps prévu par projet / semaine | Front | CC | 3.2 | À faire |
| 3.4 | Prévoir des tâches par jour | Front | CC | 3.2 | À faire |

## Epic 4 — Sessions (MVP)
| # | Ticket | Type | Qui | Dépend de | Statut |
|---|---|---|---|---|---|
| 4.1 | Moteur de session et de chrono | Donnée | CC | 1.4, 2.1 | À faire |
| 4.2 | Démarrer une session, choisir ses tâches | Front | CC | 3.4, 4.1 | À faire |
| 4.3 | Session en cours : chronos, pause, fin | Front | CC | 4.2 | À faire |
| 4.4 | Bandeau de chrono global | Front | CC | 4.3 | À faire |
| 4.5 | Historique et correction d'un chrono | Front | CC | 4.3 | À faire |
| 4.6 | Ajout manuel d'une durée | Front | CC | 4.1, 1.5 | À faire |

## Epic 5 — Planning macro (MVP)
| # | Ticket | Type | Qui | Dépend de | Statut |
|---|---|---|---|---|---|
| 5.1 | Fonctions données du planning | Donnée | CC | 1.4, 2.1 | À faire |
| 5.2 | Écran Planning d'un projet | Front | CC | 2.3, 5.1 | À faire |

## Epic 6 — Bilan (MVP)
| # | Ticket | Type | Qui | Dépend de | Statut |
|---|---|---|---|---|---|
| 6.1 | Valider le format du récap avec Adele | Décision | PO + Adele | — | À faire |
| 6.2 | Calculs du bilan hebdo | Donnée | CC | 3.1, 4.1, 5.1 | À faire |
| 6.3 | Calculs du bilan projet | Donnée | CC | 4.1, 5.1 | À faire |
| 6.4 | Écran Bilan hebdo | Front | CC | 6.2 | À faire |
| 6.5 | Écran Bilan d'un projet | Front | CC | 6.3, 2.3 | À faire |

## Epic 7 — Sauvegarde (MVP)
| # | Ticket | Type | Qui | Dépend de | Statut |
|---|---|---|---|---|---|
| 7.1 | Export et import JSON | Donnée | CC | 1.4 (+ tables v1) | À faire |
| 7.2 | Écran Sauvegarde | Front | CC | 7.1 | À faire |
| 7.3 | Checklist fin MVP et démo Adele | Décision | PO + Adele | Epics 1–7 | À faire |

## Epics P2 (après démo MVP)
| # | Ticket | Type | Qui | Dépend de | Statut |
|---|---|---|---|---|---|
| 8.1 | Mode concentration | Front | CC | 4.3 | À faire |
| 8.2 | Rappel Ne pas déranger | Front | CC | 4.2, 8.1 | À faire |
| 9.1 | Exemples de photos et volume | Décision | PO + Adele | — | À faire |
| 9.2 | Fonctions données photos (schéma v2) | Donnée | CC | 9.1, 7.1 | À faire |
| 9.3 | Prendre et consulter les photos | Front | CC | 9.2, 2.3 | À faire |
| 10.1 | Valider le besoin notes de cours | Décision | PO + Adele | — | À faire |
| 10.2 | Fonctions données notes de cours | Donnée | CC | 10.1, 7.1 | À faire |
| 10.3 | Écran Notes de cours | Front | CC | 10.2, 2.3 | À faire |

## Lots après MVP
| Lot | Branche | Contenu | Qui | Statut | Non commité |
|---|---|---|---|---|---|

## Hypothèses à vérifier
| # | Hypothèse | Quand | Résultat |
|---|---|---|---|
| H1 | Format du récap du bilan | 6.1 | [ ] |
| H2 | Projet supprimé affiché « (supprimé) » dans le bilan | 6.1 | [ ] |
| H3 | Adele lance le chrono à chaque session | 7.3 | [ ] |
| H4 | Une seule session en cours à la fois | 7.3 | [ ] |
| H5 | Volume photos compatible avec le quota | 9.1 | [ ] |
| H6 | Note de cours = date + texte + projet facultatif | 10.1 | [ ] |
| — | Libellés provisoires du glossaire | 7.3 | [ ] |

## Décisions
| Date | Quoi | Pourquoi | Impact |
|---|---|---|---|
| 06/11/2026 | PWA Vite + React + TS, Dexie, GitHub Pages | Mobile, hors ligne, sans serveur | Socle |
| 06/11/2026 | Synchro et lecture auto des photos hors MVP (P3) | Nécessitent un serveur | Pas de back |
| 06/11/2026 | Export / import JSON au MVP | Parade à la perte des données navigateur | Epic 7 |
| 07/11/2026 | Budget = temps libre par jour ; Temps prévu tâche / jour et projet / semaine, facultatifs | Vocabulaire de l'Excel | Epics 3, 6 |
| 07/11/2026 | Section = groupe de tâches + unité du planning | Excel | Epics 2, 5 |
| 07/11/2026 | Prévu initial figé + prévu revu | Excel PLANNING | Epic 5 |
| 07/11/2026 | Dépassement = constat, pas d'alerte | Cadrage | Epics 3, 6 |
| 07/11/2026 | Session rattachée au jour de démarrage ; chrono corrigeable | Cadrage | Epic 4 |
| 07/11/2026 | Suppression de projet logique, temps conservé | Cadrage | Epics 2, 6 |
| 07/11/2026 | Durées en secondes ; Vitest ; ESLint + Prettier ; Conventional Commits ; HashRouter | Choix PO | Tous |
| 07/11/2026 | Libellés provisoires centralisés dans `src/labels.ts` | À valider avec Adele | Tous les écrans |
| 07/11/2026 | Format du bilan proposé, à valider (H1) | Point flou du cadrage | Epic 6 |
| 07/11/2026 | Pas de suppression de section / tâche au MVP (archivage seulement) | Non demandé au cadrage | Epic 2, à revoir en démo |
| 07/11/2026 | TypeScript 6.0 (pas 7.0) ; ESLint au lieu d'oxlint du template Vite | typescript-eslint ne supporte pas TS 7 ; stack figée = ESLint | Outillage |
| 07/11/2026 | Workflow Git : branche par epic puis par ticket, squash ticket → epic, `--no-ff` epic → `main`, pas de PR | Choix PO | Tous |
| 07/11/2026 | Icône clavier blanc sur indigo #3730a3 (= couleur de thème) ; mise à jour PWA au prochain lancement, sans rechargement forcé | Pas de logo existant ; ne pas couper un chrono | Epic 1, epic 4 |
