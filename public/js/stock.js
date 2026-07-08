const rechercheAliment = document.getElementById("rechercheAliment");
const listeAliments = document.getElementById("listeAliments");
const idAlimentCache = document.getElementById("idAlimentCache");
const champQuantite = document.getElementById("champQuantite");
const champCL = document.getElementById("champCL");
const btnAjouter = document.getElementById("btnAjouter");
const formAjouterStock = document.getElementById("formAjouterStock");
const listeStock = document.getElementById("listeStock");

const filterButtonsStock = document.querySelectorAll(".filter-btn[data-emplacement]");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const noResultsStock = document.getElementById("noResultsStock");

const btnToggleAjout = document.getElementById("btnToggleAjout");
const panneauAjoutStock = document.getElementById("panneauAjoutStock");

let emplacementActif = "tous";

const OPTIONS_CL = [
  { valeur: "plein", texte: "Plein" },
  { valeur: "à moitié", texte: "À moitié" },
  { valeur: "presque vide", texte: "Presque vide" },
  { valeur: "vide", texte: "Vide" }
];

// ============================================
// PANNEAU D'AJOUT (repliable)
// ============================================

btnToggleAjout.addEventListener("click", function () {
  panneauAjoutStock.classList.toggle("hidden");
});

// ============================================
// AUTOCOMPLETE + RÉVÉLATION DU BON CHAMP
// ============================================

listeAliments.hidden = true;
const items = listeAliments.querySelectorAll("li");

