// ============================================
// RÉCUPÉRATION DES ÉLÉMENTS HTML DE LA PAGE
// ============================================

const rechercheAlimentCalories = document.getElementById("rechercheAlimentCalories"); // champ de recherche d'aliment à ajouter au journal
const listeAlimentsCalories = document.getElementById("listeAlimentsCalories"); // liste de suggestions d'aliments
const listeJournal = document.getElementById("listeJournal"); // conteneur des entrées du journal du jour
const noResultsJournal = document.getElementById("noResultsJournal"); // message affiché quand le journal est vide

const totalKcalEl = document.getElementById("totalKcal"); // affichage du total de calories
const totalGlucidesEl = document.getElementById("totalGlucides"); // affichage du total de glucides
const totalProteinesEl = document.getElementById("totalProteines"); // affichage du total de protéines
const totalLipidesEl = document.getElementById("totalLipides"); // affichage du total de lipides

const selectRecette = document.getElementById("selectRecette"); // menu déroulant pour choisir une recette
const btnToutEffacer = document.getElementById("btnToutEffacer"); // bouton rond "X" pour tout effacer
const btnEnregistrerRecette = document.getElementById("btnEnregistrerRecette"); // bouton "Enregistrer comme recette" (conditionnel)

const ICONE_CATEGORIE = { boisson: "🍨", plat: "🍽️" };

// Petite fonction de sécurité : transforme les caractères spéciaux en leur équivalent HTML,
// pour éviter d'injecter du code HTML/JS dangereux dans la page (faille XSS)
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ============================================
// ONGLETS (Journal / Recettes) — un seul JavaScript, aucune navigation
// ============================================

document.querySelectorAll(".calories-tab-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".calories-tab-btn").forEach(function (b) { b.classList.remove("actif"); });
    document.querySelectorAll(".calories-tab-panel").forEach(function (p) { p.classList.remove("actif"); });
    btn.classList.add("actif");
    document.querySelector('.calories-tab-panel[data-panel="' + btn.dataset.tab + '"]').classList.add("actif");
  });
});

function ouvrirOngletJournal() {
  document.querySelector('.calories-tab-btn[data-tab="journal"]').click();
}

// ============================================
// AUTOCOMPLETE + AJOUT INSTANTANÉ (clic = ajout direct, 100g par défaut)
// ============================================

// Au départ, la liste de suggestions est cachée
listeAlimentsCalories.hidden = true;
const itemsAutocomplete = listeAlimentsCalories.querySelectorAll("li");

// Quand l'utilisateur tape dans le champ de recherche d'aliment...
rechercheAlimentCalories.addEventListener("input", function () {
  const recherche = this.value.toLowerCase();

  if (recherche === "") {
    listeAlimentsCalories.hidden = true;
    return;
  }

  listeAlimentsCalories.hidden = false;

  // On affiche tous les aliments qui contiennent le texte tapé. Aucune limite de nombre :
  // si la liste est longue, elle défile (voir max-height dans style.css)
  itemsAutocomplete.forEach(function (item) {
    item.hidden = !item.textContent.toLowerCase().includes(recherche);
  });
});

// Cliquer directement sur une suggestion ajoute l'aliment au journal avec 100g par défaut
// (pas besoin de valider un formulaire séparé, c'est immédiat)
itemsAutocomplete.forEach(function (item) {
  item.addEventListener("click", function () {
    ajouterAlimentAuJournal(this.dataset.id, 100);
    rechercheAlimentCalories.value = "";
    listeAlimentsCalories.hidden = true;
  });
});

// Cliquer en dehors de la zone d'autocomplétion referme la liste de suggestions
document.addEventListener("click", function (e) {
  if (!document.getElementById("autocompleteCalories").contains(e.target)) {
    listeAlimentsCalories.hidden = true;
  }
});

// Envoie au serveur l'ajout d'un aliment au journal, puis affiche la nouvelle entrée sans recharger la page
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
      nouvelleEntree.classList.add("entree"); // petite animation d'apparition
      recalculerTotaux();
    });
}

// ============================================
// TOTAUX
// ============================================

// Recalcule et affiche les totaux (calories, glucides, protéines, lipides)
// en additionnant les valeurs stockées dans chaque entrée du journal actuellement affichée
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

  // On affiche le message "vide" seulement si aucune entrée n'est présente
  noResultsJournal.classList.toggle("hidden", listeJournal.querySelectorAll(".journal-item").length > 0);

  miseAJourBoutonEnregistrerRecette();
}

// ============================================
// "ENREGISTRER COMME RECETTE" — visible seulement si le journal a 5 aliments ou plus
// ET que cette combinaison exacte ne correspond à aucune recette déjà enregistrée
// ============================================

