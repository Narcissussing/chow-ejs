// ============================================
// RÉCUPÉRATION DES ÉLÉMENTS HTML DE LA PAGE
// ============================================

const rechercheAliment = document.getElementById("rechercheAliment"); // champ de recherche pour ajouter un aliment
const listeAliments = document.getElementById("listeAliments"); // liste déroulante des suggestions d'aliments
const listeStock = document.getElementById("listeStock"); // conteneur qui affiche tous les articles du stock

const searchInput = document.getElementById("searchInput"); // champ de recherche dans le stock déjà présent
const sortSelect = document.getElementById("sortSelect"); // menu déroulant de tri (Nom/Ancien/Récent/Quantité)
const noResultsStock = document.getElementById("noResultsStock"); // message affiché quand aucun résultat ne correspond

const btnToggleAjout = document.getElementById("btnToggleAjout"); // bouton pour ouvrir/fermer la recherche d'ajout
const rechercheStockWrapper = document.getElementById("rechercheStockWrapper"); // barre de recherche du stock
const autocompleteWrapper = document.getElementById("autocomplete"); // barre de recherche d'ajout (remplace la précédente)
const ajoutBackdropStock = document.getElementById("ajoutBackdropStock"); // fond assombri pendant l'ajout

const btnVueGrille = document.getElementById("btnVueGrille"); // bouton "vue grille" (cartes)
const btnVueListe = document.getElementById("btnVueListe"); // bouton "vue liste" (articles empilés)

// Emplacement et type de suivi partagent un seul groupe de boutons à choix unique : un seul peut différer de "tous" à la fois.
let emplacementActif = "tous";
let typeActif = "tous";

// Retire les accents (NFD + strip des diacritiques) pour que "e" trouve aussi "Café".
function normaliserTexte(str) {
  return str.normalize("NFD").replace(new RegExp("[̀-ͯ]", "g"), "");
}

// Bandeau discret auto-effaçable (même composant que courses.js/calories.js).
function afficherToast(message) {
  let toast = document.getElementById("toastReseau");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toastReseau";
    toast.className = "toast-reseau";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove("visible");
  void toast.offsetWidth;
  toast.classList.add("visible");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function () {
    toast.classList.remove("visible");
  }, 3500);
}

// Ajoute la classe "entree" (petite animation d'apparition, voir @keyframes popIn) puis la
// retire une fois l'animation terminée : "animation: ... both" (voir style.css) fait tenir la
// valeur de fin indéfiniment tant que la classe reste posée, ce qui écraserait silencieusement
// tout "transform" posé plus tard en JS si on ne la retirait jamais.
function ajouterAnimationEntree(el) {
  el.classList.add("entree");
  el.addEventListener(
    "animationend",
    function () {
      el.classList.remove("entree");
    },
    { once: true }
  );
}

// Échappe le HTML pour éviter une injection XSS.
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Niveaux possibles pour un aliment suivi en "cl" ("valeur" = stocké en base, "texte" = affiché).
const OPTIONS_CL = [
  { valeur: "plein", texte: "Plein" },
  { valeur: "à moitié", texte: "À moitié" },
  { valeur: "presque vide", texte: "Presque vide" },
  { valeur: "vide", texte: "Vide" }
];

// "Bas" : 2 niveaux les plus bas pour "cl", moins de 2 restants sinon (même logique que le serveur).
function estQuantiteBasse(valeur, trackingType) {
  if (trackingType === "cl") return valeur === "presque vide" || valeur === "vide";
  return Number(valeur) < 2;
}

function htmlBoutonAjouterCourses(foodId) {
  return `<button type="button" class="btn-ajouter-courses" data-food-id="${escapeHtml(foodId)}" title="Ajouter aux courses"></button>`;
}

