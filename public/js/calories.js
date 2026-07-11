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

const selectRecettePlat = document.getElementById("selectRecettePlat"); // menu déroulant pour choisir une recette de plat
const selectRecetteFraicheur = document.getElementById("selectRecetteFraicheur"); // même chose, mais pour les recettes "fraîcheur" (boissons + glaces)
const btnToutEffacer = document.getElementById("btnToutEffacer"); // bouton rond "X" pour tout effacer
const btnEnregistrerRecette = document.getElementById("btnEnregistrerRecette"); // bouton "Enregistrer comme recette" (conditionnel)

// Renvoie le menu déroulant "appliquer une recette" correspondant à une catégorie donnée
function selectRecettePourCategorie(categorie) {
  return categorie === "fraicheur" ? selectRecetteFraicheur : selectRecettePlat;
}

// Ajoute la classe "entree" (petite animation d'apparition, voir @keyframes popIn) puis la
// retire une fois l'animation terminée. Important : "animation: ... both" (voir style.css) fait
// tenir la valeur de fin indéfiniment tant que la classe reste posée — si on ne la retirait
// jamais, cette animation continuait à "posséder" la propriété transform de l'élément pour
// toujours, et écrasait silencieusement tout transform posé plus tard en JS (ex: le glissement
// FLIP des boutons monter/descendre, voir animerEchange), qui semblait alors ne rien faire du tout.
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

