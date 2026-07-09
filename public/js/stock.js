// ============================================
// RÉCUPÉRATION DES ÉLÉMENTS HTML DE LA PAGE
// ============================================
// On récupère une bonne fois pour toutes tous les éléments HTML dont on aura besoin,
// pour ne pas avoir à les rechercher à chaque fois dans le code plus bas.

const rechercheAliment = document.getElementById("rechercheAliment"); // champ de recherche pour ajouter un aliment
const listeAliments = document.getElementById("listeAliments"); // liste déroulante des suggestions d'aliments
const idAlimentCache = document.getElementById("idAlimentCache"); // champ caché qui stocke l'id de l'aliment choisi
const champQuantite = document.getElementById("champQuantite"); // champ nombre (pour unités/packs)
const champCL = document.getElementById("champCL"); // liste déroulante (pour les aliments suivis en "cl", ex: plein/vide)
const btnAjouter = document.getElementById("btnAjouter"); // bouton "Ajouter"
const formAjouterStock = document.getElementById("formAjouterStock"); // formulaire complet d'ajout au stock
const listeStock = document.getElementById("listeStock"); // conteneur qui affiche tous les articles du stock

const searchInput = document.getElementById("searchInput"); // champ de recherche dans le stock déjà présent
const sortSelect = document.getElementById("sortSelect"); // menu déroulant de tri (Nom/Ancien/Récent/Quantité)
const noResultsStock = document.getElementById("noResultsStock"); // message affiché quand aucun résultat ne correspond

const btnToggleAjout = document.getElementById("btnToggleAjout"); // bouton pour ouvrir/fermer le panneau d'ajout
const panneauAjoutStock = document.getElementById("panneauAjoutStock"); // le panneau (formulaire) d'ajout lui-même

const btnVueGrille = document.getElementById("btnVueGrille"); // bouton "vue grille" (cartes)
const btnVueListe = document.getElementById("btnVueListe"); // bouton "vue liste" (articles empilés)

// Variables qui gardent en mémoire quel filtre est actuellement actif ("tous" par défaut).
// Emplacement et type de suivi partagent un seul groupe de boutons à choix unique (voir plus
// bas) : un seul des deux peut être différent de "tous" à la fois.
let emplacementActif = "tous";
let typeActif = "tous";

// Petite fonction de sécurité : transforme les caractères spéciaux (<, >, ", etc.)
// en leur équivalent HTML pour éviter d'injecter du code HTML/JS dans la page (faille XSS)
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Liste des niveaux possibles pour les aliments suivis en "cl" (comme une bouteille : pleine, à moitié, etc.)
// "valeur" = ce qui est stocké en base de données, "texte" = ce qui est affiché à l'utilisateur
const OPTIONS_CL = [
  { valeur: "plein", texte: "Plein" },
  { valeur: "à moitié", texte: "À moitié" },
  { valeur: "presque vide", texte: "Presque vide" },
  { valeur: "vide", texte: "Vide" }
];

// Pour trier les articles "cl" par quantité, on donne un rang numérique à chaque niveau
// (0 = le moins rempli, 3 = le plus rempli) puisque "plein"/"vide" ne sont pas des nombres
const RANG_NIVEAU_CL = {
  vide: 0,
  "presque vide": 1,
  "à moitié": 2,
  plein: 3
};

// Renvoie une valeur numérique comparable pour trier un article par quantité, qu'il soit
// suivi en nombre (unités/packs) ou en niveau (cl)
function valeurQuantitePourTri(item) {
  if (item.dataset.trackingType === "cl") {
    return RANG_NIVEAU_CL[item.dataset.quantite] ?? 0;
  }
  return Number(item.dataset.quantite) || 0;
}

// ============================================
// PANNEAU D'AJOUT (repliable)
// ============================================