// Renvoie l'ensemble (sans doublon) des food_id actuellement dans le journal du jour
function foodIdsDuJournal() {
  const ids = Array.from(listeJournal.querySelectorAll(".journal-item")).map(function (item) {
    return item.dataset.foodId;
  });
  return [...new Set(ids)];
}

// Deux combinaisons sont "les mêmes" si elles contiennent exactement les mêmes aliments,
// peu importe l'ordre ou les grammages
function memeCombinaison(idsA, idsB) {
  if (idsA.length !== idsB.length) return false;
  const triA = [...idsA].sort();
  const triB = [...idsB].sort();
  return triA.every(function (id, i) { return id === triB[i]; });
}

function miseAJourBoutonEnregistrerRecette() {
  const idsJournal = foodIdsDuJournal();

  if (idsJournal.length < 5) {
    btnEnregistrerRecette.classList.add("hidden");
    return;
  }

  const dejaEnregistree = window.RECETTES.some(function (recette) {
    return memeCombinaison(idsJournal, recette.food_ids);
  });

  btnEnregistrerRecette.classList.toggle("hidden", dejaEnregistree);
}

btnEnregistrerRecette.addEventListener("click", function () {
  // Ouvre le panneau de recette vide, mais pré-rempli avec les aliments du journal du jour :
  // c'est le même formulaire que "Nouvelle recette", juste avec un point de départ différent
  const ingredients = Array.from(listeJournal.querySelectorAll(".journal-item")).map(function (item) {
    return {
      food_id: item.dataset.foodId,
      nom: item.querySelector(".journal-nom").textContent.trim(),
      quantite_g: item.querySelector(".journal-grammes-input").value
    };
  });

  ouvrirSheet({ ingredients: ingredients });
});

// ============================================
// CONSTRUCTION D'UNE ENTRÉE DE JOURNAL
// ============================================

// Construit dynamiquement le bloc HTML d'une entrée du journal, à partir des données reçues du serveur
function construireJournalItemDOM(entree) {
  const div = document.createElement("div");
  // On échappe toutes les valeurs texte pour éviter d'insérer du HTML dangereux
  const id = escapeHtml(entree.id);
  const emoji = escapeHtml(entree.emoji);
  const nom = escapeHtml(entree.nom);
  const categorie = escapeHtml(entree.categorie || "");
  const quantite = parseFloat(entree.quantite_g);
  const kcal = Number(entree.calories_calc).toFixed(0);

  div.className = "journal-item carte-article";

  // On stocke les valeurs nutritionnelles dans les attributs data-*, pour pouvoir recalculer les totaux facilement
  div.dataset.id = entree.id;
  div.dataset.foodId = entree.food_id;
  div.dataset.kcal = entree.calories_calc;
  div.dataset.glucides = entree.glucides_calc;
  div.dataset.proteines = entree.proteines_calc;
  div.dataset.lipides = entree.lipides_calc;

  div.innerHTML = `
    <div class="journal-nom-groupe">
      <span class="journal-nom">
        ${emoji} ${nom}
      </span>

      <span class="journal-categorie">
        ${categorie}
      </span>
    </div>

    <div class="journal-valeurs">
      <input
        type="number"
        class="journal-grammes-input"
        value="${quantite}"
        min="1"
      />

      <span class="journal-kcal">
        ${kcal} kcal
      </span>
    </div>

    <form
      action="/calories/supprimer"
      method="post"
      class="form-supprimer-journal">

      <input
        type="hidden"
        name="idEntree"
        value="${id}"
      />

      <button
        type="submit"
        class="btn-supprimer-dash">
      </button>

    </form>
  `;

  return div;
}

// ============================================
// ÉDITION INLINE DE LA QUANTITÉ (auto-save au blur)
// ============================================

