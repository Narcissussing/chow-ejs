const rechercheAlimentCalories = document.getElementById("rechercheAlimentCalories");
const listeAlimentsCalories = document.getElementById("listeAlimentsCalories");
const idAlimentCacheCalories = document.getElementById("idAlimentCacheCalories");
const champGrammes = document.getElementById("champGrammes");
const btnAjouterCalories = document.getElementById("btnAjouterCalories");
const formAjouterCalories = document.getElementById("formAjouterCalories");
const listeJournal = document.getElementById("listeJournal");
const noResultsJournal = document.getElementById("noResultsJournal");

const totalKcalEl = document.getElementById("totalKcal");
const totalGlucidesEl = document.getElementById("totalGlucides");
const totalProteinesEl = document.getElementById("totalProteines");
const totalLipidesEl = document.getElementById("totalLipides");

// ============================================
// AUTOCOMPLETE
// ============================================

listeAlimentsCalories.hidden = true;
const itemsAutocomplete = listeAlimentsCalories.querySelectorAll("li");

rechercheAlimentCalories.addEventListener("input", function () {
  idAlimentCacheCalories.value = "";
  champGrammes.disabled = true;
  champGrammes.value = "";
  btnAjouterCalories.disabled = true;

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
    idAlimentCacheCalories.value = this.dataset.id;
    rechercheAlimentCalories.value = this.textContent.trim();
    listeAlimentsCalories.hidden = true;
    champGrammes.disabled = false;
    champGrammes.focus();
  });
});

document.addEventListener("click", function (e) {
  if (!document.getElementById("autocompleteCalories").contains(e.target)) {
    listeAlimentsCalories.hidden = true;
  }
});

champGrammes.addEventListener("input", function () {
  btnAjouterCalories.disabled = this.value.trim() === "" || Number(this.value) <= 0;
});

// ============================================
// MISE À JOUR DES TOTAUX
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
// CONSTRUCTION D'UNE NOUVELLE ENTRÉE
// ============================================

function construireJournalItemDOM(entree) {
  const div = document.createElement("div");
  div.className = "journal-item";
  div.dataset.id = entree.id;
  div.dataset.kcal = entree.calories_calc;
  div.dataset.glucides = entree.glucides_calc;
  div.dataset.proteines = entree.proteines_calc;
  div.dataset.lipides = entree.lipides_calc;

  div.innerHTML = `
    <span class="journal-nom">${entree.emoji} ${entree.nom}</span>
    <span class="journal-grammes">${entree.quantite_g} g</span>
    <span class="journal-kcal">${Number(entree.calories_calc).toFixed(0)} kcal</span>
    <form action="/calories/supprimer" method="post" class="form-supprimer-journal">
      <input type="hidden" name="idEntree" value="${entree.id}" />
      <button type="submit">Supprimer</button>
    </form>
  `;

  return div;
}

// ============================================
// AJOUT (fetch, sans rechargement)
// ============================================

formAjouterCalories.addEventListener("submit", function (event) {
  event.preventDefault();

  const donnees = new FormData(formAjouterCalories);
  const objet = {};
  donnees.forEach(function (valeur, cle) {
    objet[cle] = valeur;
  });

  fetch("/calories/ajouter", {
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

      const nouvelleEntree = construireJournalItemDOM(data.item);
      listeJournal.appendChild(nouvelleEntree);
      activerSuppression(nouvelleEntree);
      nouvelleEntree.classList.add("entree");
      recalculerTotaux();

      rechercheAlimentCalories.value = "";
      idAlimentCacheCalories.value = "";
      champGrammes.value = "";
      champGrammes.disabled = true;
      btnAjouterCalories.disabled = true;
    });
});

// ============================================
// SUPPRESSION (fetch, sans rechargement)
// ============================================

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
// ACTIVATION DES ENTRÉES EXISTANTES AU CHARGEMENT
// ============================================

listeJournal.querySelectorAll(".journal-item").forEach(function (item) {
  activerSuppression(item);
});