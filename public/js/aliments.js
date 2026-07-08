// ============================================
// RÉCUPÉRATION DES ÉLÉMENTS HTML DE LA PAGE
// ============================================

const foodGrid = document.getElementById("foodGrid"); // grille contenant toutes les cartes d'aliments
const searchInput = document.getElementById("searchInput"); // champ de recherche
const sortSelect = document.getElementById("sortSelect"); // menu déroulant de tri
const filterButtons = document.querySelectorAll(".filter-btn"); // boutons de filtre par catégorie
const noResults = document.getElementById("noResults"); // message affiché quand aucun résultat ne correspond

// Variable qui garde en mémoire quelle catégorie est actuellement sélectionnée ("tous" par défaut)
let categorieActive = "tous";

// ============================================
// FILTRE CATÉGORIE
// ============================================

// Quand on clique sur un bouton de filtre de catégorie...
filterButtons.forEach(function (bouton) {
  bouton.addEventListener("click", function () {
    // On retire la classe "active" de tous les boutons, puis on l'ajoute uniquement à celui cliqué
    filterButtons.forEach(function (b) {
      b.classList.remove("active");
    });
    this.classList.add("active");
    categorieActive = this.dataset.categorie;
    appliquerFiltres();
  });
});

// ============================================
// RECHERCHE
// ============================================

// Quand l'utilisateur tape dans la barre de recherche, on filtre en direct
searchInput.addEventListener("input", function () {
  appliquerFiltres();
});

// ============================================
// APPLIQUER FILTRE + RECHERCHE ENSEMBLE
// ============================================

// Affiche/cache chaque carte d'aliment selon la catégorie sélectionnée ET le texte recherché
function appliquerFiltres() {
  const recherche = searchInput.value.toLowerCase().trim();
  const cartes = foodGrid.querySelectorAll(".food-card");
  let visibles = 0;

  cartes.forEach(function (carte) {
    const correspondCategorie =
      categorieActive === "tous" || carte.dataset.categorie === categorieActive;
    const correspondRecherche = carte.dataset.nom.includes(recherche);

    if (correspondCategorie && correspondRecherche) {
      carte.classList.remove("hidden");
      visibles++;
    } else {
      carte.classList.add("hidden");
    }
  });

  // Si aucune carte n'est visible après filtrage, on affiche le message "aucun résultat"
  noResults.classList.toggle("hidden", visibles > 0);
}

// ============================================
// TRI
// ============================================

// Quand on change la valeur du menu déroulant de tri, on retrie la grille
sortSelect.addEventListener("change", function () {
  trierGrille(this.value);
});

// Trie les cartes d'aliments selon le critère choisi (ex: "nom-asc", "calories-desc"...)
// puis les réinsère dans le bon ordre dans la grille
function trierGrille(critere) {
  // Le critère est composé de deux parties séparées par un tiret : la clé à trier, et la direction (asc/desc)
  const [cle, direction] = critere.split("-");
  const cartes = Array.from(foodGrid.querySelectorAll(".food-card"));

  cartes.sort(function (a, b) {
    let valeurA = a.dataset[cle];
    let valeurB = b.dataset[cle];

    if (cle === "nom") {
      // Tri alphabétique pour le nom
      return direction === "asc"
        ? valeurA.localeCompare(valeurB)
        : valeurB.localeCompare(valeurA);
    }

    // Pour les autres critères (ex: calories), on compare des nombres
    valeurA = Number(valeurA);
    valeurB = Number(valeurB);
    return direction === "asc" ? valeurA - valeurB : valeurB - valeurA;
  });

  // appendChild sur un élément déjà présent dans la page le déplace simplement à la fin :
  // en le faisant dans l'ordre trié, on réorganise visuellement toute la grille
  cartes.forEach(function (carte) {
    foodGrid.appendChild(carte);
  });
}

// Trie la grille selon la valeur par défaut du select au chargement
trierGrille(sortSelect.value);