// Active les comportements interactifs d'une entrée du journal : modification de la quantité et suppression
function activerItem(item) {
  const champGrammes = item.querySelector(".journal-grammes-input");
  const kcalSpan = item.querySelector(".journal-kcal");

  // "change" se déclenche quand on quitte le champ après l'avoir modifié (pas à chaque frappe)
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
        // On met à jour les valeurs stockées et affichées avec celles recalculées par le serveur
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

// Active la suppression (via fetch, sans recharger la page) pour une entrée du journal
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
// RECETTES — application via dropdown (remplace le journal du jour)
// ============================================

// Quand on choisit une recette dans le menu déroulant, on remplace tout le journal du jour par ses ingrédients
selectRecette.addEventListener("change", function () {
  const idRecette = this.value;

  if (!idRecette) return;

  fetch("/calories/ajouter-recette", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idRecette: idRecette })
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      if (data.erreur) {
        alert(data.erreur);
        return;
      }

      // Le serveur a vidé le journal, on vide aussi l'affichage.
      listeJournal.innerHTML = "";

      // Puis on affiche chaque nouvel ingrédient de la recette comme une entrée du journal
      data.items.forEach(function (entree) {
        const nouvelleEntree = construireJournalItemDOM(entree);
        listeJournal.appendChild(nouvelleEntree);
        activerItem(nouvelleEntree);
        nouvelleEntree.classList.add("entree");
      });

      recalculerTotaux();
      // On réinitialise le menu déroulant (sinon la recette resterait affichée comme sélectionnée)
      selectRecette.value = "";
      // On informe notre "custom select" (voir custom-selects.js) que la valeur a changé, pour qu'il se mette à jour visuellement
      selectRecette.dispatchEvent(new Event("custom-select:update"));
    })
    .catch(function (err) {
      console.error(err);
      alert("Une erreur est survenue.");
    });
});

// ============================================
// TOUT EFFACER
// ============================================

// Vide complètement le journal du jour, après confirmation de l'utilisateur
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
// ACTIVATION DES ENTRÉES EXISTANTES AU CHARGEMENT
// ============================================

// Au chargement de la page, on active l'édition/suppression pour toutes les entrées déjà présentes dans le HTML
listeJournal.querySelectorAll(".journal-item").forEach(function (item) {
  activerItem(item);
});

// Et on calcule les totaux dès le chargement de la page
recalculerTotaux();

// ============================================
// ONGLET RECETTES — deux grilles séparées (Boissons / Plats), création/édition/suppression
// ============================================

// Une grille par catégorie plutôt qu'une seule grille filtrable : boissons et plats ne se
// mélangent jamais, même dans la vue par défaut (voir calories.ejs)
function grilleDeCategorie(categorie) {
  return document.querySelector('.recette-grid[data-grid-cat="' + categorie + '"]');
}

// Construit une carte de recette pour la grille (utilisé après création/édition, sans recharger la page)
function construireRecetteCardDOM(recette) {
  const div = document.createElement("div");
  div.className = "recette-card";
  div.dataset.id = recette.id;
  div.dataset.cat = recette.categorie;

  const icone = ICONE_CATEGORIE[recette.categorie] || "🍽️";

  div.innerHTML = `
    <button type="button" class="btn-supprimer-dash btn-supprimer-recette" title="Supprimer"></button>
    <span class="recette-emoji">${icone}</span>
    <p class="recette-nom">${escapeHtml(recette.nom)}</p>
    <div class="recette-sub"><span>${recette.nb_ingredients} ingr.</span><span>${recette.kcal_total} kcal</span></div>
  `;

  activerCarteRecette(div);
  return div;
}

// Toucher la carte ouvre son détail (édition) ; le "−" a sa propre action (suppression),
// donc stopPropagation empêche le clic dessus de déclencher aussi l'ouverture du détail
function activerCarteRecette(card) {
  card.addEventListener("click", function (e) {
    if (e.target.closest(".btn-supprimer-recette")) return;
    ouvrirSheetEdition(card.dataset.id);
  });

  card.querySelector(".btn-supprimer-recette").addEventListener("click", function (e) {
    e.stopPropagation();
    supprimerRecette(card.dataset.id);
  });
}

document.querySelectorAll(".recette-card:not(.recette-new-card)").forEach(activerCarteRecette);

// Une carte "+ Nouvelle recette" par grille : ouvre le panneau avec la catégorie de cette
// section déjà choisie, plutôt que de laisser deviner dans quelle grille la carte va atterrir
document.querySelectorAll(".btn-nouvelle-recette").forEach(function (bouton) {
  bouton.addEventListener("click", function () {
    ouvrirSheet({ categorie: bouton.dataset.nouvelleCat });
  });
});

// Supprime une recette après confirmation, retire sa carte et son option du menu déroulant
function supprimerRecette(idRecette) {
  if (!confirm("Supprimer cette recette ?")) return;

  fetch("/recettes/" + idRecette + "/supprimer", { method: "POST" })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data.erreur) {
        alert(data.erreur);
        return;
      }

      const card = document.querySelector('.recette-card[data-id="' + idRecette + '"]');
      if (card) card.remove();

      const option = selectRecette.querySelector('option[value="' + idRecette + '"]');
      if (option) option.remove();
      selectRecette.dispatchEvent(new Event("custom-select:update"));

      window.RECETTES = window.RECETTES.filter(function (r) { return String(r.id) !== String(idRecette); });
      miseAJourBoutonEnregistrerRecette();

      fermerSheet();
    });
}

