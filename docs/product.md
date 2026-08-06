# Produit

## Vision

Chow centralise le suivi alimentaire quotidien d’un foyer de deux personnes.
L’application doit rester rapide sur mobile, utilisable pendant les courses et
assez simple pour être administrée sans interface dédiée.

## Domaines fonctionnels

### Aliments

Référentiel des aliments connus et de leurs informations nutritionnelles.

- recherche insensible aux accents ;
- filtres par catégorie et tri par nom ou nutrition ;
- fiche détaillée ;
- équivalences propres à chaque aliment pour cuillère à café, cuillère à
  soupe et poids d’une unité.

La création et la suppression des aliments ne sont pas exposées dans
l’interface. Le référentiel est administré directement en base.

### Stock

Inventaire de ce qui est disponible à la maison.

- quantités adaptées aux suivis `unite`, `pack` et `cl` ;
- emplacements Frigo, Congélateur et Réserve ;
- recherche, filtres, tris et vues grille/liste ;
- ajout, modification, suppression et ajustements rapides ;
- envoi vers Courses sans doublon actif.

### Courses

Liste de courses utilisable avant et pendant les achats.

- aliments connus ou articles en texte libre ;
- notes et photos de référence ;
- filtres et regroupement par rayon ;
- preset hebdomadaire modifiable ;
- achat avec mise à jour du Stock ;
- protection contre les doubles soumissions et actions accidentelles.

Un achat passe `achete` à `true` ; il ne supprime pas l’historique.

### Calories

Journal nutritionnel de la journée courante.

- ajout d’aliments en grammes, cuillères ou pièces ;
- calcul des calories et macronutriments à partir des valeurs pour 100 g ;
- modification, suppression, réordonnancement et vidage ;
- conversion du journal en recette.

### Recettes

Groupes réutilisables d’aliments et de quantités.

- création, consultation, modification et suppression ;
- catégories Plat, Fraîcheur et Glace ;
- tri et vues grille/liste indépendantes ;
- application au journal du jour.

Appliquer une recette remplace le journal du jour. À l’inverse, appliquer le
preset hebdomadaire ajoute uniquement les courses manquantes.

## Utilisateurs et accès

- deux comptes privés ;
- aucune inscription publique ;
- toutes les pages, sauf la connexion, exigent une session ;
- les comptes sont créés ou réinitialisés avec
  `scripts/creer-utilisateur.js`.

## Hors périmètre actuel

- administration du catalogue depuis l’interface ;
- inscription et gestion autonome des comptes ;
- historique nutritionnel multi-jour dans l’interface ;
- rôles et permissions ;
- API publique.

Le travail futur est suivi dans Jira, notamment les tests automatisés, la
modularisation du backend et la migration éventuelle vers React.
