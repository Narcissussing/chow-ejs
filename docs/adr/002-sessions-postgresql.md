# ADR 002 — Sessions dans PostgreSQL

- **Statut** : accepté
- **Date** : 2026-07-15

## Contexte

Fly.io arrête automatiquement la machine lorsqu’elle est inactive. Une
session en mémoire serait perdue à chaque redémarrage.

## Décision

Stocker les sessions avec `connect-pg-simple` dans PostgreSQL.

## Conséquences

- les utilisateurs restent connectés après un redémarrage ;
- la disponibilité des sessions dépend de PostgreSQL ;
- la table `session` est créée automatiquement.