// Ajoute à la liste de courses puis fait disparaître le bouton (jamais reproposé, voir data-deja-en-courses).
function activerBoutonAjouterCourses(item) {
  const bouton = item.querySelector(".btn-ajouter-courses");
  if (!bouton) return;

  bouton.addEventListener("click", function (e) {
    e.stopPropagation(); // toute la carte est cliquable, on évite d'ouvrir l'édition en plus
    bouton.disabled = true;

    fetch("/courses/ajouter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idAliment: bouton.dataset.foodId })
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data.erreur) {
          alert(data.erreur);
          bouton.disabled = false;
          return;
        }
        item.dataset.dejaEnCourses = "true";
        bouton.classList.add("disparait");
        setTimeout(function () {
          bouton.remove();
        }, 200);
      });
  });
}

// Rang numérique par niveau (0 = moins rempli, 3 = plus rempli), pour trier les "cl" par quantité.
const RANG_NIVEAU_CL = {
  vide: 0,
  "presque vide": 1,
  "à moitié": 2,
  plein: 3
};

function valeurQuantitePourTri(item) {
  if (item.dataset.trackingType === "cl") {
    return RANG_NIVEAU_CL[item.dataset.quantite] ?? 0;
  }
  return Number(item.dataset.quantite) || 0;
}

// ============================================
// RECHERCHE D'AJOUT (remplace la recherche du stock, jamais les deux ensemble)
// ============================================

// Les deux barres ne servent jamais ensemble : "+" remplace la recherche du stock par celle d'ajout.
btnToggleAjout.addEventListener("click", function () {
  if (autocompleteWrapper.hidden) {
    ouvrirRechercheAjoutStock();
  } else {
    fermerRechercheAjoutStock();
  }
});

function ouvrirRechercheAjoutStock() {
  rechercheStockWrapper.hidden = true;
  autocompleteWrapper.hidden = false;
  // Petite animation d'apparition (même effet que l'ajout d'un nouvel article, voir @keyframes popIn)
  autocompleteWrapper.classList.remove("entree");
  void autocompleteWrapper.offsetWidth; // force le navigateur à relancer l'animation même si la classe était déjà passée
  autocompleteWrapper.classList.add("entree");
  btnToggleAjout.classList.add("actif");
  ajoutBackdropStock.classList.add("ouvert");
  // Reprend le texte de la recherche du stock ; select() pour pouvoir le remplacer d'un coup.
  rechercheAliment.value = searchInput.value;
  rechercheAliment.focus();
  rechercheAliment.select();
  rechercheAliment.dispatchEvent(new Event("input"));
}

function fermerRechercheAjoutStock() {
  if (autocompleteWrapper.hidden) return;
  autocompleteWrapper.hidden = true;
  rechercheAliment.value = "";
  listeAliments.hidden = true;
  rechercheStockWrapper.hidden = false;
  rechercheStockWrapper.classList.remove("entree");
  void rechercheStockWrapper.offsetWidth;
  rechercheStockWrapper.classList.add("entree");
  btnToggleAjout.classList.remove("actif");
  ajoutBackdropStock.classList.remove("ouvert");
}

ajoutBackdropStock.addEventListener("click", fermerRechercheAjoutStock);

// ============================================
// AUTOCOMPLETE + AJOUT INSTANTANÉ (comme Courses/Calories)
// ============================================

listeAliments.hidden = true;
const items = listeAliments.querySelectorAll("li");

rechercheAliment.addEventListener("input", function () {
  const recherche = normaliserTexte(this.value.toLowerCase());

  if (recherche === "") {
    listeAliments.hidden = true;
    rechercheAliment.classList.remove("recherche-invalide");
    return;
  }

  listeAliments.hidden = false;

  let visibles = 0;
  items.forEach(function (item) {
    item.hidden = !normaliserTexte(item.textContent.toLowerCase()).includes(recherche);
    if (!item.hidden) visibles++;
  });

  rechercheAliment.classList.toggle("recherche-invalide", visibles === 0);
});

