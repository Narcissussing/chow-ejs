# ADR 001 — Migrations idempotentes au démarrage

- **Statut** : accepté
- **Date** : 2026-07-03

## Contexte

Le projet utilise PostgreSQL sans ORM ni outil de migration. Le schéma doit
pouvoir évoluer sur une petite application exploitée par une seule personne.

## Décision

Les changements utilisent `CREATE TABLE IF NOT EXISTS`,
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` ou des opérations équivalentes
dans `index.js`, exécutées au démarrage.

## Conséquences

- configuration simple et rejouable ;
- un déploiement exécute aussi les migrations ;
- absence d’historique de schéma et de rollback automatique ;
- `index.js` reste trop chargé tant que le backend n’est pas modularisé.
