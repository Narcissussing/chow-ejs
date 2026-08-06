# Architecture

## Vue d’ensemble

Chow est un monolithe Node.js rendu côté serveur.

```text
Navigateur
   │ HTML, formulaires et fetch JSON
   ▼
Express 5 + Passport + EJS
   │ SQL brut via pg
   ▼
PostgreSQL local / Neon en production
```

Il n’existe ni framework frontend, ni bundler, ni ORM. `index.js` contient
la configuration, les migrations au démarrage, l’authentification, les accès
aux données et toutes les routes. Cette concentration est une dette technique
suivie dans Jira.

## Structure

| Emplacement | Responsabilité |
|---|---|
| `index.js` | Serveur, SQL, migrations, authentification et routes |
| `views/` | Pages et partials EJS |
| `public/js/` | Interactivité JavaScript par page |
| `public/css/style.css` | Styles globaux |
| `public/images/` | Photos et icônes SVG |
| `scripts/` | Administration ponctuelle, notamment les comptes |

## Cycle d’une requête

1. Express analyse les formulaires et sert les ressources statiques.
2. Les corps JSON sont acceptés jusqu’à 4 Mo pour les photos compressées.
3. `currentPath` est exposé aux vues pour la navigation active.
4. La session PostgreSQL et Passport chargent l’utilisateur.
5. Les routes de connexion restent publiques.
6. `requireAuth` protège toutes les routes déclarées ensuite.
7. Les routes interrogent PostgreSQL et rendent une vue ou une réponse JSON.

L’ordre des middlewares est une contrainte de sécurité : toute nouvelle route
privée doit rester déclarée après `app.use(requireAuth)`.

## Carte des routes

| Domaine | Routes principales |
|---|---|
| Accès | `GET/POST /login`, `POST /logout` |
| Accueil | `GET /` |
| Aliments | `GET /aliments`, `GET /aliments/:id`, équivalences |
| Stock | `GET /stock`, ajouter, modifier, supprimer |
| Courses | `GET /courses`, ajouter, acheter, supprimer, notes, photos, preset |
| Calories | `GET /calories`, ajouter, modifier, supprimer, déplacer, vider |
| Recettes | créer, consulter, modifier, supprimer, appliquer au journal |

La liste exacte et les contrats de réponse restent définis par `index.js`.
Ce document décrit l’architecture, pas chaque gestionnaire ligne par ligne.

## Rendu et état client

- le serveur rend le contenu initial en EJS ;
- chaque page dispose de son fichier JavaScript ;
- les mutations utilisent principalement `fetch()` puis mettent le DOM à
  jour sans rechargement ;
- les recherches, filtres, tris et bascules d’affichage sont généralement
  locaux au navigateur ;
- `public/js/custom-selects.js` améliore les `select` natifs tout en les
  gardant comme source fonctionnelle.

Les conventions visuelles et composants partagés sont documentés dans
[Design system](design-system.md).

## Authentification

Passport Local recherche l’utilisateur par email et compare le mot de passe
avec bcrypt. Seul l’identifiant est sérialisé ; l’utilisateur est rechargé
depuis PostgreSQL à chaque requête. Les sessions sont stockées en base afin
de survivre aux arrêts automatiques de Fly.io.

## Limites connues

- backend monolithique ;
- absence de tests automatisés et de lint ;
- migrations dispersées dans `index.js` ;
- pas de schéma SQL versionné séparément ;
- dépendance à des mises à jour DOM manuelles ;
- validation visuelle réelle nécessaire sur navigateur/appareil.

Les choix structurants et leurs raisons sont recensés dans
[Décisions](decisions.md).