// Verrou anti double-tap : sans lui, un 2e tap avant la réponse du 1er créait une vraie 2e ligne en base.
const idsEnCoursAjoutStock = new Set();

// Une suggestion ajoute directement au stock avec une quantité de départ ("plein" ou 1) ; si déjà présent, on met en avant plutôt que dupliquer.
items.forEach(function (item) {
  item.addEventListener("click", function () {
    const type = this.dataset.type; // le type de suivi de cet aliment ("cl", "unite", "pack"...)
    const nom = this.dataset.nom;
    const idAliment = this.dataset.id;
    fermerRechercheAjoutStock();

    const itemExistant = trouverStockItemParNom(nom);
    if (itemExistant) {
      afficherToast("Déjà dans le stock.");
      mettreEnAvantStockItem(itemExistant);
      return;
    }

    if (idsEnCoursAjoutStock.has(idAliment)) return; // déjà en train d'être ajouté, on ignore ce tap en plus

    const quantiteDepart = type === "cl" ? "plein" : 1;
    idsEnCoursAjoutStock.add(idAliment);
    ajouterAuStock(idAliment, quantiteDepart).finally(function () {
      idsEnCoursAjoutStock.delete(idAliment);
    });
  });
});

function trouverStockItemParNom(nom) {
  return Array.from(listeStock.querySelectorAll(".stock-item")).find(function (item) {
    return item.dataset.nom === nom;
  });
}

// Efface tout filtre/recherche qui pourrait cacher la carte, puis scroll + surbrillance.
function mettreEnAvantStockItem(item) {
  if (emplacementActif !== "tous" || typeActif !== "tous") {
    tousLesBoutonsFiltres.forEach(function (b) {
      b.classList.remove("active");
    });
    document.querySelector('.filter-btn[data-emplacement="tous"]').classList.add("active");
    emplacementActif = "tous";
    typeActif = "tous";
  }
  searchInput.value = "";
  appliquerFiltresStock();

  item.scrollIntoView({ behavior: "smooth", block: "center" });
  item.classList.add("mise-en-avant");
  setTimeout(function () {
    item.classList.remove("mise-en-avant");
  }, 1500);
}

// Cliquer n'importe où en dehors de la recherche d'ajout (et du bouton "+" qui l'ouvre) la referme
// et fait immédiatement revenir la recherche du stock à sa place
document.addEventListener("click", function (e) {
  if (autocompleteWrapper.hidden) return;
  if (e.target.closest("#autocomplete") || e.target.closest("#btnToggleAjout")) return;
  fermerRechercheAjoutStock();
});

// ============================================
// FILTRE EMPLACEMENT + RECHERCHE
// ============================================

// Un seul groupe à choix unique : un bouton d'emplacement remet le type à "tous" (et inversement).
const tousLesBoutonsFiltres = document.querySelectorAll(".filters .filter-btn");

tousLesBoutonsFiltres.forEach(function (bouton) {
  bouton.addEventListener("click", function () {
    tousLesBoutonsFiltres.forEach(function (b) {
      b.classList.remove("active");
    });
    this.classList.add("active");

    if (this.dataset.emplacement) {
      emplacementActif = this.dataset.emplacement;
      typeActif = "tous";
    } else {
      typeActif = this.dataset.type;
      emplacementActif = "tous";
    }

    appliquerFiltresStock();
  });
});

searchInput.addEventListener("input", function () {
  appliquerFiltresStock();
});

