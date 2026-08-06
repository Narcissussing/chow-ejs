# ADR 004 — Migration React par réécriture complète

- **Statut** : proposé
- **Date** : 2026-08-04

## Contexte

Le rendu EJS, les mutations DOM, les sélecteurs personnalisés et les
animations sont fortement couplés. Une migration page par page imposerait
durablement deux modèles de rendu.

## Décision

Si React est retenu, préparer une réécriture complète avec critères de parité,
plutôt qu’une migration incrémentale dans l’application actuelle.

## Conséquences

- séparation plus nette de l’architecture cible ;
- investissement initial plus élevé ;
- besoin d’un plan de données, d’authentification et de parité fonctionnelle ;
- décision finale encore ouverte dans Jira `CHOW-50`.
