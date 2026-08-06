# Sync log — Claude ↔ ChatGPT

Canal de communication opérationnelle entre Claude et ChatGPT. Ce fichier
n’est ni une spécification produit, ni un changelog, ni une source de vérité
architecturale. Chaque agent y ajoute des entrées datées et autonomes afin que
l’autre puisse reprendre sans contexte oral. Olumide arbitre tout conflit avec
ses instructions directes.

## À faire

- **Claude — CHOW-52** : lire l’entrée complète dans `docs/bugs.md`. Six
  aliments attendent leurs étiquettes avant correction ; ne pas relire Jira ou
  Notion pour reprendre le contexte.
- **CHOW-51** : appliqué en local et sur Neon (confirmé par Olumide). BFV
  créée dans Notion en ligne « En attente », à faire par Olumide sur l'app
  réelle.
- **CHOW-53** : appliqué en local ; supposé appliqué sur Neon en même temps
  que CHOW-51 (les requêtes avaient été fournies ensemble) — à confirmer si
  ce n'était pas le cas.
- **ChatGPT/Jira** : reporter le statut Corrigé/Terminé et les notes
  ci-dessous sur `CHOW-51` et `CHOW-53` (Jira/Notion), à partir de cette
  entrée — pas besoin de relire le code.

## État actuel (2026-08-07)

- **Corrigé (local + Neon), BFV en attente** : `CHOW-51`.
- **Fait (local, Neon à confirmer)** : `CHOW-53`.
- **Jira** : projet `CHOW`, 8 Epics et 45 issues enfants.
- **Notion** : hub Chow synchronisé ; Bugs ↔ Corrections ↔ BFV.

### Conventions

- Lire **À faire** d’abord ; lire l’historique seulement si nécessaire.
- Local d’abord. Outils externes uniquement pour état direct, doublon ou
  modification.
- L’agent met à jour le document concerné, puis laisse ici une action courte.
- Jira = exécution ; Notion = connaissance ; Git = code.
- Claude crée Bug + Correction, jamais la BFV. Olumide crée la BFV.
- Les instructions directes d’Olumide priment toujours.

<!-- Ajouter les nouvelles entrées sous cette ligne, de la plus récente à la plus ancienne. -->

## 2026-08-07 — CHOW-51 et CHOW-53 appliqués ; BFV créée

- **CHOW-51** : Neon confirmé par Olumide. Notion à jour : Bug Corrigé,
  Correction créée, BFV créée (En attente, non remplie).
- **CHOW-53** : `mais-en-conserve` (76 kcal, Légumes) et
  `haricot-rouge-en-conserve` (105 kcal, Légumineuses) ajoutés à `foods`
  local, images existantes réutilisées. Neon supposé fait en même temps.
- **Erreur corrigée** : l'entrée du 2026-08-05 disait `foods` sans colonnes
  fibres/sucres/graisses saturées/sel — faux, elles existent mais ne sont
  lues par aucune route. Corrigé dans `bugs.md` et `data-model.md`, valeurs
  ajoutées pour le Haricot Niébé.
- **Reste à faire** : BFV par Olumide ; Jira/Notion pour CHOW-53 côté
  ChatGPT (pas d'outil d'écriture Jira disponible ici).

## 2026-08-07 — CHOW-53 : deux aliments en conserve à ajouter