// Affiche/cache chaque article selon l'emplacement actif, le type actif et la recherche.
function appliquerFiltresStock() {
  const recherche = normaliserTexte(searchInput.value.toLowerCase().trim());
  const stockItems = listeStock.querySelectorAll(".stock-item");
  let visibles = 0;

  stockItems.forEach(function (item) {
    const correspondEmplacement =
      emplacementActif === "tous" || item.dataset.emplacement === emplacementActif;
    const correspondType =
      typeActif === "tous" ||
      (typeActif === "cl" ? item.dataset.trackingType === "cl" : item.dataset.trackingType !== "cl");
    const correspondRecherche = normaliserTexte(item.dataset.nom).includes(recherche);

    if (correspondEmplacement && correspondType && correspondRecherche) {
      item.classList.remove("hidden");
      visibles++;
    } else {
      item.classList.add("hidden");
    }
  });

  noResultsStock.classList.toggle("hidden", visibles > 0);
  searchInput.classList.toggle("recherche-invalide", recherche !== "" && visibles === 0);
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

    if (critere === "quantite-asc" || critere === "quantite-desc") {
      const quantiteA = valeurQuantitePourTri(a);
      const quantiteB = valeurQuantitePourTri(b);
      if (quantiteA !== quantiteB) {
        return critere === "quantite-asc" ? quantiteA - quantiteB : quantiteB - quantiteA;
      }
      // À quantité égale, on départage par ordre alphabétique plutôt que de les laisser dans un ordre au hasard
      return a.dataset.nom.localeCompare(b.dataset.nom);
    }

    // Tri par ancienneté (nombre de jours depuis la dernière mise à jour)
    const joursA = Number(a.dataset.jours);
    const joursB = Number(b.dataset.jours);
    return critere === "ancien" ? joursB - joursA : joursA - joursB;
  });

  // appendChild déplace un élément déjà présent : dans l'ordre trié, ça réorganise toute la liste.
  stockItems.forEach(function (item) {
    listeStock.appendChild(item);
  });
}

// ============================================
// CONSTRUCTION D'UN NOUVEL ITEM STOCK
// ============================================

// Construit le HTML d'un nouvel article de stock, sans recharger la page.
function construireStockItemDOM(item) {
  const div = document.createElement("div");
  const id = escapeHtml(item.id);
  const nom = escapeHtml(item.nom);
  const emoji = escapeHtml(item.emoji);
  const quantite = escapeHtml(item.quantite);
  const niveauCl = classeNiveauCL(item.quantite);

  div.className = "stock-item carte-article";
  div.dataset.id = item.id;
  div.dataset.nom = item.nom.toLowerCase();
  div.dataset.emplacement = item.emplacement;
  div.dataset.trackingType = item.tracking_type;
  div.dataset.jours = 0; // ajouté aujourd'hui
  div.dataset.quantite = item.quantite; // pour que le tri par quantité fonctionne sans recharger
  div.dataset.foodId = item.food_id;
  div.dataset.dejaEnCourses = "false"; // pas de vraie donnée serveur pour ça ici, "false" est sûr

  const infosHtml =
    item.tracking_type === "cl"
      ? `<div class="stock-barre-cl" title="${quantite}"><div class="stock-barre-cl-remplissage ${niveauCl}"></div></div>`
      : `<span class="stock-quantite">${quantite}</span>`;

  const imageHtml = item.image
    ? `<img src="/${escapeHtml(item.image)}" alt="${nom}" class="stock-item__img" />`
    : `<div class="stock-item__emoji">${emoji}</div>`;

  const emplacementTexte =
    item.emplacement === "fg" ? "Frigo" : item.emplacement === "fz" ? "Congélateur" : "Réserve";

  div.innerHTML = `
    ${imageHtml}
    <div class="stock-item__body">
      <div class="stock-item__infos">
        <div class="stock-item__ligne stock-item__ligne--nom">
          <span class="stock-nom">${nom}</span>
        </div>
        <div class="stock-item__ligne stock-item__ligne--meta">
          <span class="stock-emplacement">${emplacementTexte}</span>
          <span class="stock-separateur">|</span>
          <span class="stock-jours">aujourd'hui</span>
        </div>
      </div>
      <div class="stock-editable-zone" data-valeur-actuelle="${quantite}">
        ${infosHtml}
      </div>
    </div>
    <form action="/stock/supprimer" method="post" class="form-supprimer-stock">
      <input type="hidden" name="idStock" value="${id}" />
      <button type="submit" class="btn-supprimer-icone btn-supprimer-dash">Supprimer</button>
    </form>
  `;

  return div;
}

