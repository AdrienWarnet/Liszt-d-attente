# Epic 7 — Sauvegarde (MVP)

Objectif : Adele ne perd jamais ses données : elle exporte un fichier de sauvegarde et peut le réimporter (même téléphone ou nouveau téléphone).

---

## Ticket 7.1 — Export et import JSON des données

Type : Donnée

En tant que développeur, je veux un export complet et un import sûr de toute la base, afin de restaurer les données d'Adele à l'identique.

**Contexte technique**
Toutes les tables v1 (`CLAUDE.md`), table `meta` comprise sauf `lastExportAt` qui est recalculé. Les `null` doivent rester `null` après aller-retour.

**À faire**
- `exportData()` → objet `{ app: 'piano', schemaVersion: 1, exportedAt: <ms>, tables: { projects: [...], ... } }` ; met à jour `meta.lastExportAt`.
- `validateImport(json)` → `{ ok: true, counts } | { ok: false, error }` : vérifie `app`, `schemaVersion` (≤ version courante), présence et type (tableau) de chaque table, champs obligatoires.
- `importData(json)` : en une seule transaction, **remplace** tout le contenu (vide puis insère) ; en cas d'erreur, rien n'est modifié.
- Si une session est en cours au moment de l'export, elle est exportée telle quelle (segment ouvert inclus).
- `getLastExportAt()` → ms ou `null`.

**Definition of Done**
- Test aller-retour : base remplie (dont valeurs `null`, tâche archivée, projet supprimé, correction, ajout manuel) → export → base vidée → import → contenu identique (comparaison profonde).
- Test : fichier d'une autre app ou `schemaVersion` supérieure → refus, base inchangée.
- Test : erreur au milieu de l'import → base inchangée.

**Hors périmètre**
Photos (epic 9 : le format évoluera en `schemaVersion: 2`). Fusion de deux bases (non prévue : l'import remplace).

**Dépendances**
1.4 et toutes les tables v1 (2.1, 3.1, 4.1, 5.1 terminés de préférence). Bloque 7.2.

---

## Ticket 7.2 — Écran Sauvegarde

Type : Front

En tant qu'Adele, je veux enregistrer une sauvegarde sur mon téléphone (ou me l'envoyer) et la restaurer si besoin.

**Contexte technique**
Route `/plus/sauvegarde` (1.5). Fonctions 7.1. Export : fichier `piano-sauvegarde-YYYY-MM-DD.json` ; utiliser `navigator.share({ files })` si disponible (envoi par mail, Drive…), sinon téléchargement. Import : `<input type="file" accept="application/json">`.

**Référence visuelle**
- Texte : « Tes données sont uniquement sur ce téléphone. Fais une sauvegarde régulièrement et garde le fichier ailleurs (mail, Drive). »
- « Dernière sauvegarde : il y a 3 jours » ou « Jamais ».
- Bouton « Exporter une sauvegarde ».
- Bouton secondaire « Restaurer une sauvegarde » → choix du fichier → résumé (« 4 projets, 37 tâches, 21 sessions — exporté le 9 nov. ») → confirmation « Ceci remplace toutes les données actuelles de l'app. » → « Restaurer ».
- Erreur lisible si le fichier est invalide : « Ce fichier n'est pas une sauvegarde de l'app Piano. »
- Rappel discret dans l'onglet Plus (pastille) si aucune sauvegarde depuis plus de 7 jours.

**Definition of Done**
- Sur Chrome Android, « Exporter » ouvre la feuille de partage ou télécharge le fichier.
- Restaurer un export sur un navigateur vierge redonne toutes les données.
- Annuler à l'étape de confirmation ne modifie rien.

**Dépendances**
7.1, 1.5.

---

## Ticket 7.3 — Fin du MVP : checklist et démo à Adele

Type : Décision (PO, pas de code)

En tant que PO, je veux vérifier le MVP et le mettre entre les mains d'Adele pendant une semaine, afin de recueillir ses retours tôt.

**À faire**
- Checklist non fonctionnelle : app installable et hors ligne sur le téléphone d'Adele ; aucun secret ni donnée personnelle dans le repo ; README testé par une autre personne ; `docs/` à jour (suivi, décisions) ; sauvegarde testée (export puis import sur un autre navigateur).
- Première sauvegarde faite avec Adele, fichier rangé hors du téléphone.
- Démo : parcours complet avec Adele (projet, sections, tâches, budget, session, bilan).
- Après une semaine d'usage réel : entretien. Vérifier H3 (lance-t-elle le chrono ?), H1 / H2 si 6.1 non fait, libellés provisoires, besoin de supprimer sections / tâches.
- Retours consignés comme lots numérotés dans `docs/suivi.md`.

**Definition of Done**
- Checklist cochée dans `docs/suivi.md` ; retours de la démo consignés.

**Dépendances**
Tous les tickets MVP (epics 1 à 7).
