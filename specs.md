## Problème

Un collégien français doit mémoriser du vocabulaire d'anglais et d'allemand, ainsi que les verbes irréguliers anglais, pour ses contrôles. Les supports papier (cahier, listes du manuel) ne permettent pas de réviser activement, ne suivent pas ce qui est acquis ou fragile, et ne motivation pas. Le parent veut importer les listes réelles du collégien et le laisser s'entraîner de façon autonome sur n'importe quel appareil, à la maison.

## Solution

Une web app responsive (PC, tablette, téléphone), en français, ludique et motivante. Le parent importe les listes en CSV (upload ou copier-coller), les découpe en sous-listes correspondant aux leçons ; le collégien lance des sessions d'entraînement sur une ou plusieurs sous-listes, avec flashcards, QCM et saisie clavier, dans les deux directions (FR ↔ langue). Les verbes irréguliers sont interrogés par saisie des 3 informations manquantes sur 4. Un système Leitner à 4 boîtes fait revenir en priorité les mots difficiles. Points, streak quotidien et mode défi chronométré maintiennent la motivation. Progression sauvegardée localement (localStorage), familialement utilisable, prête à évoluer vers un déploiement Docker sur Raspberry Pi 4 puis un VPS avec comptes.

## User Stories

1. En tant que parent, je veux importer une liste de vocabulaire FR/EN ou FR/DE via un fichier CSV, afin de mettre dans l'app les vraies listes du collégien.
2. En tant que parent, je veux coller directement du contenu CSV dans une zone de texte de l'interface, afin d'importer sans créer de fichier.
3. En tant que parent, je veux un aperçu des lignes importées avant validation, afin de détecter les erreurs de format avant qu'elles n'entrent dans la liste.
4. En tant que parent, je veux importer une même liste en plusieurs fois, afin d'ajouter des mots au fil des leçons.
5. En tant que parent, je veux que les mots importés arrivent dans une zone "non classés", afin de les organiser ensuite sereinement.
6. En tant que parent, je veux classer les mots non classés dans des sous-listes que je nomme moi-même, afin de reproduire le découpage des leçons ou des contrôles.
7. En tant que parent, je veux créer, renommer et supprimer des sous-listes dans une liste (thème), afin d'adapter la structure au fil de l'année.
8. En tant que parent, je veux exporter n'importe quelle liste ou sous-liste en CSV, afin de sauvegarder ou de partager le contenu.
9. En tant que parent, je veux un format CSV standardisé (`;`, UTF-8, ligne d'en-tête), afin d'ouvrir mes fichiers dans Excel sans configuration.
10. En tant que parent, je veux que le format des verbes distingue les trois formes (infinitive, preterite, past participle) plus la traduction FR, afin que l'entraînement reflète ce qui est demandé en contrôle.
11. En tant que parent, je veux supprimer les listes d'exemple livrées avec l'app, afin de n'avoir que mes vraies listes.
12. En tant que collégien, je veux lancer une session d'entraînement sur une ou plusieurs sous-listes que je coche, afin de réviser exactement ce qui tombera au contrôle.
13. En tant que collégien, je veux un bouton "mes mots faibles" qui lance une session sur les boîtes Leitner basses, afin de bosser en priorité ce que je maîtrise mal.
14. En tant que collégien, je veux que les mots de vocabulaire soient interrogés dans les deux directions mélangées (FR → langue et langue → FR), afin d'ancrer la mémorisation dans les deux sens.
15. En tant que collégien, je veux trois mécanismes d'exercice : flashcards (mémoire active), QCM (rassurant) et saisie clavier (exigeant), répartis aléatoirement en session, afin de varier l'entraînement.
16. En tant que collégien, pour un verbe irrégulier je veux qu'un des quatre champs (fr, infinitive, preterite, past participle) soit proposé au hasard et que je saisisse les trois autres, afin de savoir produire toutes les formes.
17. En tant que collégien, je veux que la saisie soit tolérante sur la casse mais stricte sur les accents et umlauts (groß ≠ gross), afin d'être corrigé sur ce qui compte vraiment.
18. En tant que collégien, je veux voir la bonne réponse s'afficher quand je me trompe, afin d'apprendre immédiatement de mon erreur.
19. En tant que collégien, je veux que chaque mot suive un système Leitner à 4 boîtes (réussite = monte, échec = redescend), afin que la révision soit espacée intelligemment.
20. En tant que collégien, je veux que les sessions piochent en priorité les boîtes basses, afin de revoir souvent ce qui est fragile.
21. En tant que collégien, je veux gagner des points à chaque bonne réponse, afin d'avoir une récompense immédiate.
22. En tant que collégien, je veux un streak quotidien qui compte mes jours consécutifs d'entraînement, afin d'être motivé à revenir chaque jour.
23. En tant que collégien, je veux un mode défi chronométré, afin de me tester en conditions rapides.
24. En tant que collégien, je veux voir un pourcentage de maîtrise par liste, afin de savoir où j'en suis leçon par leçon.
25. En tant que collégien, je veux consulter l'historique de mes 10 dernières sessions (date, score), afin de voir ma progression.
26. En tant que collégien, je veux utiliser l'app sur PC, tablette et téléphone avec une interface adaptée, afin de réviser n'importe où.
27. En tant que collégien, je veux une interface entièrement en français, afin de naviguer sans friction.
28. En tant que parent, je veux que toute la progression (listes, sous-listes, boîtes, scores, streak) soit sauvegardée localement sur l'appareil sans compte, afin que l'app fonctionne dès maintenant sans serveur.
29. En tant que parent, je veux que l'app soit déployable sur mon Raspberry Pi 4 via Docker, afin de l'héberger moi-même à la maison.
30. En tant que parent, je veux une architecture prête à évoluer vers des comptes utilisateurs et un backend sur VPS, afin d'étendre l'usage sans réécrire l'app.

## Décisions d'implémentation

- **Stack** : React + Vite + TypeScript, build statique servi par nginx dans une image Docker multi-stage + docker-compose.yml. Cible : Raspberry Pi 4 (donc build léger, image ARM-compatible).
- **Persistance v1** : localStorage uniquement, via une couche d'accès aux données isolée (repository) pour brancher plus tard un backend (API ou sync). Schéma versionné avec migration pour survivre aux évolutions.
- **Modèle de données** :
  - Thème = liste (ex. "Vocabulaire EN"). Une liste a un type : `vocab-en`, `vocab-de` ou `verbs-en`.
  - Sous-listes nommées appartenant à une liste ; mots "non classés" = sous-liste spéciale implicite.
  - Item vocabulaire : `fr` + `traduction`. Item verbe : `fr`, `infinitive`, `preterite`, `past_participle`.
  - État Leitner par item : boîte 1-4, horodatage de dernier passage.
  - Profil de progression : points, streak (date du dernier entraînement, compteur), historique des sessions (10 dernières conservées).
- **Import** : deux entrées (upload CSV, copier-coller) vers le même parseur : `;`, UTF-8, en-tête obligatoire. Vocab : `fr;trad;liste`. Verbes : `infinitive;preterite;past_participle;fr;liste`. Aperçu tabulaire avec lignes en erreur signalées avant validation ; import cumulatif possible.
- **Export** : génération CSV au même format, par liste ou par sous-liste, téléchargé via blob.
- **Moteur de session** : sélection des sous-listes (multi-coche) ou "mots faibles" (boîtes 1-2). Tirage priorisant les boîtes basses, puis aléatoire. Répartition aléatoire des mécanismes (flashcard, QCM avec distracteurs issus de la même liste, saisie). Direction mélangée pour le vocabulaire ; pour les verbes, un champ sur quatre donné au hasard, les trois autres demandés. Un item ne peux pas être interrogé deux fois dans la même session.
- **Correction** : normalisation insensible à la casse, stricte sur les diacritiques/umlauts ; tolérance micro-typo à évaluer (le "gross/groß" reste faux). Affichage de la réponse attendue en cas d'erreur.
- **UI** : design responsive mobile-first, en français. Écrans : Accueil (streak, maîtrise, lancement rapide), Listes (gestion, import/export, sous-listes), Session d'entraînement, Résultats, Stats. Ton ludique : couleurs franches, feedback visuel immédiat (confettis sur série, secousse sur erreur).
- **Évolution comptes** : la couche repository et le routing de l'app laissent la place à une authentification et un backend sans restructuration majeure.

## Décisions de test

Les tests visent le comportement externe aux coutures principales :

- **Couture 1, le parseur CSV** : entrée CSV → items normalisés ; lignes malformées signalées ; cumul d'imports. Tests unitaires sur des fixtures (vocab FR/EN, FR/DE, verbes, accents, umlauts).
- **Couture 2, le moteur de session** : sélection → séquence d'exercices. Vérifier : priorité boîtes basses, mélange des directions, répartition des mécanismes, non-répétition d'un item, interrogation des verbes (4 champs, 3 demandés). Tests avec PRNG rendu déterministe pour la reproductibilité.
- **Couture 3, la correction de saisie** : paires entrée/attendu → verdict (casse ignorée, accents/umlauts stricts, variantes acceptées/refusées).
- **Couture 4, la persistance repository** : état → localStorage → rechargement → état identique ; migration de schéma entre versions.
- **Couture 5, flux utilisateur bout en bout** (art antérieur : tests Playwright sur apps flashcards) : importer → classer → lancer une session → répondre → vérifier mise à jour boîtes/points/streak.
- Les composants visuels ne sont testés que via les flux, pas par snapshot.

## Hors périmètre

- Comptes utilisateurs, authentification, backend, synchronisation multi-appareils (prévus en v2+).
- Prononciation audio / synthèse vocale.
- Mode hors-ligne natif (PWA, app mobile, store).
- Avatars, boutique, classements entre élèves.
- Listes autres qu'anglais et allemand (architecture ouverte, mais pas testé ni proposé dans l'UI).
- Hébergement VPS effectif (l'app est prête, le déploiement reste à ta charge).

## Notes complémentaires

- Les 3 listes d'exemple (vocab EN, vocab DE, verbes irréguliers EN) sont livrées en données de démonstration, supprimables depuis l'interface.
- Le streak se calcule sur des journées calendaires (Fuseau Europe/Paris), pas sur 24 h glissantes.
- Les distracteurs du QCM proviennent des autres mots de la même liste pour rester plausibles.
- Le mode défi chronométré réutilise le même moteur de session avec un chrono et un scoring bonifié.

## Itération suivante

Instructions pour le développement de la prochaine itération :

### 1. Mode verbes irréguliers : toujours partir de l'infinitif

- Dans le mode verbes irréguliers (`verbs-en`), le **point de départ du prompt est toujours l'infinitif** : soit l'infinitif anglais, soit l'infinitif français (tiré au hasard). **Ne jamais commencer un prompt avec le prétérit ou le past participle.**
- Le prétérit et le past participle **restent bien interrogés** : partant de l'infinitif donné, l'exercice peut demander de saisir le prétérit, le past participle, la traduction, ou une combinaison de ces formes (le nombre exact de champs demandés peut suivre la logique souhaitée, l'essentiel est que l'infinitif soit toujours le champ donné, jamais le prétérit ni le PP).
- La user story 16 devient donc : « pour un verbe irrégulier, je veux qu'on me propose l'infinitif (EN ou FR au hasard) et que je saisisse le ou les autres champs (prétérit, past participle, traduction), afin de produire les formes utiles en contrôle sans jamais partir du prétérit ou du PP ».
- Mettre à jour en conséquence le moteur de session, la correction et les tests de la couture 2 (règle : champ donné = infinitif, jamais prétérit/PP).

### 2. Affichage des erreurs : saisie erronée + correction

- En cas d'erreur, l'écran de correction doit afficher **côte à côte la saisie erronée de l'utilisateur et la réponse attendue**, par exemple : « Tu as saisi : *become* → Réponse attendue : *become* » avec la saisie erronée barrée ou mise en évidence.
- Objectif : permettre de comprendre immédiatement la nature de l'erreur (faute d'orthographe, accent manquant, mauvais mot) sans chercher ni se demander ce qui était attendu.
- Cela complète la user story 18 : voir la bonne réponse ne suffit plus, il faut voir aussi sa propre erreur. Concerne tous les exercices avec saisie (vocabulaire et verbes).