// ============================================
// AJOUT (fetch, sans rechargement)
// ============================================

// Renvoie la promesse (pas juste lancée en l'air) : sert à savoir quand la requête est vraiment terminée.
function ajouterAuStock(idAliment, quantiteDepart) {
  return fetch("/stock/ajouter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idAliment: idAliment, quantiteAliment: quantiteDepart })
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
      ajouterAnimationEntree(nouvelItem);
      trierStock(sortSelect.value); // retrie plutôt que de laisser le nouvel article tout en bas
      appliquerFiltresStock(); // reste caché si un filtre actif ne le concerne pas

      // Amène l'utilisateur sur la carte, là où le tri/filtre actuel l'a placée.
      if (!nouvelItem.classList.contains("hidden")) {
        nouvelItem.scrollIntoView({ behavior: "smooth", block: "center" });
        nouvelItem.classList.add("mise-en-avant");
        setTimeout(function () {
          nouvelItem.classList.remove("mise-en-avant");
        }, 1500);
      }
    })
    .catch(function (err) {
      console.error("Erreur réseau :", err);
      afficherToast("Connexion instable : réessaie dans un instant.");
    });
}

// ============================================
// ÉDITION INLINE PAR CLIC (pas de bouton modifier/enregistrer)
// ============================================

// Garde en mémoire quel article est actuellement "ouvert" en mode édition (un seul à la fois)
let itemOuvertActuellement = null;

// Active le comportement "cliquer pour éditer" sur un article de stock donné
function activerEditionInline(item) {
  const zone = item.querySelector(".stock-editable-zone");
  const trackingType = item.dataset.trackingType;

  item.addEventListener("click", function (e) {
    // Ignore les clics sur le bouton/formulaire de suppression
    if (e.target.closest(".form-supprimer-stock")) return;

    // Ignore les clics sur le champ éditable lui-même (laisser taper/choisir normalement)
    if (e.target.closest(".stock-quantite-edit, .stock-cl-edit, .custom-select")) return;

    if (!item.classList.contains("en-edition")) {
      fermerItemOuvert(); // referme (et sauvegarde) l'article déjà ouvert, s'il y en a un
      ouvrirEdition(item, zone, trackingType);
      itemOuvertActuellement = item;
    } else {
      fermerEditionEtSauvegarder(item, zone, trackingType);
      itemOuvertActuellement = null;
    }
  });
}

// Ferme (et sauvegarde) l'article actuellement ouvert en édition, s'il y en a un
function fermerItemOuvert() {
  if (!itemOuvertActuellement) return;
  const autreItem = itemOuvertActuellement;
  const autreZone = autreItem.querySelector(".stock-editable-zone");
  const autreTracking = autreItem.dataset.trackingType;
  fermerEditionEtSauvegarder(autreItem, autreZone, autreTracking);
  itemOuvertActuellement = null;
}

// composedPath() (pas e.target.closest) : ouvrirEdition() détache e.target du DOM dans le même
// clic (zone.innerHTML = ""), donc closest() y retomberait toujours à null.
document.addEventListener("click", function (e) {
  if (itemOuvertActuellement && !e.composedPath().some(function (el) { return el.classList && el.classList.contains("stock-item"); })) {
    fermerItemOuvert();
  }
});

