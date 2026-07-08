const rechercheAlimentCalories = document.getElementById("rechercheAlimentCalories");
const listeAlimentsCalories = document.getElementById("listeAlimentsCalories");
const listeJournal = document.getElementById("listeJournal");
const noResultsJournal = document.getElementById("noResultsJournal");

const totalKcalEl = document.getElementById("totalKcal");
const totalGlucidesEl = document.getElementById("totalGlucides");
const totalProteinesEl = document.getElementById("totalProteines");
const totalLipidesEl = document.getElementById("totalLipides");

const selectRecette = document.getElementById("selectRecette");
const btnToutEffacer = document.getElementById("btnToutEffacer");

const btnToggleRecette = document.getElementById("btnToggleRecette");
const panneauCreerRecette = document.getElementById("panneauCreerRecette");
const formCreerRecette = document.getElementById("formCreerRecette");
const listeIngredients = document.getElementById("listeIngredients");
const rechercheIngredient = document.getElementById("rechercheIngredient");
const listeIngredientsRecherche = document.getElementById("listeIngredientsRecherche");
const nomRecette = document.getElementById("nomRecette");

// ============================================
// AUTOCOMPLETE + AJOUT INSTANTANÉ (clic = ajout direct, 100g par défaut)
// ============================================

listeAlimentsCalories.hidden = true;
const itemsAutocomplete = listeAlimentsCalories.querySelectorAll("li");

rechercheAlimentCalories.addEventListener("input", function () {
  const recherche = this.value.toLowerCase();

  if (recherche === "") {
    listeAlimentsCalories.hidden = true;
    return;
  }

  let count = 0;
  listeAlimentsCalories.hidden = false;

  itemsAutocomplete.forEach(function (item) {
    const match = item.textContent.toLowerCase().includes(recherche);
    if (match && count < 5) {
      item.hidden = false;
      count++;
    } else {
      item.hidden = true;
    }
  });
});

itemsAutocomplete.forEach(function (item) {
  item.addEventListener("click", function () {
    ajouterAlimentAuJournal(this.dataset.id, 100);
    rechercheAlimentCalories.value = "";
    listeAlimentsCalories.hidden = true;
  });
});

document.addEventListener("click", function (e) {
  if (!document.getElementById("autocompleteCalories").contains(e.target)) {
    listeAlimentsCalories.hidden = true;
  }
});

function ajouterAlimentAuJournal(idAliment, quantiteG) {
  fetch("/calories/ajouter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idAliment: idAliment, quantiteG: quantiteG })
  })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data.erreur) {
        alert(data.erreur);
        return;
      }
      const nouvelleEntree = construireJournalItemDOM(data.item);
      listeJournal.appendChild(nouvelleEntree);
      activerItem(nouvelleEntree);
      nouvelleEntree.classList.add("entree");
      recalculerTotaux();
    });
}

// ============================================
// TOTAUX
// ============================================

function recalculerTotaux() {
  let kcal = 0;
  let glucides = 0;
  let proteines = 0;
  let lipides = 0;

  listeJournal.querySelectorAll(".journal-item").forEach(function (item) {
    kcal += Number(item.dataset.kcal);
    glucides += Number(item.dataset.glucides);
    proteines += Number(item.dataset.proteines);
    lipides += Number(item.dataset.lipides);
  });

  totalKcalEl.textContent = kcal.toFixed(0);
  totalGlucidesEl.textContent = glucides.toFixed(1) + "g";
  totalProteinesEl.textContent = proteines.toFixed(1) + "g";
  totalLipidesEl.textContent = lipides.toFixed(1) + "g";

  noResultsJournal.classList.toggle("hidden", listeJournal.querySelectorAll(".journal-item").length > 0);
}

// ============================================
// CONSTRUCTION D'UNE ENTRÉE
// ============================================

function construireJournalItemDOM(entree) {
  const div = document.createElement("div");
  div.className = "journal-item carte-article";
  div.dataset.id = entree.id;
  div.dataset.kcal = entree.calories_calc;
  div.dataset.glucides = entree.glucides_calc;
  div.dataset.proteines = entree.proteines_calc;
  div.dataset.lipides = entree.lipides_calc;

  div.innerHTML = `
    <span class="journal-nom">${entree.emoji} ${entree.nom}</span>
    <div class="journal-valeurs">
      <input type="number" class="journal-grammes-input" value="${Number(entree.quantite_g)}" min="1" />
      <span class="journal-kcal">${Number(entree.calories_calc).toFixed(0)} kcal</span>
    </div>
    <form action="/calories/supprimer" method="post" class="form-supprimer-journal">
      <input type="hidden" name="idEntree" value="${entree.id}" />
      <button type="submit" class="btn-icone-rond btn-supprimer-icone">Supprimer</button>
    </form>
  `;

  return div;
}

// ============================================
// ÉDITION INLINE DE LA QUANTITÉ (auto-save au blur)
// ============================================

function activerItem(item) {
  const champGrammes = item.querySelector(".journal-grammes-input");
  const kcalSpan = item.querySelector(".journal-kcal");

  champGrammes.addEventListener("change", function () {
    const nouvelleQuantite = this.value;
    if (!nouvelleQuantite || Number(nouvelleQuantite) <= 0) return;

    fetch("/calories/modifier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idEntree: item.dataset.id, nouvelleQuantite: nouvelleQuantite })
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data.erreur) {
          alert(data.erreur);
          return;
        }
        item.dataset.kcal = data.item.calories_calc;
        item.dataset.glucides = data.item.glucides_calc;
        item.dataset.proteines = data.item.proteines_calc;
        item.dataset.lipides = data.item.lipides_calc;
        kcalSpan.textContent = Number(data.item.calories_calc).toFixed(0) + " kcal";
        recalculerTotaux();
      });
  });

  activerSuppression(item);
}

