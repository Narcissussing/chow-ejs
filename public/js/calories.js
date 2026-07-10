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

  // ":not(.disparait)" exclut les lignes en cours d'animation de sortie : sans ça, les totaux
  // restaient faux pendant les ~300ms où la ligne supprimée est encore dans le DOM (juste en
  // train de glisser hors de l'écran), le temps que l'animation se termine
  const itemsActifs = listeJournal.querySelectorAll(".journal-item:not(.disparait)");

  itemsActifs.forEach(function (item) {
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
  noResultsJournal.classList.toggle("hidden", itemsActifs.length > 0);

  miseAJourBoutonEnregistrerRecette();
}

// ============================================
// "ENREGISTRER COMME RECETTE" — visible seulement si le journal a 3 aliments ou plus
// ET que cette combinaison exacte ne correspond à aucune recette déjà enregistrée
// ============================================

// Renvoie l'ensemble (sans doublon) des food_id actuellement dans le journal du jour.
// ":not(.disparait)" exclut les lignes en cours de suppression (même raison que recalculerTotaux) :
// sans ça, le bouton "Enregistrer en recette" restait visible après être passé sous 3 aliments,
// car ce calcul comptait encore la ligne en train de disparaître au moment où il tournait.
function foodIdsDuJournal() {
  const ids = Array.from(listeJournal.querySelectorAll(".journal-item:not(.disparait)")).map(function (item) {
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

  if (idsJournal.length < 3) {
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
      // dataset.quantiteG (toujours en grammes) plutôt que la valeur affichée dans le champ,
      // qui peut être en c. à café/soupe si l'aliment a une équivalence (voir activerItem)
      quantite_g: item.dataset.quantiteG,
      grammes_par_cuil_a_cafe: item.dataset.gCafe,
      grammes_par_cuil_a_soupe: item.dataset.gSoupe
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
  div.dataset.gCafe = entree.grammes_par_cuil_a_cafe ?? "";
  div.dataset.gSoupe = entree.grammes_par_cuil_a_soupe ?? "";
  div.dataset.quantiteG = quantite;

  // Même logique que côté serveur (calories.ejs) : le sélecteur d'unité est toujours affiché
  // (au moins "g"), pour que toutes les lignes du journal aient la même forme
  let optionsUnite = "";
  if (entree.grammes_par_cuil_a_cafe) optionsUnite += `<option value="cafe">tsp</option>`;
  if (entree.grammes_par_cuil_a_soupe) optionsUnite += `<option value="soupe">tbsp</option>`;
  const selectUnite = `<select class="journal-unite-select"><option value="g">g</option>${optionsUnite}</select>`;

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
      <div class="journal-quantite-groupe">
        <!-- min doit être un multiple de step (0.25), sinon la grille de valeurs valides du
             navigateur démarre à "min" et des nombres ronds comme 166 ne tombent jamais dessus :
             le navigateur affichait alors "Saisissez une valeur valide" même sur une valeur correcte -->
        <input
          type="number"
          class="journal-grammes-input"
          step="0.25"
          value="${quantite}"
          min="0.25"
        />
        ${selectUnite}
      </div>

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

// Renvoie le poids (en grammes) d'une unité donnée pour l'aliment de cette entrée de journal
// ("g" vaut toujours 1 par définition ; "cafe"/"soupe" viennent des équivalences renseignées
// sur la page détail de l'aliment, voir aliment-detail.js)
function grammesParUnite(item, unite) {
  if (unite === "cafe") return Number(item.dataset.gCafe);
  if (unite === "soupe") return Number(item.dataset.gSoupe);
  return 1;
}

// Active les comportements interactifs d'une entrée du journal : modification de la quantité et suppression
function activerItem(item) {
  const champGrammes = item.querySelector(".journal-grammes-input");
  const selectUnite = item.querySelector(".journal-unite-select");
  const kcalSpan = item.querySelector(".journal-kcal");

  // La vraie donnée reste toujours les grammes (c'est ce que le serveur stocke et calcule) ;
  // le champ affiché, lui, peut représenter "0.5" en c. à café tout en valant 2.5g en vrai
  let grammesActuels = Number(champGrammes.value) * grammesParUnite(item, "g");

  // Changer d'unité ne modifie rien en base : ça recalcule juste l'affichage du même poids
  // dans la nouvelle unité (ex : 15g devient "1" quand on passe en c. à soupe si 1 c. à
  // soupe = 15g pour cet aliment), sans déclencher de sauvegarde
  if (selectUnite) {
    selectUnite.addEventListener("change", function () {
      const ratio = grammesParUnite(item, this.value);
      champGrammes.value = Math.round((grammesActuels / ratio) * 100) / 100;
    });
  }

  // "change" se déclenche quand on quitte le champ après l'avoir modifié (pas à chaque frappe)
  champGrammes.addEventListener("change", function () {
    const uniteActuelle = selectUnite ? selectUnite.value : "g";
    const ratio = grammesParUnite(item, uniteActuelle);
    const valeurSaisie = Number(this.value);
    if (!valeurSaisie || valeurSaisie <= 0 || !ratio) return;

    // Ce que le serveur reçoit est TOUJOURS en grammes, quelle que soit l'unité affichée
    const nouvelleQuantite = valeurSaisie * ratio;

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
        grammesActuels = nouvelleQuantite;
        item.dataset.quantiteG = nouvelleQuantite;
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
        // Petite animation de sortie avant de retirer réellement la ligne (même principe que
        // Stock/Courses), plutôt qu'une disparition instantanée. Les totaux se mettent à jour
        // tout de suite (recalculerTotaux ignore les lignes ".disparait"), la ligne elle-même
        // ne quitte le DOM qu'une fois l'animation terminée.
        item.classList.add("disparait");
        recalculerTotaux();
        setTimeout(function () {
          item.remove();
        }, 300);
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
      // Toutes les lignes glissent hors de l'écran ensemble avant que la liste ne soit vidée
      const items = listeJournal.querySelectorAll(".journal-item");
      items.forEach(function (item) {
        item.classList.add("disparait");
      });
      recalculerTotaux();
      setTimeout(function () {
        listeJournal.innerHTML = "";
      }, 300);
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
    <span class="recette-emoji">${icone}</span>
    <p class="recette-nom">${escapeHtml(recette.nom)}</p>
    <div class="recette-sub"><span>${recette.nb_ingredients} ingr.</span><span>${recette.kcal_total} kcal</span></div>
  `;

  activerCarteRecette(div);
  return div;
}

// Toucher la carte ouvre son détail (édition) : c'est la SEULE action sur une carte, plus de
// bouton "−" séparé dessus — supprimer la recette ne se fait plus que depuis le panneau détail
// (voir btnSupprimerRecetteSheet), une fois qu'on l'a vraiment ouverte
function activerCarteRecette(card) {
  card.addEventListener("click", function () {
    ouvrirSheetEdition(card.dataset.id);
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

      // La carte (si affichée derrière le panneau) glisse hors de l'écran avant de disparaître
      // réellement, plutôt qu'un remove() instantané
      const card = document.querySelector('.recette-card[data-id="' + idRecette + '"]');
      if (card) {
        card.classList.add("disparait");
        setTimeout(function () {
          card.remove();
        }, 300);
      }

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
const btnSupprimerRecetteSheet = document.getElementById("btnSupprimerRecetteSheet");
const formRecette = document.getElementById("formRecette");
const btnEnregistrerSheet = document.getElementById("btnEnregistrerSheet");
const recetteIdInput = document.getElementById("recetteId");
const recetteNomInput = document.getElementById("recetteNom");
const recetteCategoriePicker = document.getElementById("recetteCategoriePicker");
const listeIngredientsRecette = document.getElementById("listeIngredientsRecette");
const btnToggleAjoutIngredient = document.getElementById("btnToggleAjoutIngredient");
const autocompleteIngredient = document.getElementById("autocompleteIngredient");

// Le "+" ouvre/ferme la recherche d'ingrédient, repliée par défaut, juste après le dernier
// ingrédient de la liste (voir calories.ejs) : elle se comporte comme la ligne du "prochain"
// ingrédient. On la fait défiler jusqu'à l'écran en l'ouvrant : avec une longue liste, elle
// serait sinon hors champ tant qu'on n'a pas fait défiler la liste jusqu'en bas soi-même.
btnToggleAjoutIngredient.addEventListener("click", function () {
  // ".replie" (pas ".hidden") : contrairement à display:none, cette classe se transitionne en
  // douceur (voir CSS), le champ se déplie/replie au lieu d'apparaître/disparaître d'un coup
  const ouvert = autocompleteIngredient.classList.toggle("replie") === false;
  btnToggleAjoutIngredient.classList.toggle("actif", ouvert);
  if (ouvert) {
    // Le champ de recherche prend cette place le temps qu'on l'utilise : le message "vide"
    // n'a plus lieu d'être affiché en même temps, même si aucun ingrédient n'est encore ajouté
    ingredientsVide.classList.add("hidden");
    // Fait défiler LA LISTE (pas la page) jusqu'à son propre bas : #autocompleteIngredient vit
    // maintenant dedans, comme dernier enfant (voir calories.ejs), donc c'est elle qui doit
    // défiler pour le révéler, pas le panneau entier
    listeIngredientsRecette.scrollTo({ top: listeIngredientsRecette.scrollHeight, behavior: "smooth" });
    document.getElementById("rechercheIngredient").focus();
  } else {
    // On referme : on retire "pret" tout de suite (voir plus bas) pour que la fermeture reparte
    // bien d'un état "coupé" (overflow:hidden), sinon la liste de suggestions déborderait un
    // instant hors d'un champ déjà en train de se replier
    autocompleteIngredient.classList.remove("pret");
    // On referme sans avoir ajouté d'ingrédient : le message "vide" redevient pertinent si la
    // liste est toujours vide (majEtatIngredients ne le réaffiche que dans ce cas précis)
    majEtatIngredients();
  }
});

// Une fois l'ouverture terminée (transition CSS "max-height" arrivée à son terme), on ajoute
// "pret" : voir la règle #autocompleteIngredient.pret pour pourquoi c'est nécessaire (sinon la
// liste de suggestions reste invisible/inaccessible en permanence, impossible d'ajouter un aliment)
autocompleteIngredient.addEventListener("transitionend", function (event) {
  if (event.propertyName === "max-height" && !autocompleteIngredient.classList.contains("replie")) {
    autocompleteIngredient.classList.add("pret");
  }
});

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

const ingredientsVide = document.getElementById("ingredientsVide");

// Affiche le message "vide" tant qu'il n'y a aucun ingrédient, et n'autorise "Enregistrer"
// qu'à partir de 2 ingrédients (une "recette" d'un seul aliment n'en est pas vraiment une)
function majEtatIngredients() {
  const nombre = listeIngredientsRecette.querySelectorAll(".ligne-ingredient-recette").length;
  ingredientsVide.classList.toggle("hidden", nombre > 0);
  btnEnregistrerSheet.disabled = nombre < 2;
}

// Même idée que grammesParUnite (Journal), mais lue depuis le dataset d'une ligne d'ingrédient
// de recette plutôt que celui d'une entrée de journal
function grammesParUniteIngredient(ligne, unite) {
  if (unite === "cafe") return Number(ligne.dataset.gCafe);
  if (unite === "soupe") return Number(ligne.dataset.gSoupe);
  return 1;
}

// Ajoute une ligne d'ingrédient éditable dans le panneau (nom, grammage, bouton de suppression).
// gCafe/gSoupe sont les équivalences cuillère de CET aliment (voir aliment-detail.js) : le
// sélecteur d'unité est toujours affiché (au moins "g"), tsp/tbsp s'ajoutent s'ils existent.
function ajouterLigneIngredient(foodId, nom, quantiteG, gCafe, gSoupe) {
  // Si l'ingrédient est déjà dans la liste, on ne le duplique pas : on remet juste le focus sur sa quantité
  const existante = listeIngredientsRecette.querySelector('.ligne-ingredient-recette[data-food-id="' + foodId + '"]');
  if (existante) {
    existante.querySelector(".ingredient-quantite-recette").focus();
    return;
  }

  const ligne = document.createElement("div");
  ligne.className = "ligne-ingredient-recette";
  ligne.dataset.foodId = foodId;
  ligne.dataset.gCafe = gCafe || "";
  ligne.dataset.gSoupe = gSoupe || "";

  let optionsUnite = "";
  if (gCafe) optionsUnite += `<option value="cafe">tsp</option>`;
  if (gSoupe) optionsUnite += `<option value="soupe">tbsp</option>`;
  const selectUnite = `<select class="ingredient-unite-recette"><option value="g">g</option>${optionsUnite}</select>`;

  ligne.innerHTML = `
    <span class="ingredient-nom-recette">${escapeHtml(nom)}</span>
    <input type="number" class="ingredient-quantite-recette" step="0.25" min="0.25" placeholder="g" value="${quantiteG || ""}" />
    ${selectUnite}
    <button type="button" class="btn-supprimer-dash ingredient-x-recette" title="Retirer"></button>
  `;

  ligne.querySelector(".ingredient-x-recette").addEventListener("click", function () {
    ligne.classList.add("disparait");
    setTimeout(function () {
      ligne.remove();
      majEtatIngredients();
    }, 300);
  });

  const champQuantite = ligne.querySelector(".ingredient-quantite-recette");
  const champUnite = ligne.querySelector(".ingredient-unite-recette");

  if (champUnite) {
    // Comme le Journal : la vraie donnée reste les grammes, l'unité affichée n'est qu'une
    // façon différente de saisir/lire le même poids
    let grammesActuels = Number(champQuantite.value) || 0;

    champQuantite.addEventListener("input", function () {
      grammesActuels = Number(this.value) * grammesParUniteIngredient(ligne, champUnite.value);
    });

    champUnite.addEventListener("change", function () {
      const ratio = grammesParUniteIngredient(ligne, this.value);
      if (ratio) champQuantite.value = Math.round((grammesActuels / ratio) * 100) / 100;
    });
  }

  ligne.classList.add("entree");
  // #autocompleteIngredient est TOUJOURS le dernier enfant de la liste (voir calories.ejs) :
  // on insère chaque nouvelle ligne juste avant lui plutôt qu'à la toute fin, pour qu'il reste
  // en place sous le dernier ingrédient au lieu d'être poussé après.
  listeIngredientsRecette.insertBefore(ligne, autocompleteIngredient);
  majEtatIngredients();
}

// Réinitialise le panneau : formulaire vide, prêt pour une nouvelle recette (ou pré-rempli, voir ouvrirSheet)
function reinitialiserSheet() {
  recetteIdInput.value = "";
  recetteNomInput.value = "";
  choisirCategorie("plat");
  // On retire seulement les lignes d'ingrédients : innerHTML="" viderait aussi
  // #autocompleteIngredient, qui vit maintenant DANS cette liste (voir calories.ejs)
  listeIngredientsRecette.querySelectorAll(".ligne-ingredient-recette").forEach(function (ligne) {
    ligne.remove();
  });
  listeIngredientsRecette.scrollTop = 0;
  // La recherche d'ingrédient repart repliée à chaque nouvelle ouverture du panneau
  autocompleteIngredient.classList.add("replie");
  autocompleteIngredient.classList.remove("pret");
  btnToggleAjoutIngredient.classList.remove("actif");
  document.getElementById("rechercheIngredient").value = "";
  // Rien à supprimer avant le premier enregistrement : caché par défaut (voir ouvrirSheetEdition)
  btnSupprimerRecetteSheet.classList.add("hidden");
  majEtatIngredients();
}

// Ouvre le panneau en mode "création" (vide, ou pré-rempli avec des ingrédients de départ —
// utilisé par "Nouvelle recette" [aucun ingrédient, catégorie de la grille cliquée] et par
// "Enregistrer comme recette" [ingrédients du journal])
function ouvrirSheet(options) {
  reinitialiserSheet();
  if (options.categorie) choisirCategorie(options.categorie);
  (options.ingredients || []).forEach(function (ing) {
    ajouterLigneIngredient(ing.food_id, ing.nom, ing.quantite_g, ing.grammes_par_cuil_a_cafe, ing.grammes_par_cuil_a_soupe);
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
        ajouterLigneIngredient(ing.food_id, `${ing.emoji} ${ing.nom}`, parseFloat(ing.quantite_g), ing.grammes_par_cuil_a_cafe, ing.grammes_par_cuil_a_soupe);
      });
      // On sait maintenant qu'il y a bien une recette existante à supprimer
      btnSupprimerRecetteSheet.classList.remove("hidden");
      afficherSheet();
    });
}

function afficherSheet() {
  // .sheet lui-même est scrollable (overflow-y:auto) et garde sa position de défilement d'une
  // ouverture à l'autre (il n'est jamais retiré du DOM) : sans ce reset, rouvrir le panneau après
  // l'avoir laissé défilé vers le bas (ex: clavier qui pousse la vue) l'ouvrait déjà en bas,
  // sur les ingrédients, au lieu de partir du titre tout en haut.
  sheet.scrollTop = 0;
  sheet.classList.add("ouvert");
  sheetBackdrop.classList.add("ouvert");
  // Bloque le défilement de la page derrière : sans ça, un geste de scroll pendant qu'on
  // interagit avec le panneau faisait défiler la page du dessous au lieu du panneau lui-même
  document.body.classList.add("scroll-bloque");
}

function fermerSheet() {
  sheet.classList.remove("ouvert");
  sheetBackdrop.classList.remove("ouvert");
  document.body.classList.remove("scroll-bloque");
  fermerRechercheIngredient();
}

sheetCloseBtn.addEventListener("click", fermerSheet);
sheetBackdrop.addEventListener("click", fermerSheet);

btnSupprimerRecetteSheet.addEventListener("click", function () {
  supprimerRecette(recetteIdInput.value);
});

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

// Referme complètement la recherche (pas juste la liste de suggestions) : remet le "+" dans son
// état fermé, comme si on l'avait re-touché. Appelée après avoir choisi un ingrédient, en tapant
// en dehors, ou en fermant tout le panneau (voir fermerSheet).
function fermerRechercheIngredient() {
  autocompleteIngredient.classList.add("replie");
  autocompleteIngredient.classList.remove("pret");
  btnToggleAjoutIngredient.classList.remove("actif");
  rechercheIngredient.value = "";
  listeIngredientsRecherche.hidden = true;
  // Réaffiche le message "vide" si on ferme sans avoir ajouté d'ingrédient (voir majEtatIngredients)
  majEtatIngredients();
}

itemsIngredientsRecherche.forEach(function (item) {
  item.addEventListener("click", function () {
    ajouterLigneIngredient(this.dataset.id, this.textContent.trim(), "", this.dataset.gCafe, this.dataset.gSoupe);
    fermerRechercheIngredient();
    // #autocompleteIngredient est toujours le dernier enfant : la ligne qu'on vient d'ajouter
    // est donc juste avant lui (voir insertBefore dans ajouterLigneIngredient), pas forcément
    // le ":last-child" au sens CSS puisque ce titre revient maintenant à la recherche elle-même
    const derniereLigne = autocompleteIngredient.previousElementSibling;
    if (derniereLigne) derniereLigne.querySelector(".ingredient-quantite-recette").focus();
  });
});

document.addEventListener("click", function (e) {
  if (!autocompleteIngredient.classList.contains("replie") && !e.target.closest("#autocompleteIngredient") && e.target !== btnToggleAjoutIngredient) {
    fermerRechercheIngredient();
  }
});

// Pour une NOUVELLE recette, valider le nom (Entrée) suffit à enregistrer directement, comme
// une confirmation. En édition, Entrée ne doit rien déclencher tout seul : on a probablement
// juste renommé la recette et on va encore modifier des ingrédients avant d'enregistrer.
recetteNomInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && recetteIdInput.value) {
    event.preventDefault();
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
    const champQuantite = ligne.querySelector(".ingredient-quantite-recette");
    const champUnite = ligne.querySelector(".ingredient-unite-recette");
    const quantite = champQuantite.value;
    if (!ligne.dataset.foodId || !quantite) return;

    // Ce qui part au serveur est TOUJOURS en grammes : si une unité (c. à café/soupe) est
    // sélectionnée, on convertit avant d'envoyer plutôt que de faire croire au serveur que
    // "0.5" désigne 0.5 gramme
    const unite = champUnite ? champUnite.value : "g";
    const ratio = grammesParUniteIngredient(ligne, unite);
    ingredients.push({ food_id: ligne.dataset.foodId, quantite_g: Number(quantite) * ratio });
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