// Retire les accents ("é" -> "e", "à" -> "a"...) pour que la recherche les ignore : taper "e"
// doit trouver "Café" aussi bien que "Cafe". NFD décompose chaque lettre accentuée en deux
// caractères (la lettre de base + un accent séparé), qu'on peut ensuite retirer avec la regex
// (plage Unicode des signes diacritiques combinants).
function normaliserTexte(str) {
  return str.normalize("NFD").replace(new RegExp("[̀-ͯ]", "g"), "");
}

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
  const recherche = normaliserTexte(this.value.toLowerCase());

  if (recherche === "") {
    listeAlimentsCalories.hidden = true;
    return;
  }

  listeAlimentsCalories.hidden = false;

  // On affiche tous les aliments qui contiennent le texte tapé. Aucune limite de nombre :
  // si la liste est longue, elle défile (voir max-height dans style.css). normaliserTexte des
  // deux côtés : taper "e" doit aussi trouver "Café" (accents ignorés).
  itemsAutocomplete.forEach(function (item) {
    item.hidden = !normaliserTexte(item.textContent.toLowerCase()).includes(recherche);
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
      ajouterAnimationEntree(nouvelleEntree);
      recalculerTotaux();
      mettreAJourBoutonsReorder(listeJournal, ".journal-item");
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
      grammes_par_cuil_a_soupe: item.dataset.gSoupe,
      poids_unite_g: item.dataset.poidsPiece,
      unite_piece: item.dataset.unitePiece,
      emoji: item.dataset.emoji
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
  div.dataset.emoji = entree.emoji;
  div.dataset.gCafe = entree.grammes_par_cuil_a_cafe ?? "";
  div.dataset.gSoupe = entree.grammes_par_cuil_a_soupe ?? "";
  // "pièce" (poids_unite_g) n'a de sens que pour un aliment compté à l'unité (un jaune d'oeuf,
  // une gousse de vanille) : un aliment suivi en "cl"/"pack" n'a pas de poids fixe par pièce.
  // poids_unite_g est NOT NULL en base (0.00 = "pas de pièce définie") : Number(...) est
  // nécessaire, sinon la chaîne "0.00" renvoyée par le serveur reste "vraie" en JS.
  const poidsPiece = entree.tracking_type === "unite" ? Number(entree.poids_unite_g) : 0;
  div.dataset.poidsPiece = poidsPiece || "";
  div.dataset.unitePiece = entree.unite_piece || "";
  div.dataset.quantiteG = quantite;

  // Même logique que côté serveur (calories.ejs) : le sélecteur d'unité est toujours affiché
  // (au moins "g"), pour que toutes les lignes du journal aient la même forme
  let optionsUnite = "";
  if (entree.grammes_par_cuil_a_cafe) optionsUnite += `<option value="cafe">tsp</option>`;
  if (entree.grammes_par_cuil_a_soupe) optionsUnite += `<option value="soupe">tbs</option>`;
  if (poidsPiece) optionsUnite += `<option value="piece">${escapeHtml(entree.unite_piece || "pc")}</option>`;
  const selectUnite = `<select class="journal-unite-select"><option value="g">g</option>${optionsUnite}</select>`;

  div.innerHTML = `
    <div class="reorder-controls">
      <button type="button" class="btn-reorder btn-reorder-haut" title="Monter" aria-label="Monter"></button>
      <button type="button" class="btn-reorder btn-reorder-bas" title="Descendre" aria-label="Descendre"></button>
    </div>
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
          step="any"
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
  if (unite === "piece") return Number(item.dataset.poidsPiece);
  return 1;
}

// ============================================
// RÉARRANGER (Journal + ingrédients de recette) — boutons monter/descendre
// ============================================

// Anime un échange de position (technique FLIP) : on mesure où étaient les deux éléments AVANT
// le changement, on effectue le changement (le callback réordonne le DOM), puis on triche en
// affichant chaque élément décalé à SON ancienne position (transform, sans transition) avant de
// relâcher la transition pour qu'il glisse en douceur vers sa vraie place — un simple insertBefore
// ferait "sauter" les deux lignes instantanément sans ça.
function animerEchange(elements, callback) {
  const positionsAvant = elements.map(function (el) { return el.getBoundingClientRect(); });
  callback();
  elements.forEach(function (el, i) {
    const avant = positionsAvant[i];
    const apres = el.getBoundingClientRect();
    const deltaY = avant.top - apres.top;
    if (!deltaY) return;
    el.style.transition = "none";
    el.style.transform = "translateY(" + deltaY + "px)";
    requestAnimationFrame(function () {
      el.style.transition = "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)";
      el.style.transform = "";
    });
    el.addEventListener("transitionend", function nettoyer() {
      el.style.transition = "";
      el.removeEventListener("transitionend", nettoyer);
    });
  });
}

// Désactive le bouton "monter" du premier élément et "descendre" du dernier (rien à faire dans
// ce sens) : appelée après chaque déplacement, ajout ou suppression pour rester à jour
function mettreAJourBoutonsReorder(container, selecteur) {
  const items = Array.from(container.querySelectorAll(selecteur));
  items.forEach(function (item, index) {
    const btnHaut = item.querySelector(".btn-reorder-haut");
    const btnBas = item.querySelector(".btn-reorder-bas");
    // "visibility" (pas "display") : le bouton disparaît sans faire bouger l'autre (celui du bas
    // resterait sinon tout seul, décentré, dans la colonne des deux boutons empilés)
    if (btnHaut) {
      btnHaut.disabled = index === 0;
      btnHaut.style.visibility = index === 0 ? "hidden" : "";
    }
    if (btnBas) {
      btnBas.disabled = index === items.length - 1;
      btnBas.style.visibility = index === items.length - 1 ? "hidden" : "";
    }
  });
}

// Journal : le déplacement est aussi envoyé au serveur (voir /calories/deplacer), qui échange
// juste l'ordre de cette entrée avec sa voisine — l'ordre survit donc à un rechargement de page.
function activerReorderJournal(item) {
  const btnHaut = item.querySelector(".btn-reorder-haut");
  const btnBas = item.querySelector(".btn-reorder-bas");
  if (!btnHaut || !btnBas) return;

  function deplacer(direction) {
    const voisin = direction === "haut" ? item.previousElementSibling : item.nextElementSibling;
    if (!voisin || !voisin.classList.contains("journal-item")) return;

    animerEchange([item, voisin], function () {
      if (direction === "haut") {
        listeJournal.insertBefore(item, voisin);
      } else {
        listeJournal.insertBefore(voisin, item);
      }
    });
    mettreAJourBoutonsReorder(listeJournal, ".journal-item");

    fetch("/calories/deplacer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idEntree: item.dataset.id, direction: direction })
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data.erreur) alert(data.erreur);
      });
  }

  btnHaut.addEventListener("click", function () { deplacer("haut"); });
  btnBas.addEventListener("click", function () { deplacer("bas"); });
}

// Ingrédients de recette : purement local, aucun appel serveur — la recette entière est
// supprimée/réinsérée dans l'ordre du formulaire à l'enregistrement (voir formRecette submit),
// donc réordonner le DOM avant d'enregistrer suffit à faire persister le nouvel ordre.
function activerReorderIngredient(ligne) {
  const btnHaut = ligne.querySelector(".btn-reorder-haut");
  const btnBas = ligne.querySelector(".btn-reorder-bas");
  if (!btnHaut || !btnBas) return;

  btnHaut.addEventListener("click", function () {
    const voisin = ligne.previousElementSibling;
    if (!voisin || !voisin.classList.contains("ligne-ingredient-recette")) return;
    animerEchange([ligne, voisin], function () {
      listeIngredientsRecette.insertBefore(ligne, voisin);
    });
    mettreAJourBoutonsReorder(listeIngredientsRecette, ".ligne-ingredient-recette");
  });

  btnBas.addEventListener("click", function () {
    const voisin = ligne.nextElementSibling;
    if (!voisin || !voisin.classList.contains("ligne-ingredient-recette")) return;
    animerEchange([ligne, voisin], function () {
      listeIngredientsRecette.insertBefore(voisin, ligne);
    });
    mettreAJourBoutonsReorder(listeIngredientsRecette, ".ligne-ingredient-recette");
  });
}

// Active les comportements interactifs d'une entrée du journal : modification de la quantité et suppression
function activerItem(item) {
  activerReorderJournal(item);
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
      // Même raison que côté Recette (voir ajouterLigneIngredient) : le minimum est un poids
      // (0.25g), pas un nombre fixe valable dans n'importe quelle unité affichée.
      champGrammes.min = Math.round((0.25 / ratio) * 10000) / 10000;
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
          mettreAJourBoutonsReorder(listeJournal, ".journal-item");
        }, 300);
      });
  });
}

// ============================================
// RECETTES — application via dropdown (remplace le journal du jour)
// ============================================

// Quand on choisit une recette dans l'un ou l'autre menu déroulant, on remplace tout le journal
// du jour par ses ingrédients : même comportement pour #selectRecettePlat (plat) et
// #selectRecetteFraicheur (fraîcheur), donc factorisé ici plutôt que dupliqué deux fois.
function appliquerRecetteAuJournal(selectEl) {
  const idRecette = selectEl.value;

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
        ajouterAnimationEntree(nouvelleEntree);
      });

      recalculerTotaux();
      mettreAJourBoutonsReorder(listeJournal, ".journal-item");
      // On réinitialise le menu déroulant (sinon la recette resterait affichée comme sélectionnée)
      selectEl.value = "";
      // On informe notre "custom select" (voir custom-selects.js) que la valeur a changé, pour qu'il se mette à jour visuellement
      selectEl.dispatchEvent(new Event("custom-select:update"));
    })
    .catch(function (err) {
      console.error(err);
      alert("Une erreur est survenue.");
    });
}

selectRecettePlat.addEventListener("change", function () {
  appliquerRecetteAuJournal(selectRecettePlat);
});

selectRecetteFraicheur.addEventListener("change", function () {
  appliquerRecetteAuJournal(selectRecetteFraicheur);
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
mettreAJourBoutonsReorder(listeJournal, ".journal-item");

// Et on calcule les totaux dès le chargement de la page
recalculerTotaux();

// ============================================
// ONGLET RECETTES — deux grilles séparées (Boissons / Plats), création/édition/suppression
// ============================================

// Une grille par catégorie plutôt qu'une seule grille filtrable : plats et fraîcheur ne se
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

  // L'icône combine les 3 premiers émojis d'ingrédients (ex: 🍜🫑🥕), plus parlant qu'une icône
  // générique de catégorie ; repli sur l'icône SVG de catégorie si jamais aucun émoji n'est connu
  const icone = recette.emoji_combo || `<span class="icone-categorie-recette icone-categorie-recette--${recette.categorie}"></span>`;

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

      // L'option peut vivre dans l'un ou l'autre menu déroulant selon la catégorie de la recette
      // (voir selectRecettePourCategorie) : on cherche/retire des deux plutôt que de deviner lequel.
      [selectRecettePlat, selectRecetteFraicheur].forEach(function (select) {
        const option = select.querySelector('option[value="' + idRecette + '"]');
        if (option) {
          option.remove();
          select.dispatchEvent(new Event("custom-select:update"));
        }
      });

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
    listeIngredientsRecette.classList.remove("recherche-ouverte");
    // On referme sans avoir ajouté d'ingrédient : le message "vide" redevient pertinent si la
    // liste est toujours vide (majEtatIngredients ne le réaffiche que dans ce cas précis)
    majEtatIngredients();
  }
});

// Une fois l'ouverture terminée (transition CSS "max-height" arrivée à son terme), on ajoute
// "pret" : voir la règle #autocompleteIngredient.pret pour pourquoi c'est nécessaire (sinon la
// liste de suggestions reste invisible/inaccessible en permanence, impossible d'ajouter un aliment).
// "recherche-ouverte" sur #listeIngredientsRecette juste à côté pour la même raison, un niveau
// plus haut (voir le commentaire sur cette classe en CSS).
autocompleteIngredient.addEventListener("transitionend", function (event) {
  if (event.propertyName === "max-height" && !autocompleteIngredient.classList.contains("replie")) {
    autocompleteIngredient.classList.add("pret");
    listeIngredientsRecette.classList.add("recherche-ouverte");
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
  if (unite === "piece") return Number(ligne.dataset.poidsPiece);
  return 1;
}

// Ajoute une ligne d'ingrédient éditable dans le panneau (nom, grammage, bouton de suppression).
// gCafe/gSoupe sont les équivalences cuillère de CET aliment (voir aliment-detail.js), poidsPiece
// le poids d'une pièce pour un aliment compté à l'unité (ex: un jaune d'oeuf, une gousse de
// vanille) : le sélecteur d'unité est toujours affiché (au moins "g"), les autres s'ajoutent
// seulement s'ils existent pour cet aliment précis. "emoji" est gardé sur la ligne pour composer
// l'icône de la carte recette (les 3 premiers emojis des ingrédients, voir formRecette submit).
function ajouterLigneIngredient(foodId, nom, quantiteG, gCafe, gSoupe, poidsPiece, unitePiece, emoji) {
  // Si l'ingrédient est déjà dans la liste, on ne le duplique pas : on remet juste le focus sur sa quantité
  const existante = listeIngredientsRecette.querySelector('.ligne-ingredient-recette[data-food-id="' + foodId + '"]');
  if (existante) {
    existante.querySelector(".ingredient-quantite-recette").focus();
    return;
  }

  // poids_unite_g est NOT NULL en base (0.00 = "pas de pièce définie" pour cet aliment) : les
  // appelants passent parfois cette valeur telle quelle (chaîne "0.00" venue du serveur), qui est
  // "vraie" en JS même à zéro — Number(...) normalise ça une bonne fois pour toutes ici, plutôt
  // que de faire confiance à chaque appelant de ajouterLigneIngredient pour y penser.
  const poidsPieceNum = Number(poidsPiece) || 0;

  const ligne = document.createElement("div");
  ligne.className = "ligne-ingredient-recette";
  ligne.dataset.foodId = foodId;
  ligne.dataset.emoji = emoji || "";
  ligne.dataset.gCafe = gCafe || "";
  ligne.dataset.gSoupe = gSoupe || "";
  ligne.dataset.poidsPiece = poidsPieceNum || "";

  let optionsUnite = "";
  if (gCafe) optionsUnite += `<option value="cafe">tsp</option>`;
  if (gSoupe) optionsUnite += `<option value="soupe">tbs</option>`;
  if (poidsPieceNum) optionsUnite += `<option value="piece">${escapeHtml(unitePiece || "pc")}</option>`;
  const selectUnite = `<select class="ingredient-unite-recette"><option value="g">g</option>${optionsUnite}</select>`;

  ligne.innerHTML = `
    <div class="reorder-controls">
      <button type="button" class="btn-reorder btn-reorder-haut" title="Monter" aria-label="Monter"></button>
      <button type="button" class="btn-reorder btn-reorder-bas" title="Descendre" aria-label="Descendre"></button>
    </div>
    <span class="ingredient-nom-recette">${escapeHtml(nom)}</span>
    <input type="number" class="ingredient-quantite-recette" step="any" min="0.25" placeholder="g" value="${quantiteG || ""}" />
    ${selectUnite}
    <button type="button" class="btn-supprimer-dash ingredient-x-recette" title="Retirer"></button>
  `;

  activerReorderIngredient(ligne);

  ligne.querySelector(".ingredient-x-recette").addEventListener("click", function () {
    ligne.classList.add("disparait");
    setTimeout(function () {
      ligne.remove();
      majEtatIngredients();
      mettreAJourBoutonsReorder(listeIngredientsRecette, ".ligne-ingredient-recette");
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
      if (ratio) {
        champQuantite.value = Math.round((grammesActuels / ratio) * 100) / 100;
        // Le minimum (0.25g à l'origine) est un poids, pas un nombre magique : sans cette
        // conversion, 0.25 restait le seuil MÊME en cuillère/pièce, rejetant des quantités
        // pourtant valides (ex: 0.17 c. à café de sel = 1g, largement au-dessus du vrai minimum)
        champQuantite.min = Math.round((0.25 / ratio) * 10000) / 10000;
      }
    });
  }

  ligne.classList.add("entree");
  // #autocompleteIngredient est TOUJOURS le dernier enfant de la liste (voir calories.ejs) :
  // on insère chaque nouvelle ligne juste avant lui plutôt qu'à la toute fin, pour qu'il reste
  // en place sous le dernier ingrédient au lieu d'être poussé après.
  listeIngredientsRecette.insertBefore(ligne, autocompleteIngredient);
  majEtatIngredients();
  mettreAJourBoutonsReorder(listeIngredientsRecette, ".ligne-ingredient-recette");
}

// Réinitialise le panneau : formulaire vide, prêt pour une nouvelle recette (ou pré-rempli, voir ouvrirSheet)
function reinitialiserSheet() {
  // Filet de sécurité : après un enregistrement réussi, le bouton reste sur "Enregistrement..."
  // (voir formRecette submit) puisque fermerSheet() ne le remet pas lui-même à son état normal.
  // Sans ça, rouvrir n'importe quel panneau ensuite affichait ce texte figé en permanence.
  btnEnregistrerSheet.textContent = "Enregistrer";
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
  listeIngredientsRecette.classList.remove("recherche-ouverte");
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
    ajouterLigneIngredient(ing.food_id, ing.nom, ing.quantite_g, ing.grammes_par_cuil_a_cafe, ing.grammes_par_cuil_a_soupe, ing.poids_unite_g, ing.unite_piece, ing.emoji);
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
        const poidsPiece = ing.tracking_type === "unite" ? ing.poids_unite_g : null;
        ajouterLigneIngredient(ing.food_id, `${ing.emoji} ${ing.nom}`, parseFloat(ing.quantite_g), ing.grammes_par_cuil_a_cafe, ing.grammes_par_cuil_a_soupe, poidsPiece, ing.unite_piece, ing.emoji);
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
  const recherche = normaliserTexte(this.value.toLowerCase());

  if (recherche === "") {
    listeIngredientsRecherche.hidden = true;
    return;
  }

  listeIngredientsRecherche.hidden = false;

  itemsIngredientsRecherche.forEach(function (item) {
    item.hidden = !normaliserTexte(item.textContent.toLowerCase()).includes(recherche);
  });
});

// Referme complètement la recherche (pas juste la liste de suggestions) : remet le "+" dans son
// état fermé, comme si on l'avait re-touché. Appelée après avoir choisi un ingrédient, en tapant
// en dehors, ou en fermant tout le panneau (voir fermerSheet).
function fermerRechercheIngredient() {
  autocompleteIngredient.classList.add("replie");
  autocompleteIngredient.classList.remove("pret");
  listeIngredientsRecette.classList.remove("recherche-ouverte");
  btnToggleAjoutIngredient.classList.remove("actif");
  rechercheIngredient.value = "";
  listeIngredientsRecherche.hidden = true;
  // Réaffiche le message "vide" si on ferme sans avoir ajouté d'ingrédient (voir majEtatIngredients)
  majEtatIngredients();
}

itemsIngredientsRecherche.forEach(function (item) {
  item.addEventListener("click", function () {
    ajouterLigneIngredient(this.dataset.id, this.textContent.trim(), "", this.dataset.gCafe, this.dataset.gSoupe, this.dataset.poidsPiece, this.dataset.unitePiece, this.dataset.emoji);
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

  // Sans ça, un clic répété pendant que la requête est en cours (l'utilisateur ne voyant
  // aucun retour visuel immédiat) déclenche plusieurs "submit" et donc plusieurs recettes
  // créées en double côté serveur avant que la première réponse ne revienne fermer le sheet.
  if (btnEnregistrerSheet.disabled) return;
  const texteBoutonInitial = btnEnregistrerSheet.textContent;
  btnEnregistrerSheet.disabled = true;
  btnEnregistrerSheet.textContent = "Enregistrement...";

  const idRecette = recetteIdInput.value;
  const nom = recetteNomInput.value.trim();
  const categorie = categorieChoisie();
  const ingredients = [];
  // Les 3 premiers émojis d'ingrédients (dans l'ordre d'ajout) composent l'icône de la carte
  // recette, plutôt qu'une icône générique de catégorie (voir construireRecetteCardDOM)
  const emojisIngredients = [];

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
    if (ligne.dataset.emoji) emojisIngredients.push(ligne.dataset.emoji);
  });

  if (!nom || ingredients.length === 0) {
    alert("Ajoute un nom et au moins un ingrédient valide.");
    btnEnregistrerSheet.disabled = false;
    btnEnregistrerSheet.textContent = texteBoutonInitial;
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
        btnEnregistrerSheet.disabled = false;
        btnEnregistrerSheet.textContent = texteBoutonInitial;
        return;
      }

      // On reconstruit une version "grille" de la recette (compteur d'ingrédients, total kcal...)
      // à partir de ce qu'on vient d'envoyer, pour mettre à jour la carte sans recharger la page.
      // Le total kcal vient directement de la réponse du serveur (seul endroit qui connaît les
      // calories/100g de chaque aliment) : plus besoin d'attendre un rechargement pour l'afficher.
      const recetteMaj = {
        id: idRecette || data.recette.id,
        nom: nom,
        categorie: categorie,
        nb_ingredients: data.recette.nb_ingredients,
        kcal_total: data.recette.kcal_total,
        food_ids: ingredients.map(function (ing) { return ing.food_id; }),
        emoji_combo: emojisIngredients.slice(0, 3).join("")
      };

      // Carte insérée juste avant le "+ Nouvelle recette" de SA grille (celle qui correspond à
      // sa catégorie) : si on vient de changer la catégorie d'une recette en l'éditant, l'ancienne
      // carte (dans l'autre grille) est retirée et une neuve apparaît dans la bonne grille, plutôt
      // que de la remplacer sur place là où elle ne devrait plus être.
      const grille = grilleDeCategorie(categorie);

      // Le menu déroulant concerné dépend de la catégorie ("fraîcheur" a le sien, voir
      // selectRecettePourCategorie) : si on vient de changer la catégorie d'une recette existante,
      // son option doit être retirée de l'ancien menu avant d'être (re)créée dans le bon.
      const bonSelect = selectRecettePourCategorie(categorie);

      if (idRecette) {
        const ancienneCard = document.querySelector('.recette-card[data-id="' + idRecette + '"]');
        if (ancienneCard) ancienneCard.remove();

        [selectRecettePlat, selectRecetteFraicheur].forEach(function (select) {
          const option = select.querySelector('option[value="' + idRecette + '"]');
          if (option) option.remove();
        });
        const nouvelleOption = document.createElement("option");
        nouvelleOption.value = idRecette;
        nouvelleOption.textContent = nom;
        bonSelect.appendChild(nouvelleOption);

        window.RECETTES = window.RECETTES.map(function (r) {
          return String(r.id) === String(idRecette) ? recetteMaj : r;
        });
      } else {
        const option = document.createElement("option");
        option.value = recetteMaj.id;
        option.textContent = nom;
        bonSelect.appendChild(option);

        window.RECETTES.push(recetteMaj);
      }

      // Le menu était peut-être désactivé (aucune recette de cette catégorie, voir calories.ejs) :
      // maintenant qu'il en a au moins une, on le réactive et on efface le message "Aucune
      // recette de..." qu'il affichait à la place du nom — sinon il fallait recharger la page
      // pour voir apparaître la toute première recette d'une catégorie.
      if (bonSelect.disabled) {
        bonSelect.disabled = false;
        bonSelect.removeAttribute("title");
        const optionVide = bonSelect.querySelector('option[value=""]');
        if (optionVide) optionVide.textContent = "";
      }

      grille.insertBefore(construireRecetteCardDOM(recetteMaj), grille.querySelector(".btn-nouvelle-recette"));

      selectRecettePlat.dispatchEvent(new Event("custom-select:update"));
      selectRecetteFraicheur.dispatchEvent(new Event("custom-select:update"));
      miseAJourBoutonEnregistrerRecette();
      btnEnregistrerSheet.textContent = texteBoutonInitial;
      fermerSheet();
    })
    .catch(function () {
      alert("Erreur réseau, réessaie.");
      btnEnregistrerSheet.disabled = false;
      btnEnregistrerSheet.textContent = texteBoutonInitial;
    });
});