function activerSuppression(item) {
  const form = item.querySelector(".form-supprimer-journal");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const donnees = new FormData(form);
    const objet = {};
    donnees.forEach(function (valeur, cle) {
      objet[cle] = valeur;
    });

    fetch("/calories/supprimer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(objet)
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data.erreur) {
          alert(data.erreur);
          return;
        }
        item.remove();
        recalculerTotaux();
      });
  });
}

// ============================================
// RECETTES — ajout instantané via dropdown
// ============================================

selectRecette.addEventListener("change", function () {
  const idRecette = this.value;
  if (!idRecette) return;

  fetch("/calories/ajouter-recette", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idRecette: idRecette })
  })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data.erreur) {
        alert(data.erreur);
        return;
      }
      data.items.forEach(function (entree) {
        const nouvelleEntree = construireJournalItemDOM(entree);
        listeJournal.appendChild(nouvelleEntree);
        activerItem(nouvelleEntree);
        nouvelleEntree.classList.add("entree");
      });
      recalculerTotaux();
      selectRecette.value = "";
    });
});

// ============================================
// TOUT EFFACER
// ============================================

btnToutEffacer.addEventListener("click", function () {
  if (!confirm("Effacer tout le journal d'aujourd'hui ?")) return;

  fetch("/calories/vider", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data.erreur) {
        alert(data.erreur);
        return;
      }
      listeJournal.innerHTML = "";
      recalculerTotaux();
    });
});

// ============================================
// PANNEAU CRÉER UNE RECETTE
// ============================================

btnToggleRecette.addEventListener("click", function () {
  panneauCreerRecette.classList.toggle("hidden");
});

function creerLigneIngredient(foodId, foodNom) {
  const ligne = document.createElement("div");
  ligne.className = "ligne-ingredient";
  ligne.dataset.foodId = foodId;

  const nomSpan = document.createElement("span");
  nomSpan.className = "ligne-ingredient-nom";
  nomSpan.textContent = foodNom;

  const champQuantite = document.createElement("input");
  champQuantite.type = "number";
  champQuantite.className = "ingredient-quantite";
  champQuantite.placeholder = "Grammes";
  champQuantite.min = "1";

  const btnSupprimer = document.createElement("button");
  btnSupprimer.type = "button";
  btnSupprimer.textContent = "✕";
  btnSupprimer.className = "btn-supprimer-ingredient";
  btnSupprimer.addEventListener("click", function () {
    ligne.remove();
  });

  ligne.appendChild(nomSpan);
  ligne.appendChild(champQuantite);
  ligne.appendChild(btnSupprimer);

  return ligne;
}

listeIngredientsRecherche.hidden = true;
const itemsIngredientsRecherche = listeIngredientsRecherche.querySelectorAll("li");

rechercheIngredient.addEventListener("input", function () {
  const recherche = this.value.toLowerCase();

  if (recherche === "") {
    listeIngredientsRecherche.hidden = true;
    return;
  }

  let count = 0;
  listeIngredientsRecherche.hidden = false;

  itemsIngredientsRecherche.forEach(function (item) {
    const match = item.textContent.toLowerCase().includes(recherche);
    if (match && count < 5) {
      item.hidden = false;
      count++;
    } else {
      item.hidden = true;
    }
  });
});

itemsIngredientsRecherche.forEach(function (item) {
  item.addEventListener("click", function () {
    const foodId = this.dataset.id;
    const foodNom = this.textContent.trim();

    const ligne = creerLigneIngredient(foodId, foodNom);
    listeIngredients.appendChild(ligne);
    ligne.querySelector(".ingredient-quantite").focus();

    rechercheIngredient.value = "";
    listeIngredientsRecherche.hidden = true;
  });
});

document.addEventListener("click", function (e) {
  if (!document.getElementById("autocompleteIngredient").contains(e.target)) {
    listeIngredientsRecherche.hidden = true;
  }
});

formCreerRecette.addEventListener("submit", function (event) {
  event.preventDefault();

  const nom = nomRecette.value.trim();
  const lignes = listeIngredients.querySelectorAll(".ligne-ingredient");
  const ingredients = [];

  lignes.forEach(function (ligne) {
    const foodId = ligne.dataset.foodId;
    const quantite = ligne.querySelector(".ingredient-quantite").value;
    if (foodId && quantite) {
      ingredients.push({ food_id: foodId, quantite_g: quantite });
    }
  });

  if (!nom || ingredients.length === 0) {
    alert("Ajoute un nom et au moins un ingrédient valide.");
    return;
  }

  fetch("/recettes/creer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom: nom, ingredients: ingredients })
  })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data.erreur) {
        alert(data.erreur);
        return;
      }

      const option = document.createElement("option");
      option.value = data.recette.id;
      option.textContent = data.recette.nom;
      selectRecette.appendChild(option);

      nomRecette.value = "";
      listeIngredients.innerHTML = "";
      panneauCreerRecette.classList.add("hidden");
    });
});

// ============================================
// ACTIVATION DES ENTRÉES EXISTANTES AU CHARGEMENT
// ============================================

listeJournal.querySelectorAll(".journal-item").forEach(function (item) {
  activerItem(item);
});