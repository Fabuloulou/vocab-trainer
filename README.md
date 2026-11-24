# 🎓 Vocab Trainer

Web app responsive (PC, tablette, téléphone), en français, pour s'entraîner au vocabulaire
d'anglais et d'allemand et aux verbes irréguliers anglais. Conçue d'après `specs.md`.

- **Stack** : React 18 + Vite + TypeScript, build statique servi par nginx (image Docker multi-stage, compatible ARM/Raspberry Pi 4).
- **Persistance (schéma v2)** : `localStorage` uniquement, via une couche repository isolée et un schéma versionné. L'objet stocké est global : `{ profils, profilActif }` — chaque profil embarque ses propres listes, boîtes Leitner, points, streak et historique (migrations prêtes pour un futur backend/comptes sur VPS).

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

- **Sessions** : coche une ou plusieurs sous-listes, regroupées par liste sur l'accueil (case « tout cocher » par liste), ou « Mes mots faibles » (boîtes Leitner 1-2). L'entraînement pioche uniquement les mots des sous-listes cochées.
  **Trois niveaux de difficulté** pour le vocabulaire FR→EN / FR→DE, choisis au lancement de la session :
  - **Niveau 1 — « Je ne sais pas »** : flashcard. « Je ne sais pas » compte l'exercice comme faux et affiche la réponse attendue ; « Voir la réponse » puis « J'avais bon / J'avais faux » restent disponibles.
  - **Niveau 2 — QCM** : 4 choix dont la bonne réponse, distracteurs pris dans la même liste (retombe en saisie si la liste n'a qu'un seul mot).
  - **Niveau 3 — Saisie écrite** : la traduction se tape au clavier.
  Vocabulaire interrogé dans les deux directions **en alternance** : FR→langue puis langue→FR, jamais deux prompts de suite dans la même langue (direction de départ tirée au hasard) ; verbes irréguliers : **toujours à l'écrit** (niveau 3), le prompt part **toujours de l'infinitif** (EN ou FR au hasard), les 3 autres champs (prétérit, participe passé, traduction) sont à saisir.
  Un même mot n'apparaît qu'une fois par session.
- **Correction** : insensible à la casse, stricte sur les accents/umlauts (`groß` ≠ `gross`).
  En cas d'erreur, la saisie erronée (barrée) et la réponse attendue s'affichent côte à côte.
- **Leitner 4 boîtes** : réussite = monte d'une boîte, échec = redescend. Tirage priorisant les boîtes basses.
- **Motivation** : +10 points par bonne réponse (+5 bonus en mode défi chronométré), streak sur jours
  calendaires (fuseau Europe/Paris), maîtrise % par liste, historique des 10 dernières sessions.
- **Listes d'exemple** livrées au premier lancement et dans chaque nouveau profil, supprimables depuis « Mes listes ».
- **Profils (v0.2.0)** : multi-profils locaux, sans compte. À l'ouverture, un écran de sélection permet de choisir un profil ou d'en créer un (nom obligatoire + emoji avatar), de le renommer ou de le supprimer (avec confirmation). Chaque profil a ses **données isolées** : listes, boîtes Leitner, points, streak, historique. Le bouton « Changer de profil » dans l'en-tête est indisponible en pleine session d'entraînement. Depuis « Mes listes », « Copier vers un autre profil » duplique une liste (contenu et sous-listes uniquement — les mots copiés repartent en boîte 1, aucune progression n'est copiée). Au premier lancement après la mise à jour, les données existantes (schéma v1) migrent automatiquement dans un profil « Moi » sans perte.

## Architecture

```
src/
  domain/    logique pure testable (types, leitner, correction, moteur de session, progression/streak)
  data/      parseur/export CSV, import cumulatif, repository localStorage + migrations, seed
  ui/        provider d'état + écrans (Profils, Accueil, Listes, Session, Résultats, Stats)
```

La couche `data/repository.ts` est le seul point de contact avec le stockage : remplacer
`LocalStorageRepository` par un client API préparerait l'évolution vers des comptes et la
synchro multi-appareils (backend VPS), en réutilisant le modèle « profils + données par profil » du schéma v2.