// Transforme l'affichage normal d'un article en champ modifiable (input nombre ou menu déroulant)
function ouvrirEdition(item, zone, trackingType) {
  item.classList.add("en-edition");
  const valeurActuelle = zone.dataset.valeurActuelle;

  if (trackingType === "cl") {
    const select = document.createElement("select");
    select.className = "stock-cl-edit anim-fondu";
    // Transformé en menu personnalisé par custom-selects.js (liste posée sur <body>, jamais cachée sous une carte voisine).
    OPTIONS_CL.forEach(function (option) {
      const opt = document.createElement("option");
      opt.value = option.valeur;
      opt.textContent = option.texte;
      if (option.valeur === valeurActuelle) opt.selected = true;
      select.appendChild(opt);
    });
    zone.innerHTML = "";
    zone.appendChild(select);
    ajouterBoutonCoursesSiBas(item, zone, valeurActuelle, trackingType);
  } else {
    const input = document.createElement("input");
    input.type = "number";
    input.className = "stock-quantite-edit anim-fondu";
    input.value = valeurActuelle;
    input.min = "0";
    input.step = "1"; // toujours un entier côté serveur (cast SQL ::integer dans /courses/acheter)

    // Les boutons de soustraction rapide vont sur leur propre ligne en dessous (.stock-edition-colonne).
    const ligneInput = document.createElement("div");
    ligneInput.className = "stock-edition-ligne";
    ligneInput.appendChild(input);

    zone.innerHTML = "";
    zone.classList.add("stock-edition-colonne");
    zone.appendChild(ligneInput);
    input.focus();
    input.select();
    ajouterBoutonCoursesSiBas(item, ligneInput, valeurActuelle, trackingType);
    ajouterBoutonsSoustraction(item, zone, input, valeurActuelle, trackingType);
  }
}

// N'apparaît qu'en mode édition, si la quantité est basse et pas déjà dans la liste de courses.
function ajouterBoutonCoursesSiBas(item, conteneur, valeurActuelle, trackingType) {
  if (!estQuantiteBasse(valeurActuelle, trackingType) || item.dataset.dejaEnCourses === "true") return;
  conteneur.insertAdjacentHTML("beforeend", htmlBoutonAjouterCourses(item.dataset.foodId));
  activerBoutonAjouterCourses(item);
}

// "-1/-2/-5" (unité/pack) : soustrait, enregistre et ferme en un geste. N'apparaît que si ça ne passe pas sous zéro.
function ajouterBoutonsSoustraction(item, zone, input, valeurActuelle, trackingType) {
  const actuel = Number(valeurActuelle);
  if (!actuel) return;

  const valeursDisponibles = [1, 2, 5].filter(function (v) { return v <= actuel; });
  if (valeursDisponibles.length === 0) return;

  const rangee = document.createElement("div");
  rangee.className = "stock-quick-subtract";
  valeursDisponibles.forEach(function (valeur) {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "suggestion";
    // Le signe "−" dans son propre span (plus petit, voir CSS) : à la même taille que le chiffre,
    // il dominait visuellement le bouton et le rendait plus dur à lire qu'un simple chiffre.
    bouton.innerHTML = '<span class="signe-mini">−</span>' + valeur;
    bouton.addEventListener("click", function (e) {
      // Empêche ce clic de rouvrir l'édition juste après l'avoir fermée (même raison que
      // .btn-ajouter-courses : toute la carte est cliquable, voir activerEditionInline)
      e.stopPropagation();
      input.value = actuel - valeur;
      fermerEditionEtSauvegarder(item, zone, trackingType);
    });
    rangee.appendChild(bouton);
  });
  zone.appendChild(rangee);
}

