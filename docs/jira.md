# Organisation Jira

Référence de Chow pour créer, relier, rédiger et terminer les tickets Jira.
Le projet est maintenu par Olumide avec l’aide de plusieurs agents IA : la
méthode doit rester professionnelle, mais légère.

## Responsabilités

- Les agents rédigent les tickets, scénarios, checklists, corrections et
  documents selon ce cadre.
- Olumide fixe les priorités, valide les choix et décide du passage à
  `Terminé`.
- Le mot-clé `go` autorise l’exécution du plan qui vient d’être convenu. Il
  n’autorise jamais implicitement un commit, un push ou un déploiement.

## Hiérarchie

```text
Epic
├── Story
│   └── Subtask si nécessaire
├── Task
│   └── Subtask si nécessaire
└── Bug
    └── Subtask si nécessaire
```

Il n’existe pas de niveau Jira `Feature` dans Chow.

| Type | Utilisation |
|---|---|
| Epic | Grand résultat ou phase avec un début et une fin |
| Story | Capacité visible qui apporte une valeur au membre du foyer |
| Task | Travail technique autonome |
| Bug | Comportement existant incorrect |
| Subtask | Partie ciblée d’une Story, Task ou Bug |

Une Story, une Task et un Bug sont frères sous leur Epic. Une Task n’est pas
l’enfant d’une Story. Pour découper une Story, utiliser des Subtasks.

### Epics dans le temps

Un domaine permanent n’impose pas un Epic éternel. Une nouvelle phase reçoit
un nouvel Epic :

- `Courses — première version` ;
- `Courses — fiabilisation mobile` ;
- `Aliments — fiabilité nutritionnelle`.

Olumide clôt chaque parent manuellement après revue. Terminer tous les enfants
ne termine pas automatiquement leur Story, Task, Bug ou Epic.

## Parents et liens

Chaque ticket possède un seul parent hiérarchique direct :

- Story, Task ou Bug → Epic ;
- Subtask → Story, Task ou Bug.

Les liens Jira restent exceptionnels :

- un Bug peut utiliser `relates to` vers la Story dont le comportement est
  cassé, uniquement si cette Story est facile à identifier ;
- `duplicates` relie deux Bugs décrivant le même problème.

Le parent Epic suffit lorsqu’aucune Story précise ne correspond. Après une
livraison validée, créer un nouveau Bug plutôt que rouvrir la Story. Rouvrir
uniquement si la Story n’avait jamais réellement satisfait ses critères ou
avait été fermée par erreur.

## Langue et rédaction

Le contenu et les User Stories sont en français. Seuls les mots-clés Gherkin
restent en anglais pour faciliter une future automatisation.

### User Story

```text
En tant que membre du foyer,
Je veux [action],
Afin de [bénéfice].
```

Le rôle par défaut est `membre du foyer`. En choisir un autre uniquement si le
comportement change réellement.

### Gherkin

```gherkin
Feature: Achat depuis les Courses

Scenario: Achat réussi d’un aliment connu
  Given que « Lait » est présent dans les Courses
  And que sa quantité demandée est 2
  When je confirme son achat
  Then l’article est marqué comme acheté
  And 2 unités sont ajoutées au Stock
```

`Feature` est ici un mot-clé Gherkin, pas un niveau Jira.

Utiliser normalement un à trois scénarios par Story. Gherkin convient aux
règles métier, synchronisations, validations, doublons et cas limites utiles.
Ne pas l’imposer aux migrations, configurations, documents ou petites Tasks
techniques. Chow n’exécute pas encore ces scénarios automatiquement.

Pour un comportement commun à plusieurs appareils, préférer `sélectionner`,
`ouvrir`, `activer` ou `confirmer`. Employer `toucher` ou `cliquer` seulement
si l’appareil fait partie du comportement testé.

## Labels

Les labels servent à filtrer la couche technique principale, pas à répéter le
Projet, l’Epic, le Type ou le Statut.

- Aucun label obligatoire ; deux maximum par ticket.
- Écriture en minuscules.
- Un agent ne crée jamais un nouveau label sans l’accord d’Olumide et une mise
  à jour de ce document.