// Quand on clique sur "+ Ajouter un aliment", on ouvre/ferme le panneau du formulaire.
// La classe "ouvert" pilote une vraie animation de hauteur (voir .panneau-ajout dans style.css),
// au lieu d'un simple show/hide instantané.
btnToggleAjout.addEventListener("click", function () {
  const estOuvert = panneauAjoutStock.classList.toggle("ouvert");
  if (!estOuvert) {
    // On ferme : on retire "pret" tout de suite pour que l'animation de fermeture
    // parte bien d'un panneau "coupé" (overflow:hidden), voir style.css
    panneauAjoutStock.classList.remove("pret");
  } else {
    // On ouvre : le curseur se place directement dans le champ de recherche du panneau,
    // pour pouvoir taper tout de suite sans avoir à cliquer dedans en plus
    rechercheAliment.focus();
  }
});

// Une fois l'animation d'ouverture terminée, on ajoute "pret" : le panneau repasse en overflow:visible,
// pour que la liste de suggestions (qui dépasse volontairement sous le panneau) redevienne visible
panneauAjoutStock.addEventListener("transitionend", function (event) {
  if (event.propertyName === "grid-template-rows" && panneauAjoutStock.classList.contains("ouvert")) {
    panneauAjoutStock.classList.add("pret");
  }
});

// ============================================
// AUTOCOMPLETE + RÉVÉLATION DU BON CHAMP
// ============================================

// Au départ, la liste de suggestions est cachée
listeAliments.hidden = true;
// On récupère tous les éléments <li> (un par aliment) présents dans la liste de suggestions
const items = listeAliments.querySelectorAll("li");

// Quand l'utilisateur tape dans le champ de recherche d'aliment...
rechercheAliment.addEventListener("input", function () {
  // On réinitialise la sélection précédente : tant qu'on n'a pas re-choisi un aliment dans la liste,
  // on ne sait pas encore lequel c'est, donc le bouton Ajouter reste désactivé
  idAlimentCache.value = "";
  btnAjouter.disabled = true;

  // On cache et on vide les deux champs de quantité (nombre et niveau cl),
  // ils ne seront réaffichés qu'une fois qu'un aliment aura été choisi dans la liste
  champQuantite.classList.add("hidden");
  champQuantite.disabled = true;
  champQuantite.value = "";

  champCL.classList.add("hidden");
  champCL.disabled = true;
  champCL.selectedIndex = 0;

  const recherche = this.value.toLowerCase();

  // Si le champ est vide, on cache la liste de suggestions et on s'arrête là
  if (recherche === "") {
    listeAliments.hidden = true;
    return;
  }

  listeAliments.hidden = false;

  // On parcourt tous les aliments disponibles et on affiche tous ceux qui contiennent le texte tapé.
  // Aucune limite de nombre : si la liste est longue, elle défile (voir max-height dans style.css)
  items.forEach(function (item) {
    item.hidden = !item.textContent.toLowerCase().includes(recherche);
  });
});

// (mode d'édition retiré : le tap fonctionne partout, tout le temps)

// Quand on clique sur un aliment proposé dans la liste de suggestions...
items.forEach(function (item) {
  item.addEventListener("click", function () {
    const type = this.dataset.type; // le type de suivi de cet aliment ("cl", "unite", "pack"...)
    idAlimentCache.value = this.dataset.id; // on mémorise l'id de l'aliment choisi
    rechercheAliment.value = this.textContent.trim(); // on affiche son nom dans le champ de recherche
    listeAliments.hidden = true; // on referme la liste de suggestions

    if (type === "cl") {
      // Aliment suivi par niveau (ex: bouteille) : on affiche le menu déroulant plein/vide/etc.
      champCL.classList.remove("hidden");
      champCL.disabled = false;
      champQuantite.classList.add("hidden");
      champQuantite.disabled = true;
      champQuantite.value = "";
    } else {
      // Aliment suivi par quantité (unités, packs) : on affiche le champ nombre
      champQuantite.classList.remove("hidden");
      champQuantite.disabled = false;
      champCL.classList.add("hidden");
      champCL.disabled = true;
    }
  });
});

// Le bouton "Ajouter" ne devient cliquable que si une quantité a été saisie
champQuantite.addEventListener("input", function () {
  btnAjouter.disabled = this.value.trim() === "";
});

// Le bouton "Ajouter" ne devient cliquable que si un niveau (cl) a été choisi
champCL.addEventListener("change", function () {
  btnAjouter.disabled = this.value === "";
});

