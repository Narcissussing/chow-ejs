# Chow

Application privée de suivi alimentaire pour un foyer de deux personnes.
Elle réunit un catalogue nutritionnel, le stock domestique, une liste de
courses et un journal de calories avec recettes.

## Stack

- Node.js et Express 5
- EJS et JavaScript vanilla
- PostgreSQL en local, Neon en production
- Passport Local, bcrypt et sessions PostgreSQL
- Fly.io

## Installation

```bash
npm install
```

Créer un fichier `.env` :

```dotenv
DB_USER=
DB_HOST=
DB_NAME=
DB_PASSWORD=
DB_PORT=
PORT=3000
SECRET_KEY=
```

Créer ou réinitialiser un utilisateur :

```bash
node scripts/creer-utilisateur.js email@example.com mot-de-passe
```

Lancer l’application :

```bash
npm start
```

Il n’y a ni build, ni watcher, ni suite de tests configurée. Après une
modification, le serveur doit être redémarré avant vérification.

## Documentation

Après `/clear` ou dans une nouvelle conversation Codex, utiliser
`$chow-context` pour relire les règles, l’état courant, les bugs ouverts et
le canal Claude ↔ ChatGPT sans charger inutilement tous les documents.

Les agents travaillent d’abord depuis les fichiers locaux : `docs/bugs.md`
pour les anomalies et `docs/sync-log.md` pour le passage entre Claude et
ChatGPT. Jira et Notion ne sont consultés que lorsqu’une tâche exige leur état
actuel ou une modification externe.

| Document | Source de vérité pour |
|---|---|
| [Produit](docs/product.md) | Périmètre fonctionnel et règles métier |
| [Architecture](docs/architecture.md) | Structure technique et flux de requête |
| [Modèle de données](docs/data-model.md) | Tables, relations et conventions |
| [Design system](docs/design-system.md) | Interface et composants partagés |
| [Exploitation](docs/operations.md) | Environnements, comptes et déploiement |
| [Qualité](docs/quality.md) | Stratégie de test et workflow des anomalies |
| [Organisation Jira](docs/jira.md) | Hiérarchie, modèles, Gherkin, labels et BFV |
| [Décisions](docs/decisions.md) | Index des décisions architecturales |
| [Changelog](docs/changelog.md) | Historique fonctionnel synthétique |
| [Sync log](docs/sync-log.md) | Communication opérationnelle ChatGPT ↔ Claude |

## Sources de vérité

- **Notion** : connaissance produit, QA et releases.
- **Jira** : Epics, Stories, Tâches, Bugs et état d’exécution.
- **Git** : code et historique détaillé des changements.
- **Documentation du dépôt** : contrats techniques nécessaires pour
  maintenir et exploiter l’application.

## Déploiement

Le déploiement cible l’application Fly.io `chow-ejs` en région `cdg`.
Les migrations idempotentes s’exécutent au démarrage : un déploiement peut
donc modifier le schéma. Voir [Exploitation](docs/operations.md).
