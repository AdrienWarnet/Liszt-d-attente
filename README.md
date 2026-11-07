# Liszt-d-attente

PWA mobile pour suivre le temps de travail au piano : projets, sections et tâches, budget hebdomadaire, sessions chronométrées, planning sur plusieurs semaines et bilan prévu vs réel. Fonctionne hors ligne, données stockées sur le téléphone (IndexedDB). Vite, React, TypeScript, Dexie.

## Prérequis

- Node.js 22 ou plus récent (testé avec Node 24)
- npm (fourni avec Node)

## Installation

```bash
git clone https://github.com/AdrienWarnet/Liszt-d-attente.git
cd Liszt-d-attente
npm install
```

## Commandes

| Commande          | Rôle                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`     | Lance l'app en local. Ouvrir l'URL affichée (`http://localhost:5173/Liszt-d-attente/`). |
| `npm run build`   | Vérifie les types puis construit l'app dans `dist/`.                                    |
| `npm run preview` | Sert le build de `dist/` en local.                                                      |
| `npm run test`    | Lance les tests (Vitest).                                                               |
| `npm run lint`    | Vérifie le code (ESLint).                                                               |
| `npm run format`  | Formate le code (Prettier).                                                             |
| `npm run deploy`  | Vérifie (lint, tests, build) puis publie l'app sur GitHub Pages.                        |

## Déploiement

L'app est publiée sur GitHub Pages depuis la branche `gh-pages`, sans GitHub Actions.

1. Se placer sur `main` à jour, puis lancer `npm run deploy`. Le script s'arrête si le lint, les tests ou le build échouent ; sinon il pousse `dist/` sur `gh-pages`.
2. Réglage unique, après le premier déploiement : dans **Settings → Pages** du repo, **Source** = « Deploy from a branch », **Branch** = `gh-pages`, dossier `/ (root)`.
3. L'app est en ligne à https://adrienwarnet.github.io/Liszt-d-attente/ (une à deux minutes après le déploiement).

## Documentation projet

- `CLAUDE.md` : stack, conventions, modèle de données.
- `docs/brief.md` : règles métier.
- `docs/tickets/` : tickets par epic.
- `docs/suivi.md` : avancement des tickets et décisions.