// Si l'utilisateur clique n'importe où en dehors de la zone d'autocomplétion, on referme la liste de suggestions
document.addEventListener("click", function (e) {
  if (!document.getElementById("autocomplete").contains(e.target)) {
    listeAliments.hidden = true;
  }
});

// ============================================
// FILTRE EMPLACEMENT + RECHERCHE
// ============================================

// Tous / Frigo / Congélateur / Réserve / Niveau / Pièces forment un seul groupe à choix
// unique : cliquer sur n'importe lequel désactive tous les autres, même s'ils ne répondent
// pas à la même question (emplacement vs type de suivi). Un bouton d'emplacement remet donc
// le filtre de type à "tous" (et inversement), plutôt que de les combiner.
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

// Quand l'utilisateur tape dans la barre de recherche du stock, on filtre en direct
searchInput.addEventListener("input", function () {
  appliquerFiltresStock();
});

// Cette fonction affiche/cache chaque article du stock selon :
// 1) le filtre d'emplacement actif (tous, frigo, congélateur, réserve)
// 2) le filtre de type actif (tous types, bouteilles = "cl", pièces = tout le reste)
// 3) le texte tapé dans la barre de recherche
function appliquerFiltresStock() {
  const recherche = searchInput.value.toLowerCase().trim();
  const stockItems = listeStock.querySelectorAll(".stock-item");
  let visibles = 0;

  stockItems.forEach(function (item) {
    const correspondEmplacement =
      emplacementActif === "tous" || item.dataset.emplacement === emplacementActif;
    const correspondType =
      typeActif === "tous" ||
      (typeActif === "cl" ? item.dataset.trackingType === "cl" : item.dataset.trackingType !== "cl");
    const correspondRecherche = item.dataset.nom.includes(recherche);

    if (correspondEmplacement && correspondType && correspondRecherche) {
      item.classList.remove("hidden");
      visibles++;
    } else {
      item.classList.add("hidden");
    }
  });

  // Si aucun article n'est visible après filtrage, on affiche le message "Aucun article ne correspond"
  noResultsStock.classList.toggle("hidden", visibles > 0);
}

// ============================================
// TRI
// ============================================

// Quand on change la valeur du menu déroulant de tri, on retrie la liste
sortSelect.addEventListener("change", function () {
  trierStock(this.value);
});

