# 🎓 Vocab Trainer

Web app responsive (PC, tablette, téléphone), en français, pour s'entraîner au vocabulaire
d'anglais et d'allemand et aux verbes irréguliers anglais. Conçue d'après `specs.md`.

- **Stack** : React 18 + Vite + TypeScript, build statique servi par nginx (image Docker multi-stage, compatible ARM/Raspberry Pi 4).
- **Persistance v1** : `localStorage` uniquement, via une couche repository isolée et un schéma versionné (migrations prêtes pour un futur backend/comptes sur VPS).

## Démarrage rapide (dev)

```bash
npm install
npm run dev        # http://localhost:5173
```

## Tests

```bash
npm test           # tests unitaires Vitest (parseur CSV, moteur de session, correction, persistance, streak)
npm run test:e2e   # flux bout en bout Playwright (importer → session → résultats)
```

Avant le premier lancement E2E : `npx playwright install chromium`

## Docker (Raspberry Pi 4 ou autre)

```bash
docker compose up --build -d   # http://localhost:8080
```

L'image est multi-architecture (buildx conseillée sur Pi 4 : `docker buildx build --platform linux/arm64 .`).

## Format CSV

Séparateur `;`, UTF-8, ligne d'en-tête obligatoire. La colonne `liste` est optionnelle
(les mots vont alors dans « Non classés »). L'import est cumulatif : les doublons sont ignorés.

Vocabulaire :

```csv
fr;trad;liste
le chat;a cat;Leçon 1
grand;groß;
```

Verbes irréguliers anglais :

```csv
infinitive;preterite;past_participle;fr;liste
be;was/were;been;être;Groupe 1
```

L'export produit exactement ce format (par liste ou par sous-liste).

## Fonctionnement

- **Sessions** : coche une ou plusieurs sous-listes (ou « Mes mots faibles » = boîtes Leitner 1-2), lance.
  Mécanismes mélangés aléatoirement : flashcard, QCM (distracteurs pris dans la même liste) et saisie clavier.
  Vocabulaire interrogé dans les deux directions ; verbes : un des 4 champs donné, les 3 autres à saisir.
  Un même mot n'apparaît qu'une fois par session.
- **Correction** : insensible à la casse, stricte sur les accents/umlauts (`groß` ≠ `gross`).
  La bonne réponse s'affiche en cas d'erreur.
- **Leitner 4 boîtes** : réussite = monte d'une boîte, échec = redescend. Tirage priorisant les boîtes basses.
- **Motivation** : +10 points par bonne réponse (+5 bonus en mode défi chronométré), streak sur jours
  calendaires (fuseau Europe/Paris), maîtrise % par liste, historique des 10 dernières sessions.
- **Listes d'exemple** livrées au premier lancement, supprimables depuis « Mes listes ».

## Architecture

```
src/
  domain/    logique pure testable (types, leitner, correction, moteur de session, progression/streak)
  data/      parseur/export CSV, import cumulatif, repository localStorage + migrations, seed
  ui/        provider d'état + écrans (Accueil, Listes, Session, Résultats, Stats)
```

La couche `data/repository.ts` est le seul point de contact avec le stockage : remplacer
`LocalStorageRepository` par un client API préparerait la v2 (comptes, synchro multi-appareils).