### 3. Clarification de la sélection des sous-listes

Constat utilisateur (capture d'écran) : sur l'écran « Lancer un entraînement », les libellés de cases à cocher du type « Liste 1 : be > bring · Liste 1 : be > bring (10 mots) » sont incompréhensibles, car le nom de la sous-liste est identique au nom de sa liste parente, et le libellé actuel concatène simplement `nom de liste · nom de sous-liste`.

Clarification du fonctionnement actuel (à documenter et à améliorer) :

- Une **liste** (thème, ex. les verbes irréguliers) contient des **sous-listes** correspondant aux leçons, plus une zone « non classés ». Sur l'écran « Lancer un entraînement », chaque case à cocher représente **une sous-liste** (pas une liste) : le premier élément du libellé est le nom de la liste, le second est le nom de la sous-liste.
- La session pioche uniquement les mots des sous-listes cochées, toutes listes confondues.
- Améliorations à livrer :
  - Regrouper visuellement les cases à cocher par liste parente (en-tête de liste, puis ses sous-listes), au lieu d'une liste plate.
  - Ajouter une case « tout cocher / tout décocher » par liste.
  - Rendre les libellés non ambigus : ne pas répéter le nom de la liste si la sous-liste porte le même nom, ou forcer des noms de sous-listes distincts et parlants (ex. « Leçon 1 », « Leçon 2 ») à la création ; ne pas réutiliser le nom de la liste comme nom de sous-liste par défaut.
  - Afficher le type de liste (vocabulaire / verbes) et le nombre de mots, et expliquer en une phrase sous le titre : « Coche une ou plusieurs sous-listes ; l'entraînement piochera uniquement leurs mots ».

### 4. Gestion des profils utilisateurs (multi-profils)

Décisions validées pour cette itération :

- **Profils locaux, sans authentification** : chaque utilisateur de la famille = un profil nommé (nom obligatoire + emoji avatar choisi dans une liste, ex. 🦊 🐼 🦉). Création libre en un clic depuis un écran de sélection de profil à l'ouverture ; renommage et suppression possibles depuis cet écran, avec confirmation pour la suppression.
- **Profils égaux** : pas de rôle parent/enfant, tous les profils peuvent importer, gérer et s'entraîner (un code PIN parental pourra être ajouté plus tard si besoin).
- **Données isolées par profil** : chaque profil possède ses propres listes, sous-listes, boîtes Leitner, points, streak et historique. Les listes ne sont pas partagées entre profils.
- **Copie entre profils** : bouton « copier cette liste vers un autre profil » pour éviter les doubles imports. La copie concerne uniquement le contenu (mots, sous-listes) ; la progression Leitner et les stats ne sont jamais copiées (mots démarrés en boîte 1 côté destinataire).
- **Migration automatique** : au premier lancement après mise à jour, les données existantes (schéma v1 mono-utilisateur) migrent automatiquement dans un premier profil créé à la volée (nommé « Moi », renommable), sans perte de listes, boîtes, points, streak ni historique.
- **Listes d'exemple** : chaque nouveau profil démarre avec les 3 listes d'exemple (vocab EN, vocab DE, verbes irréguliers EN), supprimables.
- **Changement de profil** : bouton « changer de profil » permanent ; interdit en pleine session d'entraînement (finir ou abandonner la session d'abord). Pas de session simultanée multi-profils.
- **Persistance** : schéma localStorage v2 versionné : un objet global contenant le tableau des profils (nom, emoji, données complètes) et le profil actif. Migration v1 → v2 dans la couche repository, qui reste isolée pour un futur backend.
- **Portée des tests** : mettre à jour la couture 4 (persistance repository) : migration v1 → v2 sans perte, isolation stricte des données entre profils, suppression de profil, copie de liste inter-profil (contenu seul, progression vierge).
- **Hors périmètre de cette itération** : synchronisation multi-appareils, comptes en ligne, authentification, backend. L'export CSV reste le pont entre appareils. Le futur backend (RPi/containers) réutilisera le modèle « utilisateurs + données par utilisateur » défini ici, via la couche repository existante.
