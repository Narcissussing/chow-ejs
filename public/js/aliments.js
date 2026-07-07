const foodGrid = document.getElementById("foodGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const filterButtons = document.querySelectorAll(".filter-btn");
const noResults = document.getElementById("noResults");

let categorieActive = "tous";

// ============================================
// FILTRE CATÉGORIE
// ============================================

filterButtons.forEach(function (bouton) {
  bouton.addEventListener("click", function () {
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

searchInput.addEventListener("input", function () {
  appliquerFiltres();
});

// ============================================
// APPLIQUER FILTRE + RECHERCHE ENSEMBLE
// ============================================

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

  noResults.classList.toggle("hidden", visibles > 0);
}

// ============================================
// TRI
// ============================================

sortSelect.addEventListener("change", function () {
  trierGrille(this.value);
});

function trierGrille(critere) {
  const [cle, direction] = critere.split("-");
  const cartes = Array.from(foodGrid.querySelectorAll(".food-card"));

  cartes.sort(function (a, b) {
    let valeurA = a.dataset[cle];
    let valeurB = b.dataset[cle];

    if (cle === "nom") {
      return direction === "asc"
        ? valeurA.localeCompare(valeurB)
        : valeurB.localeCompare(valeurA);
    }

    valeurA = Number(valeurA);
    valeurB = Number(valeurB);
    return direction === "asc" ? valeurA - valeurB : valeurB - valeurA;
  });

  cartes.forEach(function (carte) {
    foodGrid.appendChild(carte);
  });
}

// Trie la grille selon la valeur par défaut du select au chargement
trierGrille(sortSelect.value);