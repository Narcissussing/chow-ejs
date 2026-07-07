const rechercheAliment = document.getElementById("rechercheAliment");
const listeAliments = document.getElementById("listeAliments");
const idAlimentCache = document.getElementById("idAlimentCache");
const champQuantite = document.getElementById("champQuantite");
const champCL = document.getElementById("champCL");
const btnAjouter = document.getElementById("btnAjouter");
const formAjouterStock = document.getElementById("formAjouterStock");
const listeStock = document.getElementById("listeStock");

const btnModifierListe = document.getElementById("btnModifierListe");

const filterButtonsStock = document.querySelectorAll(".filter-btn[data-emplacement]");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const noResultsStock = document.getElementById("noResultsStock");

const btnToggleAjout = document.getElementById("btnToggleAjout");
const panneauAjoutStock = document.getElementById("panneauAjoutStock");

let emplacementActif = "tous";

// ============================================
// PANNEAU D'AJOUT (repliable)
// ============================================

btnToggleAjout.addEventListener("click", function () {
  panneauAjoutStock.classList.toggle("hidden");
});

// ============================================
// AUTOCOMPLETE
// ============================================

listeAliments.hidden = true;
const items = listeAliments.querySelectorAll("li");

rechercheAliment.addEventListener("input", function () {
  idAlimentCache.value = "";
  btnAjouter.disabled = true;

  champQuantite.disabled = true;
  champQuantite.value = "";

  champCL.disabled = true;
  champCL.selectedIndex = 0;

  const recherche = this.value.toLowerCase();

  if (recherche === "") {
    listeAliments.hidden = true;
    return;
  }

  let count = 0;
  listeAliments.hidden = false;

  items.forEach(function (item) {
    const match = item.textContent.toLowerCase().includes(recherche);
    if (match && count < 3) {
      item.hidden = false;
      count++;
    } else {
      item.hidden = true;
    }
  });
});

function appliquerModeEdition(actif) {
  document.body.classList.toggle("mode-edition-stock", actif);
  btnModifierListe.classList.toggle("actif", actif);
}

const modeEditionSauvegarde = localStorage.getItem("modeEditionStock") === "true";
appliquerModeEdition(modeEditionSauvegarde);

btnModifierListe.addEventListener("click", function () {
  const nouvelEtat = !document.body.classList.contains("mode-edition-stock");
  appliquerModeEdition(nouvelEtat);
  localStorage.setItem("modeEditionStock", nouvelEtat);
});

items.forEach(function (item) {
  item.addEventListener("click", function () {
    const type = this.dataset.type;
    idAlimentCache.value = this.dataset.id;
    rechercheAliment.value = this.textContent.trim();
    listeAliments.hidden = true;

    if (type === "cl") {
      champCL.disabled = false;
      champQuantite.disabled = true;
      champQuantite.value = "";
    } else {
      champQuantite.disabled = false;
      champCL.disabled = true;
    }
  });
});

champQuantite.addEventListener("input", function () {
  btnAjouter.disabled = this.value.trim() === "";
});

champCL.addEventListener("change", function () {
  btnAjouter.disabled = this.value === "";
});

document.addEventListener("click", function (e) {
  if (!document.getElementById("autocomplete").contains(e.target)) {
    listeAliments.hidden = true;
  }
});

// ============================================
// FILTRE EMPLACEMENT + RECHERCHE (en direct)
// ============================================

filterButtonsStock.forEach(function (bouton) {
  bouton.addEventListener("click", function () {
    filterButtonsStock.forEach(function (b) {
      b.classList.remove("active");
    });
    this.classList.add("active");
    emplacementActif = this.dataset.emplacement;
    appliquerFiltresStock();
  });
});

searchInput.addEventListener("input", function () {
  appliquerFiltresStock();
});

function appliquerFiltresStock() {
  const recherche = searchInput.value.toLowerCase().trim();
  const stockItems = listeStock.querySelectorAll(".stock-item");
  let visibles = 0;

  stockItems.forEach(function (item) {
    const correspondEmplacement =
      emplacementActif === "tous" || item.dataset.emplacement === emplacementActif;
    const correspondRecherche = item.dataset.nom.includes(recherche);

    if (correspondEmplacement && correspondRecherche) {
      item.classList.remove("hidden");
      visibles++;
    } else {
      item.classList.add("hidden");
    }
  });

  noResultsStock.classList.toggle("hidden", visibles > 0);
}

// ============================================
// TRI
// ============================================

sortSelect.addEventListener("change", function () {
  trierStock(this.value);
});

function trierStock(critere) {
  const stockItems = Array.from(listeStock.querySelectorAll(".stock-item"));

  stockItems.sort(function (a, b) {
    if (critere === "alpha") {
      return a.dataset.nom.localeCompare(b.dataset.nom);
    }
    const joursA = Number(a.dataset.jours);
    const joursB = Number(b.dataset.jours);
    return critere === "ancien" ? joursB - joursA : joursA - joursB;
  });

  stockItems.forEach(function (item) {
    listeStock.appendChild(item);
  });
}

// ============================================
// CONSTRUCTION D'UN NOUVEL ITEM STOCK
// ============================================

