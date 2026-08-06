# Design system

Source de vérité pour l’identité visuelle, les états, les animations et les
composants partagés. Les valeurs réellement appliquées restent définies dans
`public/css/style.css`.

## Palette

| Variable | Valeur | Usage |
|---|---|---|
| `--bg` | `#f5f0e8` | Arrière-plan crème |
| `--surface` | `#fffdf8` | Cartes et panneaux |
| `--text` | `#1a1a1a` | Texte principal |
| `--text-muted` | `#6b6257` | Texte secondaire |
| `--accent` | `#c8472b` | Action principale et erreur réelle |
| `--accent-2` | `#e8a838` | Accent secondaire |
| `--border` | `#e0d8cc` | Bordures et séparateurs |
| `--radius` | `14px` | Rayon des grandes cartes |

Le terracotta transparent `#d77a4291` représente un état actif, ouvert,
sélectionné ou en édition. Le rouge plein `--accent` est réservé aux erreurs
réelles. Les actions d’achat utilisent le vert ; les ajustements Stock gardent
une couleur distincte.

## Typographie

| Variable | Police | Usage |
|---|---|---|
| `--font-display` | Playfair Display, Georgia, serif | Titres et valeurs fortes |
| `--font-body` | DM Sans, sans-serif | Texte, formulaires et boutons |

Les polices sont chargées dans `views/partials/header.ejs`.

## Icônes

Les icônes monochromes de `public/images/svg/` sont appliquées comme masques
CSS et héritent de `currentColor`. Cette technique évite plusieurs variantes
du même fichier pour les états actif, survolé ou désactivé.

Les boutons constitués uniquement d’une icône conservent un libellé accessible
dans le HTML. Les illustrations multicolores et le favicon ne sont pas
utilisés comme masques.

## États

| État | Traitement |
|---|---|
| Erreur ou saisie invalide | Rouge plein `--accent` |
| Élément armé avant confirmation | Terracotta transparent |
| Champ ou carte en édition | Terracotta transparent |
| Menu ouvert ou focus | Terracotta transparent |
| Action réussie | Vert |
| Information secondaire | Couleurs neutres ou toast |

Un état normal ne doit pas ressembler à une erreur.

## Mise en page

- largeur maximale commune de 1 200 px ;
- cartes sur `--surface`, bordure `--border`, rayon `--radius` ;
- barres d’outils sticky positionnées sous la hauteur réelle du header ;
- breakpoint mobile principal à 768 px ;
- une seule structure HTML pour les vues grille et liste.

## Animations

Les principales familles sont :

- apparition et ajout : `fadeIn`, `popIn` ;
- suppression ou achat : `slideOutLeft`, `popOutSuccess` ;
- notes et panneaux : `slideDownNote`, `fadeOutNote` ;
- mise à jour : `flashMaj`, `pulseMiseEnAvant` ;
- badge Courses : `badgeSacPop`, `badgeSacShake` ;
- photos : `oeilSeFerme`, `aspirePhotoVersOeil` ;
- rendu Stock : `stockFondu`.

Les animations décoratives doivent respecter `prefers-reduced-motion`.

## Composants et comportements partagés

### Sélecteur personnalisé

`public/js/custom-selects.js` améliore visuellement les `select` sans les
retirer du DOM :

- liste d’options placée sous `body` pour éviter les coupures ;
- valeur synchronisée avec le `select` natif et événement `change` ;
- observation des options et de l’état `disabled` ;
- fermeture au clic extérieur, au défilement ou avec Échap.

Limites : pas de navigation par flèches et pas de repositionnement après une
modification de mise en page pendant l’ouverture.

### Messages utilisateur

- `alert()` pour une erreur serveur confirmée ;
- toast pour une information ou un problème réseau récupérable ;
- les anomalies formelles suivent [Qualité](quality.md).

### Doubles soumissions

Stock et Calories suivent les identifiants en cours d’ajout. Courses utilise
un verrou unique. Le verrou est posé avant la requête et libéré après réussite
ou échec.

### Panneaux repliables

Les panneaux animés utilisent une grille passant de
`grid-template-rows: 0fr` à `1fr`. Le contenu est masqué pendant la
transition puis libéré pour permettre le débordement des suggestions.

### Réordonnancement FLIP

Le code mesure la position avant et après une mutation du DOM, puis anime la
différence. Ce comportement évite les déplacements instantanés dans le journal
et les éléments sticky.

### Grille et liste

Une classe `.vue-liste` modifie uniquement la présentation CSS. Les choix
indépendants sont conservés dans `localStorage`, sans rendu HTML dupliqué.