// Trie les articles du stock selon le critère choisi, puis les réinsère dans le bon ordre dans la page
function trierStock(critere) {
  const stockItems = Array.from(listeStock.querySelectorAll(".stock-item"));

  stockItems.sort(function (a, b) {
    if (critere === "alpha") {
      // Tri alphabétique par nom
      return a.dataset.nom.localeCompare(b.dataset.nom);
    }

    if (critere === "quantite-asc" || critere === "quantite-desc") {
      // Tri par quantité : les articles "cl" sont convertis en rang 0-3 (voir RANG_NIVEAU_CL)
      // pour pouvoir être comparés aux articles suivis en nombre (unités/packs)
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

  // appendChild sur un élément déjà présent dans la page le déplace simplement à la fin :
  // en le faisant dans l'ordre trié, on réorganise visuellement toute la liste
  stockItems.forEach(function (item) {
    listeStock.appendChild(item);
  });
}

// ============================================
// CONSTRUCTION D'UN NOUVEL ITEM STOCK
// ============================================

// Construit dynamiquement (en JavaScript) le bloc HTML d'un nouvel article de stock,
// pour pouvoir l'ajouter à la page sans avoir à recharger toute la page
function construireStockItemDOM(item) {
  const div = document.createElement("div");
  // On échappe les valeurs texte pour éviter d'insérer du HTML dangereux dans la page
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
  div.dataset.jours = 0; // un article tout juste ajouté a été mis à jour "aujourd'hui" (0 jour)
  div.dataset.quantite = item.quantite; // nécessaire pour que le tri par quantité fonctionne tout de suite, sans recharger la page

  // Selon le type de suivi, on affiche soit une barre de niveau (cl), soit un simple nombre
  const infosHtml =
    item.tracking_type === "cl"
      ? `<div class="stock-barre-cl" title="${quantite}"><div class="stock-barre-cl-remplissage ${niveauCl}"></div></div>`
      : `<span class="stock-quantite">${quantite}</span>`;

  // On affiche la vraie photo si l'aliment en a une, sinon l'emoji comme solution de secours
  // (même logique que côté serveur dans views/stock.ejs)
  const imageHtml = item.image
    ? `<img src="/${escapeHtml(item.image)}" alt="${nom}" class="stock-item__img" />`
    : `<div class="stock-item__emoji">${emoji}</div>`;

  // Même étiquette d'emplacement que côté serveur (voir views/stock.ejs)
  const emplacementTexte =
    item.emplacement === "fg" ? "Frigo" : item.emplacement === "fz" ? "Congélateur" : "Réserve";

  // Même structure que les cartes générées côté serveur (voir views/stock.ejs)
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

// Quand on valide le formulaire d'ajout au stock...
formAjouterStock.addEventListener("submit", function (event) {
  // On empêche le comportement par défaut du formulaire (qui rechargerait toute la page)
  event.preventDefault();

  // On récupère toutes les données du formulaire et on les transforme en objet JavaScript simple
  const donnees = new FormData(formAjouterStock);
  const objet = {};
  donnees.forEach(function (valeur, cle) {
    objet[cle] = valeur;
  });

  // On envoie ces données au serveur en JSON, sans recharger la page (fetch = requête en arrière-plan)
  fetch("/stock/ajouter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(objet)
  })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      // Si le serveur renvoie une erreur, on l'affiche simplement dans une alerte
      if (data.erreur) {
        alert(data.erreur);
        return;
      }

      // Sinon, on construit le nouvel article et on l'ajoute à la liste affichée à l'écran
      const nouvelItem = construireStockItemDOM(data.item);
      listeStock.appendChild(nouvelItem);
      // On active pour ce nouvel article les mêmes comportements que les autres (édition, suppression)
      activerEditionInline(nouvelItem);
      activerItemSuppression(nouvelItem);
      // Petite classe CSS pour une animation d'apparition
      nouvelItem.classList.add("entree");
      // On retrie toute la liste (avec le nouvel article dedans) selon le tri actuellement choisi,
      // au lieu de laisser le nouvel article toujours coincé tout en bas
      trierStock(sortSelect.value);

      // On réinitialise le formulaire pour permettre un nouvel ajout
      rechercheAliment.value = "";
      idAlimentCache.value = "";
      champQuantite.value = "";
      champQuantite.classList.add("hidden");
      champQuantite.disabled = true;
      champCL.selectedIndex = 0;
      champCL.classList.add("hidden");
      champCL.disabled = true;
      btnAjouter.disabled = true;

      // On referme le panneau d'ajout automatiquement après un ajout réussi
      panneauAjoutStock.classList.remove("ouvert");
      panneauAjoutStock.classList.remove("pret");
    });
});

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
      // Si un autre article était déjà ouvert, on le referme (et on sauvegarde) avant d'ouvrir celui-ci
      fermerItemOuvert();
      ouvrirEdition(item, zone, trackingType);
      itemOuvertActuellement = item;
    } else {
      // Si l'article est déjà ouvert, un second clic referme et sauvegarde
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

// Cliquer en dehors de tous les items ferme et sauvegarde celui qui est ouvert
document.addEventListener("click", function (e) {
  if (itemOuvertActuellement && !e.target.closest(".stock-item")) {
    fermerItemOuvert();
  }
});

// Transforme l'affichage normal d'un article en champ modifiable (input nombre ou menu déroulant)
function ouvrirEdition(item, zone, trackingType) {
  item.classList.add("en-edition");
  const valeurActuelle = zone.dataset.valeurActuelle;

  if (trackingType === "cl") {
    // Cas "cl" : on affiche un menu déroulant avec les niveaux possibles
    const select = document.createElement("select");
    select.className = "stock-cl-edit anim-fondu";
    // Transformé en menu déroulant personnalisé par custom-selects.js (sa liste ouverte est
    // maintenant posée sur <body>, positionnée par rapport à l'écran : elle ne peut plus se
    // retrouver cachée sous une carte voisine, voir custom-selects.js et .custom-select__list)
    OPTIONS_CL.forEach(function (option) {
      const opt = document.createElement("option");
      opt.value = option.valeur;
      opt.textContent = option.texte;
      if (option.valeur === valeurActuelle) opt.selected = true; // on présélectionne la valeur actuelle
      select.appendChild(opt);
    });
    zone.innerHTML = "";
    zone.appendChild(select);
  } else {
    // Cas "unité"/"pack" : on affiche un simple champ nombre, avec la valeur actuelle déjà remplie
    const input = document.createElement("input");
    input.type = "number";
    input.className = "stock-quantite-edit anim-fondu";
    input.value = valeurActuelle;
    input.min = "0";
    zone.innerHTML = "";
    zone.appendChild(input);
    input.focus(); // le curseur se place directement dans le champ
    input.select(); // et le texte existant est sélectionné, pour pouvoir le remplacer facilement
  }
}

// Referme le mode édition d'un article : si la valeur a changé, on l'enregistre côté serveur
function fermerEditionEtSauvegarder(item, zone, trackingType) {
  const champ = zone.querySelector(".stock-quantite-edit, .stock-cl-edit");
  const nouvelleValeur = champ ? champ.value : zone.dataset.valeurActuelle;
  const valeurActuelle = zone.dataset.valeurActuelle;

  if (!nouvelleValeur || nouvelleValeur === valeurActuelle) {
    // Rien n'a changé : on revient simplement à l'affichage normal, pas besoin d'appeler le serveur
    zone.innerHTML = construireAffichageStatique(valeurActuelle, trackingType);
    item.classList.remove("en-edition");
    return;
  }

  // La valeur a changé : on envoie la nouvelle quantité au serveur pour l'enregistrer en base de données
  fetch("/stock/modifier", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idStock: item.dataset.id, nouvelleQuantite: nouvelleValeur })
  })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data.erreur) {
        // En cas d'erreur, on revient à l'affichage précédent (on annule visuellement le changement)
        alert(data.erreur);
        zone.innerHTML = construireAffichageStatique(valeurActuelle, trackingType);
        item.classList.remove("en-edition");
        return;
      }

      // Succès : on met à jour l'affichage avec la nouvelle valeur confirmée par le serveur
      zone.dataset.valeurActuelle = data.quantite;
      item.dataset.quantite = data.quantite; // pour que le tri par quantité reste juste sans recharger la page
      zone.innerHTML = construireAffichageStatique(data.quantite, trackingType);
      item.classList.remove("en-edition");

      // Petit effet visuel (flash) pour indiquer que la mise à jour a bien été prise en compte
      item.classList.add("maj-flash");
      setTimeout(function () {
        item.classList.remove("maj-flash");
      }, 600);
    });
}