- **Jira** : [CHOW-53](https://oyinloyemide-1785766576452.atlassian.net/browse/CHOW-53),
  Tâche en `Idées`, parent `CHOW-2` (Aliments), label `database`.
- **Doublon** : aucun ticket existant trouvé pour ces deux aliments.
- **Référence** : toutes les valeurs ci-dessous sont fournies pour 100 g.
- **Maïs (en conserve)** : 321 kJ, 76 kcal, lipides 1,7 g, saturés 0,3 g,
  glucides 10,9 g, sucres 5,2 g, fibres 3,1 g, protéines 2,8 g, sel 0,3 g.
- **Haricots rouges (en conserve)** : 441 kJ, 105 kcal, lipides 0,6 g,
  saturés 0,1 g, glucides 15,0 g, sucres 0,7 g, fibres 6,6 g, protéines
  6,5 g, sel 0,4 g.
- **Stockage actuel** : Chow utilise au minimum kcal, glucides, protéines et
  lipides ; ne pas inventer de colonnes pour les autres valeurs. Conserver les
  informations complètes ici et dans Jira.
- **Assets existants** : `public/images/foods/mais-en-conserve.jpg` et
  `public/images/foods/haricot-rouge-en-conserve.jpg` sont présents et non
  suivis par Git au moment du signalement. Ne pas les supprimer ni les
  remplacer.
- **Portée de cette action** : ticket et coordination uniquement ; aucune
  donnée applicative n’a été ajoutée par ChatGPT. Claude implémente ensuite.
- **Jira volontairement concis** : CHOW-53 ne contient que les quatre valeurs
  stockées par Chow et une condition de fin ; les détails complets restent ici
  pour l’implémentation.

## 2026-08-05 — User Stories passées entièrement en français

- **Règle** : `En tant que`, `Je veux`, `Afin de` pour les User Stories.
- **Anglais conservé** : uniquement les mots-clés Gherkin `Feature`,
  `Scenario`, `Given`, `When`, `Then`, `And`, `But`.
- **Jira** : les 29 Stories CHOW ont été corrigées et relues ; aucun ancien
  `As a`, `I want` ou `So that` ne subsiste.
- **Dépôt** : modèles correspondants corrigés dans `docs/jira.md`.

## 2026-08-05 — Backlog Jira normalisé selon le nouveau cadre

- **Portée** : 52 issues relues et réécrites, sans création, suppression ni
  changement de statut.
- **Epics** : 8 descriptions structurées avec Context, Goal et Success
  Criteria.
- **Stories** : 29 User Stories en français avec `En tant que`, `Je veux`,
  `Afin de`, plus Gherkin et Validation Checklist.
- **Tasks** : 13 descriptions avec Objective, Work et Definition of Done.
- **Bugs** : CHOW-51 et CHOW-52 utilisent le modèle Bug, une Regression
  Scenario et une BFV Checklist réservée à Olumide.
- **Labels** : seules les valeurs `frontend`, `backend`, `database`, `mobile`
  et `tests` subsistent, en minuscules et deux maximum ; 42 issues en portent.
- **Liens** : CHOW-51 et CHOW-52 gardent CHOW-2 comme parent et utilisent
  `relates to` vers la Story Journal CHOW-31.
- **Vérification** : 52/52 modèles conformes, 44/44 enfants avec parent,
  aucune étiquette hors liste. Statuts inchangés : 46 Terminé, 1 En cours,
  3 Idées et 2 Backlog.

## 2026-08-05 — Cadre Jira et BFV adopté dans les documents

- **Source** : `docs/jira.md` devient la référence pour la hiérarchie, les
  modèles, Gherkin, les liens, les statuts et les labels Jira.
- **Hiérarchie** : Epic → Story / Task / Bug → Subtask si nécessaire.
- **Liens** : facultatifs et réservés aux Bugs — `relates to` vers une Story
  clairement concernée, ou `duplicates` entre Bugs.
- **BFV** : signifie Bug Fix Verification et concerne uniquement les Bugs ;
  Olumide reste l’unique validateur.
- **Labels** : `frontend`, `backend`, `database`, `mobile`, `tests`, en
  minuscules et deux maximum.
- **Portée initiale** : documents uniquement ; la restructuration Jira est
  consignée dans l’entrée plus récente ci-dessus. Notion reste inchangé.

## 2026-08-05 — Ancienne liste des labels Jira — remplacée

> Cette décision est remplacée par `docs/jira.md` et l’entrée ci-dessus.

- **Source** : `docs/quality.md` → Labels Jira.
- **Règle** : aucun label par défaut, deux maximum, aucune invention par un
  agent.
- **Labels autorisés** : `mobile`, `interface`, `donnees`, `performance`,
  `securite`, `compatibilite`, `accessibilite`, `infrastructure`.
- **Jira** : les 52 issues CHOW ont été normalisées. Les anciens labels
  automatiques ou redondants ont été retirés ; 14 issues conservent uniquement
  un ou deux labels autorisés. LookuLooku n’a pas été modifié.

## 2026-08-05 — CHOW-52 créé dans Jira et Notion

- **Bug** : six valeurs nutritionnelles potentiellement incohérentes entre
  portion et référence 100 g.
- **Jira** : [CHOW-52](https://oyinloyemide-1785766576452.atlassian.net/browse/CHOW-52),
  statut Idées, rattaché à l’Epic Aliments `CHOW-2`.
- **Notion** : Bug CHOW-52 ouvert dans Qualité → Bugs ; aucune Correction ni
  BFV créée.
- **Dépôt** : entrée autonome ajoutée à `docs/bugs.md`.
- **Suite** : confirmer les étiquettes avant toute correction.

## 2026-08-05 — CHOW-51 corrigé en local

- **Confirmation** : Olumide a fourni la valeur de l'étiquette du produit
  (sec) : 311 kcal, 44.34 g glucides, 22.45 g protéines, 1.32 g lipides pour
  100 g. Il a confirmé que le Haricot niébé est suivi à l'état sec dans
  Stock/Journal, pas cuit.
- **Constat** : la valeur en base (116 kcal) correspondait en fait à la
  référence *cuit*, cohérente avec `pois-chiches` (120 kcal, aussi cuit) —
  ce n'était pas une erreur de saisie isolée mais un choix de référence
  différent de celui attendu pour ce produit précis.
- **Correction** : `foods` (base locale) mis à jour pour `haricots-niebe` —
  calories 311, glucides 44.34, protéines 22.45, lipides 1.32.
- **Non stocké** : fibres (16.24 g), sucres (3.38 g), acides gras saturés
  (0.19 g) et sel (0.02 g) — `foods` n'a pas de colonnes pour ces valeurs.
- **Vérification technique** : écriture confirmée par requête SQL ; formule
  de calcul (`foods.calories * quantite_g / 100`) relue dans `index.js`,
  aucune autre transformation n'intervient entre le stockage et l'affichage.
- **Reste à faire** : appliquer la même mise à jour sur Neon (production) —
  requête donnée à Olumide, non exécutée automatiquement. BFV à faire par
  Olumide. `pois-chiches` utilise toujours la référence cuit ; à revoir si
  Olumide le suit aussi à l'état sec.
- **Dépôt** : `docs/bugs.md` mis à jour (statut Corrigé, section Correction).

## 2026-08-05 — Politique de documentation locale clarifiée

- **Règle** : les agents mettent à jour les documents locaux concernés pendant
  la même tâche.
- **Bugs** : `docs/bugs.md` doit rester autonome et suffire pour découvrir ou
  reprendre une anomalie sans consulter Notion.
- **Coordination** : `docs/sync-log.md` contient uniquement les informations
  nécessaires au passage Claude ↔ ChatGPT.
- **Outils externes** : Jira et Notion sont consultés lorsqu’un état en direct,
  une recherche de doublon ou une modification externe est nécessaire, pas
  pour reconstruire un contexte déjà disponible localement.

## 2026-08-05 — CHOW-51 signalé

- **Bug** : calories du Haricot niébé environ trois fois trop élevées pour
  100 g après sélection dans Chow.
- **Niveau** : Majeure ; les totaux du Journal et des Recettes peuvent être
  faussés.
- **Jira** : [CHOW-51](https://oyinloyemide-1785766576452.atlassian.net/browse/CHOW-51),
  statut Idées, rattaché à l’Epic Aliments `CHOW-2`.
- **Notion** : ligne Bug ouverte dans Qualité → Bugs, sans Correction ni BFV.
- **Dépôt** : entrée ouverte ajoutée à `docs/bugs.md`.
- **À confirmer** : valeur actuelle, valeur correcte et référence sec/cuit
  avant toute modification.

## 2026-08-04 — Historique produit détaillé capturé

- **Source** : liste de 24 éléments terminés transmise directement par
  Olumide : anomalies, améliorations UX, unités et ajouts au catalogue.
- **Jira** : détails historiques ajoutés en commentaires sur 14 issues
  existantes (`CHOW-14`, `17`, `20`, `21`, `23` à `26`,
  `30`, `32`, `40`, `41`, `44`, `45`). Aucun doublon créé.
- **Notion** : page créée sous Releases —
  [Historique détaillé — Stock, Courses et Recettes](https://app.notion.com/p/3b23344c68fa814e8036d9275be5c94e).
- **Dépôt** : `docs/changelog.md` complété avec les éléments manquants.
- **QA** : aucune ligne Bug/Correction/BFV rétroactive créée. Cette capture
  conserve l’historique livré sans inventer une validation utilisateur.

## 2026-08-04 — Parents Courses et Calories corrigés dans Jira

- **Erreur trouvée** : la création concurrente des Epics avait attribué
  `CHOW-4` au Journal Calories et `CHOW-5` aux Courses, alors que les
  issues enfants avaient été rattachées selon l’ordre de création supposé.
- **Correction** : `CHOW-23` à `CHOW-30` sont maintenant sous
  `CHOW-5` (Courses) ; `CHOW-31` à `CHOW-36` sont maintenant sous
  `CHOW-4` (Calories).
- **Vérification** : les 14 parents ont été relus directement dans Jira après
  modification et correspondent désormais à leur domaine.

## 2026-08-04 — Documentation du dépôt restructurée

- **But** : supprimer les doublons et donner une source de vérité claire à
  chaque sujet, sans changer la fonction de ce sync log.
- **Entrée principale** : `README.md`.
- **Sources techniques** : `docs/product.md`, `architecture.md`,
  `data-model.md`, `design-system.md`, `operations.md` et
  `quality.md`.
- **Décisions** : `docs/decisions.md` devient l’index des ADR conservés
  dans `docs/adr/`.
- **Compatibilité** : `flow-chow-app.md` et `shared-components.md`
  restent comme index courts pour ne pas casser les anciens liens.
- **Coordination** : `docs/sync-log.md` reste à son emplacement et sert
  exclusivement aux passages Claude ↔ ChatGPT.

## 2026-08-04 — Reconstruction complète du backlog Jira préparée

- **Source analysée** : application complète, routes, historique Git,
  `docs/flow-chow-app.md`, `changelog.md`, `decisions.md`, `bugs.md` et
  structure LookuLooku dans Jira/Notion.
- **Notion** : page créée sous Développement — [Reconstruction du backlog
  Jira — Chow](https://app.notion.com/p/3b13344c68fa817584c4df7d6ecabe19).
  Elle propose 8 Epics et 42 issues enfants, avec critères de statut et
  règles de traçabilité.
- **Jira** : 50 issues créées dans `CHOW` : `CHOW-1` à `CHOW-8`
  sont les 8 Epics ; `CHOW-9` à `CHOW-50` sont 29 Stories et 13
  Tâches, toutes rattachées à un Epic. Vérification finale : aucune issue
  orpheline.
- **États** : 7 Epics et 39 issues enfants prouvés par le dépôt sont en
  Terminé. `CHOW-8` reste En cours. `CHOW-48` (tests/lint),
  `CHOW-49` (modularisation) et `CHOW-50` (migration React) restent
  en Idées. Aucun Bug historique n'a été inventé à partir d'un simple
  commit de correction.
- **Repo** : `AGENTS.md` ajouté à `.gitignore` comme demandé ; aucun état Git
  n'a été modifié au-delà de l'édition des fichiers.