// ============================================
// PANNEAU DÉTAIL (overlay) — création, édition, ou pré-remplissage depuis le journal
// ============================================

const sheet = document.getElementById("sheet");
const sheetBackdrop = document.getElementById("sheetBackdrop");
const sheetCloseBtn = document.getElementById("sheetCloseBtn");
const formRecette = document.getElementById("formRecette");
const recetteIdInput = document.getElementById("recetteId");
const recetteNomInput = document.getElementById("recetteNom");
const recetteCategoriePicker = document.getElementById("recetteCategoriePicker");
const listeIngredientsRecette = document.getElementById("listeIngredientsRecette");

recetteCategoriePicker.querySelectorAll(".cat-pill").forEach(function (pill) {
  pill.addEventListener("click", function () {
    recetteCategoriePicker.querySelectorAll(".cat-pill").forEach(function (p) { p.classList.remove("actif"); });
    pill.classList.add("actif");
  });
});

function categorieChoisie() {
  const actif = recetteCategoriePicker.querySelector(".cat-pill.actif");
  return actif ? actif.dataset.valeur : "plat";
}

function choisirCategorie(categorie) {
  recetteCategoriePicker.querySelectorAll(".cat-pill").forEach(function (p) {
    p.classList.toggle("actif", p.dataset.valeur === categorie);
  });
}

// Ajoute une ligne d'ingrédient éditable dans le panneau (nom, grammage, bouton de suppression)
function ajouterLigneIngredient(foodId, nom, quantiteG) {
  // Si l'ingrédient est déjà dans la liste, on ne le duplique pas : on remet juste le focus sur sa quantité
  const existante = listeIngredientsRecette.querySelector('.ligne-ingredient-recette[data-food-id="' + foodId + '"]');
  if (existante) {
    existante.querySelector(".ingredient-quantite-recette").focus();
    return;
  }

  const ligne = document.createElement("div");
  ligne.className = "ligne-ingredient-recette";
  ligne.dataset.foodId = foodId;

  ligne.innerHTML = `
    <span class="ingredient-nom-recette">${escapeHtml(nom)}</span>
    <input type="number" class="ingredient-quantite-recette" min="1" placeholder="g" value="${quantiteG || ""}" />
    <button type="button" class="btn-supprimer-dash ingredient-x-recette" title="Retirer"></button>
  `;

  ligne.querySelector(".ingredient-x-recette").addEventListener("click", function () {
    ligne.remove();
  });

  listeIngredientsRecette.appendChild(ligne);
}

// Réinitialise le panneau : formulaire vide, prêt pour une nouvelle recette (ou pré-rempli, voir ouvrirSheet)
function reinitialiserSheet() {
  recetteIdInput.value = "";
  recetteNomInput.value = "";
  choisirCategorie("plat");
  listeIngredientsRecette.innerHTML = "";
}

// Ouvre le panneau en mode "création" (vide, ou pré-rempli avec des ingrédients de départ —
// utilisé par "Nouvelle recette" [aucun ingrédient, catégorie de la grille cliquée] et par
// "Enregistrer comme recette" [ingrédients du journal])
function ouvrirSheet(options) {
  reinitialiserSheet();
  if (options.categorie) choisirCategorie(options.categorie);
  (options.ingredients || []).forEach(function (ing) {
    ajouterLigneIngredient(ing.food_id, ing.nom, ing.quantite_g);
  });
  afficherSheet();
  recetteNomInput.focus();
}

// Ouvre le panneau en mode "édition" : va chercher la recette complète au serveur, puis pré-remplit tout
function ouvrirSheetEdition(idRecette) {
  fetch("/recettes/" + idRecette)
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data.erreur) {
        alert(data.erreur);
        return;
      }

      reinitialiserSheet();
      recetteIdInput.value = data.recette.id;
      recetteNomInput.value = data.recette.nom;
      choisirCategorie(data.recette.categorie);
      data.ingredients.forEach(function (ing) {
        ajouterLigneIngredient(ing.food_id, `${ing.emoji} ${ing.nom}`, parseFloat(ing.quantite_g));
      });
      afficherSheet();
    });
}

function afficherSheet() {
  sheet.classList.add("ouvert");
  sheetBackdrop.classList.add("ouvert");
}

function fermerSheet() {
  sheet.classList.remove("ouvert");
  sheetBackdrop.classList.remove("ouvert");
}

sheetCloseBtn.addEventListener("click", fermerSheet);
sheetBackdrop.addEventListener("click", fermerSheet);