// Construit le petit bout de HTML affiché normalement (hors édition) pour une valeur donnée
function construireAffichageStatique(valeur, trackingType) {
  const valeurHtml = escapeHtml(valeur);

  if (trackingType === "cl") {
    return `<div class="stock-barre-cl anim-fondu" title="${valeurHtml}"><div class="stock-barre-cl-remplissage ${classeNiveauCL(valeur)}"></div></div>`;
  }
  return `<span class="stock-quantite anim-fondu">${valeurHtml}</span>`;
}

// Renvoie le nom de la classe CSS correspondant au niveau de remplissage (pour la barre visuelle "cl")
function classeNiveauCL(valeur) {
  if (valeur === "plein") return "niveau-plein";
  if (valeur === "à moitié") return "niveau-moitie";
  if (valeur === "presque vide") return "niveau-presque-vide";
  return "niveau-vide";
}

// ============================================
// SUPPRIMER (fetch + animation de sortie)
// ============================================

// Active le comportement de suppression (via fetch, sans recharger la page) pour un article donné
function activerItemSuppression(item) {
  const form = item.querySelector(".form-supprimer-stock");

  form.addEventListener("submit", function (event) {
    // On empêche l'envoi classique du formulaire (qui rechargerait la page)
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

        // On ajoute une classe qui déclenche une animation de disparition,
        // puis on retire réellement l'élément de la page une fois l'animation terminée (300ms)
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
