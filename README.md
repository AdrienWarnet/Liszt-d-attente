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

## Documentation projet

- `CLAUDE.md` : stack, conventions, modèle de données.
- `docs/brief.md` : règles métier.
- `docs/tickets/` : tickets par epic.
- `docs/suivi.md` : avancement des tickets et décisions.
