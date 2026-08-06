# Décisions d’architecture

Les décisions durables utilisent des ADR : un fichier par décision, avec son
contexte, la décision et ses conséquences. Ce fichier est l’index ; il ne
répète pas leur contenu.

| ADR | Statut | Décision |
|---|---|---|
| [001](adr/001-migrations-au-demarrage.md) | Accepté | Migrations idempotentes au démarrage |
| [002](adr/002-sessions-postgresql.md) | Accepté | Sessions stockées dans PostgreSQL |
| [003](adr/003-photos-courses-postgresql.md) | Accepté | Photos de Courses stockées en `BYTEA` |
| [004](adr/004-react-recriture-complete.md) | Proposé | Migration React par réécriture complète |

## Règles métier durables

Ces règles sont documentées dans [Produit](product.md), pas sous forme d’ADR :

- deux comptes privés, sans inscription ;
- acheter une Course conserve la ligne avec `achete = true` ;
- appliquer une recette remplace le journal du jour ;
- appliquer le preset hebdomadaire ajoute uniquement les éléments manquants.

## Ajouter une décision

Créer `docs/adr/NNN-titre.md` avec :

1. statut et date ;
2. contexte ;
3. décision ;
4. conséquences positives et négatives ;
5. liens Jira ou Notion si nécessaires.

Ajouter ensuite une seule ligne dans cet index.