function construireStockItemDOM(item) {
  const div = document.createElement("div");
  div.className = "stock-item";
  div.dataset.id = item.id;
  div.dataset.nom = item.nom.toLowerCase();
  div.dataset.emplacement = item.emplacement;
  div.dataset.trackingType = item.tracking_type;
  div.dataset.jours = 0;

  let formModif;
  if (item.tracking_type === "cl") {
    formModif = `
      <form action="/stock/modifier" method="post" class="form-modif">
        <input type="hidden" name="idStock" value="${item.id}" />
        <select name="nouvelleQuantite" class="champ-modif" data-initial="${item.quantite}" disabled>
          <option value="plein" ${item.quantite === "plein" ? "selected" : ""}>Plein</option>
          <option value="à moitié" ${item.quantite === "à moitié" ? "selected" : ""}>À moitié</option>
          <option value="presque vide" ${item.quantite === "presque vide" ? "selected" : ""}>Presque vide</option>
          <option value="vide" ${item.quantite === "vide" ? "selected" : ""}>Vide</option>
        </select>
        <button type="button" class="btn-editer">Modifier</button>
        <button type="submit" class="btn-sauvegarder" disabled hidden>Enregistrer</button>
      </form>`;
  } else {
    formModif = `
      <form action="/stock/modifier" method="post" class="form-modif">
        <input type="hidden" name="idStock" value="${item.id}" />
        <input type="number" name="nouvelleQuantite" class="champ-modif" value="${item.quantite}" data-initial="${item.quantite}" min="0" disabled />
        <button type="button" class="btn-editer">Modifier</button>
        <button type="submit" class="btn-sauvegarder" disabled hidden>Enregistrer</button>
      </form>`;
  }

  div.innerHTML = `
    <span class="stock-nom">${item.nom}</span>
    <span class="stock-quantite">${item.quantite}</span>
    <span class="stock-jours">aujourd'hui</span>
    ${formModif}
    <form action="/stock/supprimer" method="post" class="form-supprimer-stock">
      <input type="hidden" name="idStock" value="${item.id}" />
      <button type="submit">Supprimer</button>
    </form>
  `;

  return div;
}

// ============================================
// AJOUT (fetch, sans rechargement)
// ============================================

formAjouterStock.addEventListener("submit", function (event) {
  event.preventDefault();

  const donnees = new FormData(formAjouterStock);
  const objet = {};
  donnees.forEach(function (valeur, cle) {
    objet[cle] = valeur;
  });

  fetch("/stock/ajouter", {
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

      const nouvelItem = construireStockItemDOM(data.item);
      listeStock.appendChild(nouvelItem);
      activerItemModif(nouvelItem);
      activerItemSuppression(nouvelItem);
      nouvelItem.classList.add("entree");

      rechercheAliment.value = "";
      idAlimentCache.value = "";
      champQuantite.value = "";
      champQuantite.disabled = true;
      champCL.selectedIndex = 0;
      champCL.disabled = true;
      btnAjouter.disabled = true;

      panneauAjoutStock.classList.add("hidden");
    });
});

// ============================================
// MODIFIER (édition inline + fetch + flash)
// ============================================

function activerItemModif(item) {
  const form = item.querySelector(".form-modif");
  const champ = form.querySelector(".champ-modif");
  const btnEditer = form.querySelector(".btn-editer");
  const btnSauvegarder = form.querySelector(".btn-sauvegarder");
  const spanQuantite = item.querySelector(".stock-quantite");

  btnEditer.addEventListener("click", function () {
    document.querySelectorAll(".form-modif").forEach(function (autreForm) {
      const autreChamp = autreForm.querySelector(".champ-modif");
      const autreBtnEditer = autreForm.querySelector(".btn-editer");
      const autreBtnSauvegarder = autreForm.querySelector(".btn-sauvegarder");

      autreChamp.disabled = true;
      autreChamp.value = autreChamp.dataset.initial;
      autreBtnEditer.hidden = false;
      autreBtnSauvegarder.hidden = true;
      autreBtnSauvegarder.disabled = true;
    });

    champ.disabled = false;
    champ.focus();
    btnEditer.hidden = true;
    btnSauvegarder.hidden = false;
  });

  champ.addEventListener("input", function () {
    const valeur = champ.value;
    const initial = champ.dataset.initial;
    const estValide =
      champ.tagName === "SELECT" ? valeur !== "" : valeur !== "" && Number(valeur) >= 0;

    btnSauvegarder.disabled = !(valeur !== initial && estValide);
  });

  champ.addEventListener("change", function () {
    champ.dispatchEvent(new Event("input"));
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const donnees = new FormData(form);
    const objet = {};
    donnees.forEach(function (valeur, cle) {
      objet[cle] = valeur;
    });

    fetch("/stock/modifier", {
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

        spanQuantite.textContent = data.quantite;

        champ.dataset.initial = data.quantite;
        champ.disabled = true;
        btnEditer.hidden = false;
        btnSauvegarder.hidden = true;
        btnSauvegarder.disabled = true;

        item.classList.add("maj-flash");
        setTimeout(function () {
          item.classList.remove("maj-flash");
        }, 600);
      });
  });
}

// ============================================
// SUPPRIMER (fetch + animation de sortie)
// ============================================

function activerItemSuppression(item) {
  const form = item.querySelector(".form-supprimer-stock");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const donnees = new FormData(form);
    const objet = {};
    donnees.forEach(function (valeur, cle) {
      objet[cle] = valeur;
    });

    fetch("/stock/supprimer", {
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

        item.classList.add("disparait");
        setTimeout(function () {
          item.remove();
        }, 300);
      });
  });
}

// ============================================
// ACTIVATION DES ITEMS EXISTANTS AU CHARGEMENT
// ============================================

document.querySelectorAll(".stock-item").forEach(function (item) {
  activerItemModif(item);
  activerItemSuppression(item);
});

// Trie la liste selon la valeur par défaut du select au chargement
trierStock(sortSelect.value);