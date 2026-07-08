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
const btnToutEffacer = document.getElementById("btnToutEffacer"); // bouton "Tout effacer"

const btnToggleRecette = document.getElementById("btnToggleRecette"); // bouton pour ouvrir/fermer le panneau de création de recette
const panneauCreerRecette = document.getElementById("panneauCreerRecette"); // panneau (formulaire) de création de recette
const formCreerRecette = document.getElementById("formCreerRecette"); // le formulaire lui-même
const listeIngredients = document.getElementById("listeIngredients"); // liste des ingrédients ajoutés à la nouvelle recette
const rechercheIngredient = document.getElementById("rechercheIngredient"); // champ de recherche d'ingrédient pour la recette
const listeIngredientsRecherche = document.getElementById("listeIngredientsRecherche"); // suggestions d'ingrédients
const nomRecette = document.getElementById("nomRecette"); // champ texte pour le nom de la nouvelle recette

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

  let count = 0;
  listeAlimentsCalories.hidden = false;

  // On affiche seulement les aliments qui contiennent le texte tapé, limité à 5 suggestions
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
}

// ============================================
// CONSTRUCTION D'UNE ENTRÉE
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
// RECETTES — ajout instantané via dropdown
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
// PANNEAU CRÉER UNE RECETTE
// ============================================

// Ouvre/ferme le panneau permettant de créer une nouvelle recette
btnToggleRecette.addEventListener("click", function () {
  panneauCreerRecette.classList.toggle("hidden");
});

// Crée une ligne représentant un ingrédient dans le formulaire de création de recette
// (nom de l'aliment + champ pour la quantité en grammes + bouton pour le retirer)
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

// Au départ, la liste de suggestions d'ingrédients est cachée
listeIngredientsRecherche.hidden = true;
const itemsIngredientsRecherche = listeIngredientsRecherche.querySelectorAll("li");

// Quand on tape dans le champ de recherche d'ingrédient (pour la recette)...
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

// Cliquer sur une suggestion ajoute une nouvelle ligne d'ingrédient au formulaire de recette
itemsIngredientsRecherche.forEach(function (item) {
  item.addEventListener("click", function () {
    const foodId = this.dataset.id;
    const foodNom = this.textContent.trim();

    const ligne = creerLigneIngredient(foodId, foodNom);
    listeIngredients.appendChild(ligne);
    ligne.querySelector(".ingredient-quantite").focus(); // le curseur va directement dans le champ quantité

    rechercheIngredient.value = "";
    listeIngredientsRecherche.hidden = true;
  });
});

// Cliquer en dehors referme la liste de suggestions d'ingrédients
document.addEventListener("click", function (e) {
  if (!document.getElementById("autocompleteIngredient").contains(e.target)) {
    listeIngredientsRecherche.hidden = true;
  }
});

// Quand on valide le formulaire de création de recette...
formCreerRecette.addEventListener("submit", function (event) {
  event.preventDefault();

  const nom = nomRecette.value.trim();
  const lignes = listeIngredients.querySelectorAll(".ligne-ingredient");
  const ingredients = [];

  // On construit la liste des ingrédients valides (avec un id d'aliment ET une quantité renseignée)
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

      // On ajoute directement la nouvelle recette dans le menu déroulant, sans recharger la page
      const option = document.createElement("option");
      option.value = data.recette.id;
      option.textContent = data.recette.nom;
      selectRecette.appendChild(option);

      // On réinitialise le formulaire de création de recette
      nomRecette.value = "";
      listeIngredients.innerHTML = "";
      panneauCreerRecette.classList.add("hidden");
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