// Si la valeur a changé, l'enregistre côté serveur ; sinon revient juste à l'affichage normal.
function fermerEditionEtSauvegarder(item, zone, trackingType) {
  zone.classList.remove("stock-edition-colonne"); // sinon l'affichage normal resterait empilé

  const champ = zone.querySelector(".stock-quantite-edit, .stock-cl-edit");
  const nouvelleValeur = champ ? champ.value : zone.dataset.valeurActuelle;
  const valeurActuelle = zone.dataset.valeurActuelle;

  if (!nouvelleValeur || nouvelleValeur === valeurActuelle) {
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
        alert(data.erreur); // annule visuellement le changement
        zone.innerHTML = construireAffichageStatique(valeurActuelle, trackingType);
        item.classList.remove("en-edition");
        return;
      }

      zone.dataset.valeurActuelle = data.quantite;
      item.dataset.quantite = data.quantite; // pour que le tri par quantité reste juste sans recharger
      zone.innerHTML = construireAffichageStatique(data.quantite, trackingType);
      item.classList.remove("en-edition");

      item.classList.add("maj-flash");
      setTimeout(function () {
        item.classList.remove("maj-flash");
      }, 600);
    });
}

// Affichage hors édition ("Ajouter aux courses" n'apparaît qu'en édition, jamais ici).
function construireAffichageStatique(valeur, trackingType) {
  const valeurHtml = escapeHtml(valeur);

  if (trackingType === "cl") {
    return `<div class="stock-barre-cl anim-fondu" title="${valeurHtml}"><div class="stock-barre-cl-remplissage ${classeNiveauCL(valeur)}"></div></div>`;
  }
  return `<span class="stock-quantite anim-fondu">${valeurHtml}</span>`;
}

function classeNiveauCL(valeur) {
  if (valeur === "plein") return "niveau-plein";
  if (valeur === "à moitié") return "niveau-moitie";
  if (valeur === "presque vide") return "niveau-presque-vide";
  return "niveau-vide";
}

// ============================================
// SUPPRIMER (fetch + animation de sortie)
// ============================================

function activerItemSuppression(item) {
  const form = item.querySelector(".form-supprimer-stock");

  form.addEventListener("submit", function (event) {
    event.preventDefault(); // pas de rechargement, on envoie en fetch()

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

// Au chargement de la page, on active l'édition inline et la suppression
// pour tous les articles de stock déjà présents dans le HTML (générés par le serveur)
document.querySelectorAll(".stock-item").forEach(function (item) {
  activerEditionInline(item);
  activerItemSuppression(item);
});

// Trie la liste selon la valeur par défaut du select au chargement
trierStock(sortSelect.value);

// ============================================
// BASCULE VUE GRILLE / VUE LISTE
// ============================================
// Les deux vues réutilisent exactement le même HTML (généré côté serveur) : seule la classe
// "vue-liste" sur #listeStock change, et c'est le CSS qui réarrange chaque carte en ligne.

function appliquerVueStock(vue) {
  listeStock.classList.toggle("vue-liste", vue === "liste");
  btnVueGrille.classList.toggle("active", vue !== "liste");
  btnVueListe.classList.toggle("active", vue === "liste");
}

// On se souvient de la vue choisie précédemment, comme pour le mode magasin de la page Courses
const vueStockSauvegardee = localStorage.getItem("vueStock") === "liste" ? "liste" : "grille";
appliquerVueStock(vueStockSauvegardee);

btnVueGrille.addEventListener("click", function () {
  appliquerVueStock("grille");
  localStorage.setItem("vueStock", "grille");
});

btnVueListe.addEventListener("click", function () {
  appliquerVueStock("liste");
  localStorage.setItem("vueStock", "liste");
});

// ============================================
// BOUTON "✕" POUR VIDER UN CHAMP DE RECHERCHE (mobile uniquement, voir style.css)
// ============================================
document.querySelectorAll(".btn-effacer-recherche").forEach(function (bouton) {
  const input = document.getElementById(bouton.dataset.cible);
  if (!input) return;

  function majVisibiliteBoutonEffacer() {
    bouton.classList.toggle("visible", input.value.length > 0);
  }
  input.addEventListener("input", majVisibiliteBoutonEffacer);
  majVisibiliteBoutonEffacer();

  bouton.addEventListener("click", function () {
    input.value = "";
    input.dispatchEvent(new Event("input"));
    input.focus();
  });
});
