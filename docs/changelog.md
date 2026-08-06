# Changelog

Synthèse issue de l’historique Git, qui reste la source détaillée. Le travail
futur appartient à Jira ; les choix structurants sont indexés dans
[Décisions](decisions.md).

## 2026-08

- Protection contre les doubles ajouts dans Courses et signalement bloquant
  des erreurs serveur.
- Protection du Journal contre les ajouts multiples et les aliments déjà
  présents.
- Filtres Courses recalculés sans rafraîchissement et suggestions réparées
  après un premier ajout.
- Correction des actions +1/+2/+5 et de l’activation du panier dans Courses.
- Suppression des colonnes Courses inutilisées.
- Harmonisation des boutons Supprimer.
- Correction de l’état armé après l’action Acheté.
- Accès aux notes limité à leur emoji ou à leur contenu existant.
- États actifs séparés du rouge réservé aux saisies invalides.
- Réduction des commentaires de code trop détaillés, sans changement de
  comportement.

## 2026-07 — Courses en magasin

- Filtres par rayon synchronisés avec la liste.
- Badge de sac animé et déplacement dans la barre au défilement.
- Photos de référence compressées, stockées en `BYTEA` et mises en cache
  localement.
- Correction des actions rapides +1, +2 et +5.

## 2026-07 — Accès, recettes et finitions

- Authentification Passport/bcrypt, protection globale des routes et favicon.
- Séparation visuelle des notes, effacement mobile des recherches et
  résilience réseau.
- Tri et vues grille/liste indépendants pour les recettes.
- Catégorie Glace.
- Actions rapides Courses et Stock.
- Soustraction Stock limitée à la quantité disponible et adaptée au mobile.
- Preset hebdomadaire modifiable.
- Passage Stock → Courses.
- Équivalences cuillère → grammes propres à chaque aliment.
- Sélecteurs de recettes alphabétiques, limités à cinq lignes visibles avec
  défilement et état vide.
- Ajout des olives noires, de la moutarde et de la mayonnaise ; noms des
  poissons harmonisés.
- Unités pièce corrigées pour la gousse de vanille et le jaune d’œuf.
- Corrections sur les quantités décimales, les sauvegardes et les icônes.

## 2026-07 — Première version utilisable

- Stock avec cartes, photos, recherche et filtres.
- Journal Calories, recettes, ajout instantané et édition des quantités.
- Courses en AJAX : ajout, achat, suppression et commentaire.
- Fiche détaillée Aliments.
- Configuration Fly.io.
- 3 juillet : initialisation Express, EJS et PostgreSQL.