// ---------- Recherche d'ingrédient à ajouter (dans le panneau) ----------

const rechercheIngredient = document.getElementById("rechercheIngredient");
const listeIngredientsRecherche = document.getElementById("listeIngredientsRecherche");
listeIngredientsRecherche.hidden = true;
const itemsIngredientsRecherche = listeIngredientsRecherche.querySelectorAll("li");

rechercheIngredient.addEventListener("input", function () {
  const recherche = this.value.toLowerCase();

  if (recherche === "") {
    listeIngredientsRecherche.hidden = true;
    return;
  }

  listeIngredientsRecherche.hidden = false;

  itemsIngredientsRecherche.forEach(function (item) {
    item.hidden = !item.textContent.toLowerCase().includes(recherche);
  });
});

itemsIngredientsRecherche.forEach(function (item) {
  item.addEventListener("click", function () {
    ajouterLigneIngredient(this.dataset.id, this.textContent.trim(), "");
    rechercheIngredient.value = "";
    listeIngredientsRecherche.hidden = true;
    listeIngredientsRecette.querySelector(":scope > .ligne-ingredient-recette:last-child .ingredient-quantite-recette").focus();
  });
});

document.addEventListener("click", function (e) {
  if (!document.getElementById("autocompleteIngredient").contains(e.target)) {
    listeIngredientsRecherche.hidden = true;
  }
});

// ---------- Enregistrement (création ou édition) ----------

formRecette.addEventListener("submit", function (event) {
  event.preventDefault();

  const idRecette = recetteIdInput.value;
  const nom = recetteNomInput.value.trim();
  const categorie = categorieChoisie();
  const ingredients = [];

  listeIngredientsRecette.querySelectorAll(".ligne-ingredient-recette").forEach(function (ligne) {
    const quantite = ligne.querySelector(".ingredient-quantite-recette").value;
    if (ligne.dataset.foodId && quantite) {
      ingredients.push({ food_id: ligne.dataset.foodId, quantite_g: quantite });
    }
  });

  if (!nom || ingredients.length === 0) {
    alert("Ajoute un nom et au moins un ingrédient valide.");
    return;
  }

  const url = idRecette ? "/recettes/" + idRecette + "/modifier" : "/recettes/creer";

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom: nom, categorie: categorie, ingredients: ingredients })
  })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data.erreur) {
        alert(data.erreur);
        return;
      }

      // On reconstruit une version "grille" de la recette (compteur d'ingrédients...) à partir
      // de ce qu'on vient d'envoyer, pour mettre à jour la carte sans recharger la page. Le kcal
      // exact par aliment n'est pas connu côté client (seul le serveur a la table foods sous la
      // main) : on garde l'ancien total en attendant, un rechargement de page l'affine ensuite.
      const recetteMaj = {
        id: idRecette || data.recette.id,
        nom: nom,
        categorie: categorie,
        nb_ingredients: ingredients.length,
        // Le total kcal affiché sur la carte est recalculé au prochain chargement de page ;
        // en attendant on garde l'ancien total s'il existe, sinon "…"
        kcal_total: (window.RECETTES.find(function (r) { return String(r.id) === String(idRecette); }) || {}).kcal_total ?? "…",
        food_ids: ingredients.map(function (ing) { return ing.food_id; })
      };

      // Carte insérée juste avant le "+ Nouvelle recette" de SA grille (celle qui correspond à
      // sa catégorie) : si on vient de changer la catégorie d'une recette en l'éditant, l'ancienne
      // carte (dans l'autre grille) est retirée et une neuve apparaît dans la bonne grille, plutôt
      // que de la remplacer sur place là où elle ne devrait plus être.
      const grille = grilleDeCategorie(categorie);

      if (idRecette) {
        const ancienneCard = document.querySelector('.recette-card[data-id="' + idRecette + '"]');
        if (ancienneCard) ancienneCard.remove();

        const option = selectRecette.querySelector('option[value="' + idRecette + '"]');
        if (option) option.textContent = nom;

        window.RECETTES = window.RECETTES.map(function (r) {
          return String(r.id) === String(idRecette) ? recetteMaj : r;
        });
      } else {
        const option = document.createElement("option");
        option.value = recetteMaj.id;
        option.textContent = nom;
        selectRecette.appendChild(option);

        window.RECETTES.push(recetteMaj);
      }

      grille.insertBefore(construireRecetteCardDOM(recetteMaj), grille.querySelector(".btn-nouvelle-recette"));

      selectRecette.dispatchEvent(new Event("custom-select:update"));
      miseAJourBoutonEnregistrerRecette();
      fermerSheet();
    });
});
