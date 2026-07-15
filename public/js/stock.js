// ============================================
// RÉCUPÉRATION DES ÉLÉMENTS HTML DE LA PAGE
// ============================================
// On récupère une bonne fois pour toutes tous les éléments HTML dont on aura besoin,
// pour ne pas avoir à les rechercher à chaque fois dans le code plus bas.

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

// Variables qui gardent en mémoire quel filtre est actuellement actif ("tous" par défaut).
// Emplacement et type de suivi partagent un seul groupe de boutons à choix unique (voir plus
// bas) : un seul des deux peut être différent de "tous" à la fois.
let emplacementActif = "tous";
let typeActif = "tous";

// Retire les accents ("é" -> "e", "à" -> "a"...) pour que la recherche les ignore : taper "e"
// doit trouver "Café" aussi bien que "Cafe". NFD décompose chaque lettre accentuée en deux
// caractères (la lettre de base + un accent séparé), qu'on peut ensuite retirer avec la regex
// (plage Unicode des signes diacritiques combinants).
function normaliserTexte(str) {
  return str.normalize("NFD").replace(new RegExp("[̀-ͯ]", "g"), "");
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

// "Bas" : pour un aliment suivi en "cl" (bouteille), les deux niveaux les plus bas ; pour les
// autres (unité/pack), moins de 2 restants. Même logique que côté serveur (voir chercherStock/stock.ejs).
function estQuantiteBasse(valeur, trackingType) {
  if (trackingType === "cl") return valeur === "presque vide" || valeur === "vide";
  return Number(valeur) < 2;
}

// HTML du bouton "Ajouter aux courses" (icône seule, voir .btn-ajouter-courses dans style.css)
function htmlBoutonAjouterCourses(foodId) {
  return `<button type="button" class="btn-ajouter-courses" data-food-id="${escapeHtml(foodId)}" title="Ajouter aux courses"></button>`;
}

// Câble le clic sur le bouton "Ajouter aux courses" d'un article, s'il est présent : l'ajoute à
// la liste de courses via fetch, puis fait disparaître le bouton (jamais reproposé tant qu'il y
// reste, voir data-deja-en-courses posé ici après coup).
function activerBoutonAjouterCourses(item) {
  const bouton = item.querySelector(".btn-ajouter-courses");
  if (!bouton) return;

  bouton.addEventListener("click", function (e) {
    // Empêche ce clic d'ouvrir aussi le mode édition de la quantité (toute la carte est cliquable)
    e.stopPropagation();
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
// RECHERCHE D'AJOUT (remplace la recherche du stock, jamais les deux ensemble)
// ============================================

// Les deux barres ne peuvent pas servir en même temps : cliquer sur "+" fait disparaître la
// recherche du stock et fait apparaître celle d'ajout à sa place (même emplacement dans la ligne).
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
  // Assombrit le reste de la page pour concentrer l'attention sur la recherche d'ajout
  ajoutBackdropStock.classList.add("ouvert");
  // Reprend ce qui était tapé dans la recherche du stock : si elle ne trouvait rien, c'est
  // probablement que cet aliment n'est pas encore dans le stock — pas la peine de retaper le
  // même texte ici. "select()" plutôt que juste focus() : un tap sur "+" pour chercher autre
  // chose doit pouvoir remplacer ce texte d'un coup, pas devoir l'effacer à la main d'abord.
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

// Cliquer sur le fond assombri referme aussi (même geste que la fiche recette de Calories)
ajoutBackdropStock.addEventListener("click", fermerRechercheAjoutStock);

// ============================================
// AUTOCOMPLETE + AJOUT INSTANTANÉ (comme Courses/Calories)
// ============================================

// Au départ, la liste de suggestions est cachée
listeAliments.hidden = true;
// On récupère tous les éléments <li> (un par aliment) présents dans la liste de suggestions
const items = listeAliments.querySelectorAll("li");

// Quand l'utilisateur tape dans le champ de recherche d'aliment...
rechercheAliment.addEventListener("input", function () {
  const recherche = normaliserTexte(this.value.toLowerCase());

  // Si le champ est vide, on cache la liste de suggestions et on s'arrête là
  if (recherche === "") {
    listeAliments.hidden = true;
    return;
  }

  listeAliments.hidden = false;

  // On parcourt tous les aliments disponibles et on affiche tous ceux qui contiennent le texte tapé.
  // Aucune limite de nombre : si la liste est longue, elle défile (voir max-height dans style.css).
  // normaliserTexte des deux côtés : taper "e" doit aussi trouver "Café" (accents ignorés).
  items.forEach(function (item) {
    item.hidden = !normaliserTexte(item.textContent.toLowerCase()).includes(recherche);
  });
});

// Toucher une suggestion ajoute directement l'aliment au stock, avec une quantité de départ
// par défaut ("plein" pour un niveau, 1 pour une quantité) : la valeur exacte se corrige
// ensuite directement sur la carte, pas besoin d'un second champ + bouton "Ajouter" séparés.
// Si l'aliment choisi est déjà dans le stock (pas de doublon possible), on ne l'ajoute pas :
// on amène directement l'utilisateur sur la carte déjà existante, avec le même effet visuel
// (surbrillance + défilement) que pour un ajout réussi.
items.forEach(function (item) {
  item.addEventListener("click", function () {
    const type = this.dataset.type; // le type de suivi de cet aliment ("cl", "unite", "pack"...)
    const nom = this.dataset.nom;
    fermerRechercheAjoutStock();

    const itemExistant = trouverStockItemParNom(nom);
    if (itemExistant) {
      mettreEnAvantStockItem(itemExistant);
      return;
    }

    const quantiteDepart = type === "cl" ? "plein" : 1;
    ajouterAuStock(this.dataset.id, quantiteDepart);
  });
});

// Cherche, parmi les articles déjà affichés dans le stock, celui qui correspond à ce nom
function trouverStockItemParNom(nom) {
  return Array.from(listeStock.querySelectorAll(".stock-item")).find(function (item) {
    return item.dataset.nom === nom;
  });
}

// Amène l'utilisateur directement sur une carte de stock donnée : on efface d'abord tout filtre
// ou recherche qui pourrait la cacher, puis on y défile en douceur avec une petite surbrillance
function mettreEnAvantStockItem(item) {
  // On remet le filtre à "Tous" et on vide la recherche du stock, sinon la carte pourrait
  // rester invisible (cachée par un filtre actif) malgré le défilement
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
  const recherche = normaliserTexte(searchInput.value.toLowerCase().trim());
  const stockItems = listeStock.querySelectorAll(".stock-item");
  let visibles = 0;

  stockItems.forEach(function (item) {
    const correspondEmplacement =
      emplacementActif === "tous" || item.dataset.emplacement === emplacementActif;
    const correspondType =
      typeActif === "tous" ||
      (typeActif === "cl" ? item.dataset.trackingType === "cl" : item.dataset.trackingType !== "cl");
    // normaliserTexte ignore les accents ("e" trouve aussi "Café") ; dataset.nom est déjà en
    // minuscules (voir stock.ejs/construireStockItemDOM), il ne reste qu'à retirer les accents
    const correspondRecherche = normaliserTexte(item.dataset.nom).includes(recherche);

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
  div.dataset.foodId = item.food_id;
  // Un article qu'on vient d'ajouter n'est presque jamais déjà dans la liste de courses ; pas de
  // vraie donnée du serveur pour ça ici (voir /stock/ajouter), donc "false" par défaut est sûr.
  div.dataset.dejaEnCourses = "false";

  // Selon le type de suivi, on affiche soit une barre de niveau (cl), soit un simple nombre
  // ("Ajouter aux courses" n'apparaît qu'en mode édition, voir ouvrirEdition)
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

// Ajoute un aliment au stock (appelé au tap sur une suggestion, voir plus haut), avec une
// quantité de départ déjà décidée (pas de deuxième étape de saisie avant l'ajout)
function ajouterAuStock(idAliment, quantiteDepart) {
  fetch("/stock/ajouter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idAliment: idAliment, quantiteAliment: quantiteDepart })
  })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      // Si le serveur renvoie une erreur, on l'affiche simplement dans une alerte
      if (data.erreur) {
        alert(data.erreur);
        return;
      }

      // On construit le nouvel article et on l'ajoute à la liste affichée à l'écran
      const nouvelItem = construireStockItemDOM(data.item);
      listeStock.appendChild(nouvelItem);
      // On active pour ce nouvel article les mêmes comportements que les autres (édition, suppression)
      activerEditionInline(nouvelItem);
      activerItemSuppression(nouvelItem);
      // Petite classe CSS pour une animation d'apparition
      ajouterAnimationEntree(nouvelItem);
      // On retrie toute la liste (avec le nouvel article dedans) selon le tri actuellement choisi,
      // au lieu de laisser le nouvel article toujours coincé tout en bas
      trierStock(sortSelect.value);
      // Et on ré-applique les filtres actifs (emplacement/type/recherche) : si le nouvel article
      // ne correspond pas au filtre en cours, il doit rester caché comme n'importe quel autre
      appliquerFiltresStock();

      // Puis on amène l'utilisateur directement sur la carte qu'il vient d'ajouter, là où le
      // tri/filtre actuel l'a placée, plutôt que de le laisser deviner où elle est passée
      if (!nouvelItem.classList.contains("hidden")) {
        nouvelItem.scrollIntoView({ behavior: "smooth", block: "center" });
        nouvelItem.classList.add("mise-en-avant");
        setTimeout(function () {
          nouvelItem.classList.remove("mise-en-avant");
        }, 1500);
      }
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

// Cliquer en dehors de tous les items ferme et sauvegarde celui qui est ouvert.
// e.composedPath() plutôt que e.target.closest(".stock-item") : ouvrirEdition() remplace le
// contenu de la zone cliquée (zone.innerHTML = "") DANS LA MÊME frappe de clic, donc si on a
// justement tapé sur le nombre/la barre (l'élément qui vient d'être détaché du DOM), e.target
// n'a alors plus aucun parent — "e.target.closest(...)" retombe toujours à null, laissant croire
// que le clic était "en dehors" de la carte et refermant l'édition à l'instant où elle s'ouvre.
// composedPath() capture le chemin AVANT toute mutation, donc reste correct même une fois la
// cible détachée.
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
    ajouterBoutonCoursesSiBas(item, zone, valeurActuelle, trackingType);
  } else {
    // Cas "unité"/"pack" : on affiche un simple champ nombre, avec la valeur actuelle déjà remplie
    const input = document.createElement("input");
    input.type = "number";
    input.className = "stock-quantite-edit anim-fondu";
    input.value = valeurActuelle;
    input.min = "0";
    // Ces quantités (unités/packs) sont toujours des nombres entiers côté serveur (voir
    // /courses/acheter, qui fait un cast SQL "::integer") : step="1" empêche de taper une
    // décimale ici, qui casserait silencieusement l'addition la prochaine fois que cet
    // aliment est acheté depuis Courses (voir le repli sur 0 dans la requête SQL).
    input.step = "1";

    // Ligne du haut : le champ + "Ajouter aux courses" côte à côte, comme avant. Les boutons de
    // soustraction rapide (voir ajouterBoutonsSoustraction) vont EN DESSOUS, sur leur propre
    // ligne : d'où .stock-edition-colonne sur la zone, qui empile ces deux lignes verticalement
    // (retiré à la fermeture, voir fermerEditionEtSauvegarder, sinon l'affichage normal — hors
    // édition — se retrouverait aussi empilé au lieu de rester centré sur une seule ligne).
    const ligneInput = document.createElement("div");
    ligneInput.className = "stock-edition-ligne";
    ligneInput.appendChild(input);

    zone.innerHTML = "";
    zone.classList.add("stock-edition-colonne");
    zone.appendChild(ligneInput);
    input.focus(); // le curseur se place directement dans le champ
    input.select(); // et le texte existant est sélectionné, pour pouvoir le remplacer facilement
    ajouterBoutonCoursesSiBas(item, ligneInput, valeurActuelle, trackingType);
    ajouterBoutonsSoustraction(item, zone, input, valeurActuelle, trackingType);
  }
}

// "Ajouter aux courses" n'apparaît qu'ici, en mode édition (jamais dans l'affichage normal) :
// seulement si la quantité est basse et que l'article n'y est pas déjà (voir data-deja-en-courses,
// posé au chargement puis mis à jour par activerBoutonAjouterCourses une fois ajouté).
// "conteneur" est la ligne du haut avec le champ (pas forcément "zone" elle-même, voir plus haut).
function ajouterBoutonCoursesSiBas(item, conteneur, valeurActuelle, trackingType) {
  if (!estQuantiteBasse(valeurActuelle, trackingType) || item.dataset.dejaEnCourses === "true") return;
  conteneur.insertAdjacentHTML("beforeend", htmlBoutonAjouterCourses(item.dataset.foodId));
  activerBoutonAjouterCourses(item);
}

// Boutons "-1"/"-2"/"-5" (unité/pack seulement, jamais "cl") : soustraient directement de la
// quantité actuelle, enregistrent et referment l'édition en un seul geste — pas besoin de taper
// à la main pour le cas courant "j'en ai utilisé N". Un bouton n'apparaît que si sa valeur ne
// ferait pas passer la quantité sous zéro (ex: pas de "-5" s'il n'en reste que 3).
function ajouterBoutonsSoustraction(item, zone, input, valeurActuelle, trackingType) {
  const actuel = Number(valeurActuelle);
  if (!actuel) return; // déjà à 0 (ou valeur non numérique) : rien à soustraire

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

// Referme le mode édition d'un article : si la valeur a changé, on l'enregistre côté serveur
function fermerEditionEtSauvegarder(item, zone, trackingType) {
  // Retiré ici (plutôt que dans chaque branche ci-dessous) pour être sûr qu'il disparaît dans
  // tous les cas : sans ça, l'affichage normal (hors édition) se retrouvait empilé en colonne
  // au lieu de rester centré sur une seule ligne (voir ajouterBoutonsSoustraction).
  zone.classList.remove("stock-edition-colonne");

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
// ("Ajouter aux courses" n'apparaît qu'en mode édition, voir ouvrirEdition — jamais ici)
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