- Choisir uniquement les couches principales ; ne pas lister chaque fichier
  touché.

| Label | Quand l’utiliser |
|---|---|
| `frontend` | EJS, CSS, JavaScript navigateur, DOM ou UX |
| `backend` | Express, Node.js, routes, middleware, authentification ou logique métier |
| `database` | PostgreSQL, Neon, SQL, schéma ou migration |
| `mobile` | Responsive, ergonomie tactile ou comportement propre au mobile |
| `tests` | Tests automatisés, outillage de test ou couverture |

Chow n’a pas d’API publique. Les routes HTTP et réponses JSON restent classées
`backend` ; le label `api` n’est pas utilisé.

## Modèles de tickets

Les sections inutiles peuvent être retirées : les modèles guident la rédaction
sans ajouter du remplissage.

### Epic

```markdown
# Context

[Pourquoi cette phase est nécessaire.]

# Goal

[Résultat global attendu.]

# Success Criteria

- [Résultat global vérifiable]
- [Résultat global vérifiable]
```

### Story

````markdown
# User Story

En tant que membre du foyer,
Je veux [action],
Afin de [bénéfice].

# Context

[Pourquoi cette capacité est utile.]

# Acceptance Scenarios

```gherkin
Feature: [Nom de la capacité]

Scenario: [Cas nominal]
  Given [situation initiale]
  When [action]
  Then [résultat attendu]

Scenario: [Cas limite utile]
  Given [situation initiale]
  And [condition supplémentaire]
  When [action]
  Then [résultat attendu]
```

# Validation Checklist

- [ ] [Contrôle fonctionnel par Olumide]
````

### Task

```markdown
# Objective

[Résultat technique attendu.]

# Work

- [ ] [Étape utile]
- [ ] [Étape utile]

# Definition of Done

- [Condition technique vérifiable]
- [Documentation concernée mise à jour]
- [Vérification technique exécutée]
```

Une Task qui modifie visiblement le produit peut aussi recevoir une courte
`Validation Checklist`. Une Task interne ne nécessite pas de validation
fonctionnelle.

### Bug

````markdown
# Description

[Résumé du comportement incorrect.]

# Environment

- Page :
- Appareil ou navigateur :
- Environnement :

# Steps to Reproduce

1. [Étape]
2. [Étape]
3. [Étape]

# Expected Result

[Résultat attendu.]

# Actual Result

[Résultat obtenu.]

# Severity

Critique / Majeure / Mineure

# Regression Scenario

```gherkin
Scenario: Empêcher la réapparition du bug
  Given [état initial]
  When [action qui déclenchait le bug]
  Then [comportement corrigé attendu]
```

# BFV Checklist — Olumide uniquement

- [ ] [Vérification du correctif]
````

Le scénario de régression est facultatif si les étapes et le résultat attendu
suffisent.

### Subtask

```markdown
# Objective

[Une seule partie précise du ticket parent.]

# Done When

- [Résultat vérifiable]
```

## BFV — Bug Fix Verification

La BFV concerne uniquement les Bugs. Elle confirme qu’une Correction résout
le problème du point de vue d’Olumide sans introduire de régression visible.

```text
Bug enregistré comme Ouvert
        ↓
Correction implémentée et documentée
        ↓
Vérification technique par l’agent
        ↓
BFV exécutée et enregistrée par Olumide
        ↓
Bug passé à Terminé par Olumide
```

- L’agent prépare la checklist, mais ne la valide pas au nom d’Olumide.
- Dans Notion, Bug, Correction et BFV restent trois entrées séparées et
  horodatées.
- La checklist Jira décrit quoi vérifier ; l’entrée Notion conserve le
  résultat réel de la BFV.
- Si la BFV échoue, le Bug reste ou retourne `En cours`, la Correction est
  reprise et une nouvelle BFV est effectuée.

## Statuts Chow

- `Idées` : travail envisagé, pas encore préparé pour exécution ;
- `Backlog` : travail défini et disponible ;
- `En cours` : travail actif ou en attente de validation ;
- `Terminé` : résultat revu et accepté par Olumide.

Les agents ne déduisent jamais le statut d’un parent depuis ses enfants.