rechercheAliment.addEventListener("input", function () {
  idAlimentCache.value = "";
  btnAjouter.disabled = true;

  champQuantite.classList.add("hidden");
  champQuantite.disabled = true;
  champQuantite.value = "";

  champCL.classList.add("hidden");
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

// (mode d'édition retiré : le tap fonctionne partout, tout le temps)

items.forEach(function (item) {
  item.addEventListener("click", function () {
    const type = this.dataset.type;
    idAlimentCache.value = this.dataset.id;
    rechercheAliment.value = this.textContent.trim();
    listeAliments.hidden = true;

    if (type === "cl") {
      champCL.classList.remove("hidden");
      champCL.disabled = false;
      champQuantite.classList.add("hidden");
      champQuantite.disabled = true;
      champQuantite.value = "";
    } else {
      champQuantite.classList.remove("hidden");
      champQuantite.disabled = false;
      champCL.classList.add("hidden");
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
// FILTRE EMPLACEMENT + RECHERCHE
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
  div.className = "stock-item carte-article";
  div.dataset.id = item.id;
  div.dataset.nom = item.nom.toLowerCase();
  div.dataset.emplacement = item.emplacement;
  div.dataset.trackingType = item.tracking_type;
  div.dataset.jours = 0;

  const infosHtml =
    item.tracking_type === "cl"
      ? `<div class="stock-barre-cl" title="${item.quantite}"><div class="stock-barre-cl-remplissage niveau-plein"></div></div>`
      : `<span class="stock-quantite">${item.quantite}</span>`;

  div.innerHTML = `
    <div class="stock-nom-groupe">
      <span class="stock-nom">${item.nom}</span>
      <span class="stock-jours">aujourd'hui</span>
    </div>
    <div class="stock-editable-zone" data-valeur-actuelle="${item.quantite}">
      ${infosHtml}
    </div>
    <form action="/stock/supprimer" method="post" class="form-supprimer-stock">
      <input type="hidden" name="idStock" value="${item.id}" />
      <button type="submit" class="btn-supprimer-icone btn-supprimer-dash">Supprimer</button>
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
      activerEditionInline(nouvelItem);
      activerItemSuppression(nouvelItem);
      nouvelItem.classList.add("entree");

      rechercheAliment.value = "";
      idAlimentCache.value = "";
      champQuantite.value = "";
      champQuantite.classList.add("hidden");
      champQuantite.disabled = true;
      champCL.selectedIndex = 0;
      champCL.classList.add("hidden");
      champCL.disabled = true;
      btnAjouter.disabled = true;

      panneauAjoutStock.classList.add("hidden");
    });
});

// ============================================
// ÉDITION INLINE PAR CLIC (pas de bouton modifier/enregistrer)
// ============================================

let itemOuvertActuellement = null;

function activerEditionInline(item) {
  const zone = item.querySelector(".stock-editable-zone");
  const trackingType = item.dataset.trackingType;

  item.addEventListener("click", function (e) {
    // Ignore les clics sur le bouton/formulaire de suppression
    if (e.target.closest(".form-supprimer-stock")) return;

    // Ignore les clics sur le champ éditable lui-même (laisser taper/choisir normalement)
    if (e.target.closest(".stock-quantite-edit, .stock-cl-edit")) return;

    if (!item.classList.contains("en-edition")) {
      fermerItemOuvert();
      ouvrirEdition(item, zone, trackingType);
      itemOuvertActuellement = item;
    } else {
      fermerEditionEtSauvegarder(item, zone, trackingType);
      itemOuvertActuellement = null;
    }
  });
}

function fermerItemOuvert() {
  if (!itemOuvertActuellement) return;
  const autreItem = itemOuvertActuellement;
  const autreZone = autreItem.querySelector(".stock-editable-zone");
  const autreTracking = autreItem.dataset.trackingType;
  fermerEditionEtSauvegarder(autreItem, autreZone, autreTracking);
  itemOuvertActuellement = null;
}

// Cliquer en dehors de tous les items ferme et sauvegarde celui qui est ouvert
document.addEventListener("click", function (e) {
  if (itemOuvertActuellement && !e.target.closest(".stock-item")) {
    fermerItemOuvert();
  }
});

function ouvrirEdition(item, zone, trackingType) {
  item.classList.add("en-edition");
  const valeurActuelle = zone.dataset.valeurActuelle;

  if (trackingType === "cl") {
    const select = document.createElement("select");
    select.className = "stock-cl-edit anim-fondu";
    OPTIONS_CL.forEach(function (option) {
      const opt = document.createElement("option");
      opt.value = option.valeur;
      opt.textContent = option.texte;
      if (option.valeur === valeurActuelle) opt.selected = true;
      select.appendChild(opt);
    });
    zone.innerHTML = "";
    zone.appendChild(select);
  } else {
    const input = document.createElement("input");
    input.type = "number";
    input.className = "stock-quantite-edit anim-fondu";
    input.value = valeurActuelle;
    input.min = "0";
    zone.innerHTML = "";
    zone.appendChild(input);
    input.focus();
    input.select();
  }
}

function fermerEditionEtSauvegarder(item, zone, trackingType) {
  const champ = zone.querySelector(".stock-quantite-edit, .stock-cl-edit");
  const nouvelleValeur = champ ? champ.value : zone.dataset.valeurActuelle;
  const valeurActuelle = zone.dataset.valeurActuelle;

  if (!nouvelleValeur || nouvelleValeur === valeurActuelle) {
    // Rien n'a changé : on revient simplement à l'affichage normal
    zone.innerHTML = construireAffichageStatique(valeurActuelle, trackingType);
    item.classList.remove("en-edition");
    return;
  }

  fetch("/stock/modifier", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idStock: item.dataset.id, nouvelleQuantite: nouvelleValeur })
  })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data.erreur) {
        alert(data.erreur);
        zone.innerHTML = construireAffichageStatique(valeurActuelle, trackingType);
        item.classList.remove("en-edition");
        return;
      }

      zone.dataset.valeurActuelle = data.quantite;
      zone.innerHTML = construireAffichageStatique(data.quantite, trackingType);
      item.classList.remove("en-edition");

      item.classList.add("maj-flash");
      setTimeout(function () {
        item.classList.remove("maj-flash");
      }, 600);
    });
}

function construireAffichageStatique(valeur, trackingType) {
  if (trackingType === "cl") {
    let classeNiveau = "niveau-vide";
    if (valeur === "plein") classeNiveau = "niveau-plein";
    else if (valeur === "à moitié") classeNiveau = "niveau-moitie";
    else if (valeur === "presque vide") classeNiveau = "niveau-presque-vide";
    return `<div class="stock-barre-cl anim-fondu" title="${valeur}"><div class="stock-barre-cl-remplissage ${classeNiveau}"></div></div>`;
  }
  return `<span class="stock-quantite anim-fondu">${valeur}</span>`;
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
  activerEditionInline(item);
  activerItemSuppression(item);
});

// Trie la liste selon la valeur par défaut du select au chargement
trierStock(sortSelect.value);