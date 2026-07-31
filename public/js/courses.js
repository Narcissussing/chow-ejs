// ============================================
// RÉCUPÉRATION DES ÉLÉMENTS HTML DE LA PAGE
// ============================================

const listeCourses = document.getElementById("listeCourses"); // conteneur de tous les articles de la liste de courses
const noResultsCourses = document.getElementById("noResultsCourses"); // message affiché quand la liste est vide
const badgeNbCourses = document.getElementById("badgeNbCourses"); // nombre affiché sur le badge "sac de courses" du hero
const sortSelectCourses = document.getElementById("sortSelectCourses"); // menu de tri (Nom/Catégorie), même select que sur Aliments/Stock
const toggleMagasin = document.getElementById("toggleMagasin"); // bouton pour activer/désactiver le "mode magasin"
const btnPresetHebdo = document.getElementById("btnPresetHebdo"); // bouton "Courses de la semaine" (ajout groupé)
const btnEnregistrerPresetHebdo = document.getElementById("btnEnregistrerPresetHebdo"); // bouton "Enregistrer" (remplace le preset par la liste actuelle)

const rechercheAlimentCourses = document.getElementById("rechercheAlimentCourses"); // champ de recherche pour ajouter un article
const listeAlimentsCourses = document.getElementById("listeAlimentsCourses"); // liste de suggestions d'aliments
const idAlimentCacheCourses = document.getElementById("idAlimentCacheCourses"); // champ caché stockant l'id de l'aliment sélectionné
const formAjouterCourse = document.getElementById("formAjouterCourse"); // formulaire d'ajout d'un article
const btnAjouterCourse = document.getElementById("btnAjouterCourse"); // bouton "+" (même ajout que la touche Entrée)
const btnToggleAjoutCourse = document.getElementById("btnToggleAjoutCourse"); // bouton "+" en haut de page qui ouvre/ferme le panneau
const panneauAjoutCourse = document.getElementById("panneauAjoutCourse"); // le panneau (formulaire) d'ajout lui-même

// Le panneau vit maintenant DANS la liste, comme dernier enfant : il s'ouvre donc juste sous
// le dernier article, plutôt qu'en haut de page loin de ce qu'on est en train de composer
// (même principe que le panneau "ajouter un ingrédient" des recettes, voir calories.js).
listeCourses.appendChild(panneauAjoutCourse);

// Remet le panneau en dernière position dans la liste après tout tri/insertion : trierPar et
// inserrerSelonTri déplacent/insèrent des .course-item via appendChild/insertBefore sans savoir
// que le panneau existe, ce qui le laisserait coincé au milieu de la liste sinon
function repositionnerPanneauAjout() {
    listeCourses.appendChild(panneauAjoutCourse);
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

// Petit bandeau discret en bas de l'écran, plutôt qu'une alert() bloquante à fermer soi-même :
// au magasin, une popup qui interrompt à chaque coupure wifi est plus pénible qu'utile. Se
// referme tout seul après quelques secondes.
function afficherToast(message) {
    let toast = document.getElementById("toastReseau");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toastReseau";
        toast.className = "toast-reseau";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    // Retire puis reposer la classe "visible" (avec un reflow forcé entre les deux) : sans ça,
    // deux échecs rapprochés ne rejoueraient jamais l'animation d'apparition la 2e fois, puisque
    // la classe serait déjà posée depuis le premier message.
    toast.classList.remove("visible");
    void toast.offsetWidth;
    toast.classList.add("visible");
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function () {
        toast.classList.remove("visible");
    }, 3500);
}

// Aucun des appels fetch() de ce fichier n'avait de .catch() à l'origine : sur une connexion
// instable (ex: au magasin, en wifi ou 4G faible), une requête qui échoue ou qui répond avec
// autre chose que du JSON valide (page d'erreur du proxy, portail captif...) faisait planter la
// promesse en silence — aucune alerte, aucun message, le tap semblait juste "ne rien faire".
function gererErreurReseau(err) {
    console.error("Erreur réseau :", err);
    afficherToast("Connexion instable : réessaie dans un instant.");
}

// Réessaie automatiquement une fois, après un court délai, avant d'abandonner pour de bon : au
// magasin, la plupart des échecs sont un raté ponctuel (pas une vraie coupure), et ce seul essai
// supplémentaire rattrape silencieusement la majorité des cas sans que l'utilisateur s'en rende
// compte — pas besoin de retaper soi-même à chaque petit accroc de connexion.
function fetchAvecRetry(url, options, tentativesRestantes) {
    if (tentativesRestantes === undefined) tentativesRestantes = 1;
    return fetch(url, options)
        .then(function (response) {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.json();
        })
        .catch(function (err) {
            if (tentativesRestantes > 0) {
                return new Promise(function (resolve) {
                    setTimeout(resolve, 800);
                }).then(function () {
                    return fetchAvecRetry(url, options, tentativesRestantes - 1);
                });
            }
            throw err;
        });
}

// ============================================
// PANNEAU D'AJOUT (repliable)
// ============================================
// Même comportement que le panneau d'ajout de Stock : le "+" ouvre/ferme un panneau juste en
// dessous de lui (au lieu du formulaire fixe tout en bas de page qu'il y avait avant), avec la
// même animation d'accordéon (voir .panneau-ajout dans style.css).

// Referme le panneau et réinitialise son contenu : rouvrir le panneau plus tard ne doit pas
// retrouver un vieux texte tapé (et le bouton "Ajouter" qu'il avait éventuellement fait apparaître).
// Partagé entre le bouton "+", le tap en dehors du panneau, et la fermeture automatique après
// un ajout réussi.
function fermerPanneauAjoutCourse() {
    panneauAjoutCourse.classList.remove("ouvert");
    panneauAjoutCourse.classList.remove("pret");
    btnToggleAjoutCourse.classList.remove("actif");
    rechercheAlimentCourses.value = "";
    idAlimentCacheCourses.value = "";
    listeAlimentsCourses.hidden = true;
    btnAjouterCourse.classList.add("hidden");
}

btnToggleAjoutCourse.addEventListener("click", function () {
    const estOuvert = panneauAjoutCourse.classList.toggle("ouvert");
    // Le "+" reste rouge (plein) tant que le panneau est ouvert, pour indiquer qu'on est
    // en train d'ajouter, puis redevient un simple contour dès qu'on le referme
    btnToggleAjoutCourse.classList.toggle("actif", estOuvert);
    if (!estOuvert) {
        fermerPanneauAjoutCourse();
    } else {
        // Le panneau vit tout en bas de la liste (voir plus haut) : on y fait défiler la page
        // pour qu'il soit visible avant d'y mettre le curseur, sinon on tape sans rien voir
        panneauAjoutCourse.scrollIntoView({ behavior: "smooth", block: "center" });
        rechercheAlimentCourses.focus();
    }
});

// Taper n'importe où en dehors du panneau (et du bouton qui l'ouvre, sinon on l'ouvrirait et
// refermerait dans la foulée) le referme, comme un vrai menu déroulant plutôt qu'un panneau qui
// ne se referme qu'en retapant explicitement sur le "+"
document.addEventListener("click", function (e) {
    if (!panneauAjoutCourse.classList.contains("ouvert")) return;
    if (e.target.closest("#panneauAjoutCourse") || e.target.closest("#btnToggleAjoutCourse")) return;
    fermerPanneauAjoutCourse();
});

// Une fois l'animation d'ouverture terminée, on ajoute "pret" : le panneau repasse en
// overflow:visible, pour que la liste de suggestions (qui dépasse volontairement sous le
// panneau) redevienne visible
panneauAjoutCourse.addEventListener("transitionend", function (event) {
    if (event.propertyName === "grid-template-rows" && panneauAjoutCourse.classList.contains("ouvert")) {
        panneauAjoutCourse.classList.add("pret");
    }
});

// Renvoie le nom de la classe CSS correspondant au niveau de remplissage d'un aliment suivi en "cl"
// (même mapping que public/js/stock.js), utilisé pour le petit point de couleur "déjà en stock"
function classeNiveauCL(valeur) {
    if (valeur === "plein") return "niveau-plein";
    if (valeur === "à moitié") return "niveau-moitie";
    if (valeur === "presque vide") return "niveau-presque-vide";
    return "niveau-vide";
}

// ============================================
// TRI
// ============================================

// Trie tous les articles de la liste selon la clé demandée ("nom" ou "categorie"),
// puis les réinsère dans le bon ordre dans la page
function trierPar(cle) {
    // On repart des articles seuls : les éventuels en-têtes de catégorie posés par un tri
    // précédent ne sont pas des articles et n'ont pas à être re-triés avec eux
    const items = Array.from(listeCourses.querySelectorAll(".course-item"));
    items.sort(function (a, b) {
        return a.dataset[cle].localeCompare(b.dataset[cle]);
    });

    retirerEntetesCategories();

    if (cle === "categorie") {
        // Un en-tête discret ("FRUITS", "LÉGUMES"...) devant chaque nouveau groupe de catégorie,
        // à la façon des listes de courses par rayon (ex : Rappels sur iOS) : ça donne un repère
        // visuel pendant qu'on fait vraiment ses courses, sans être une vraie section cliquable
        let derniereCategorie = null;
        items.forEach(function (item) {
            if (item.dataset.categorie !== derniereCategorie) {
                derniereCategorie = item.dataset.categorie;
                listeCourses.appendChild(construireEnteteCategorie(derniereCategorie));
            }
            listeCourses.appendChild(item);
        });
    } else {
        items.forEach(function (item) {
            listeCourses.appendChild(item);
        });
    }

    // Chaque appendChild ci-dessus recolle les articles/en-têtes en fin de liste : sans ce
    // rappel, le panneau d'ajout (déplacé là au chargement) se retrouverait repoussé avant eux
    repositionnerPanneauAjout();
    mettreAJourMessageVideCourses();
    mettreAJourBadgeCourses();
}

// Affiche "Aucun article dans la liste de courses" seulement quand la liste est réellement
// vide (même pattern que Stock/Journal, voir noResultsStock/noResultsJournal) : appelé après
// chaque tri, qui se produit lui-même après chaque ajout/suppression (voir trierPar).
function mettreAJourMessageVideCourses() {
    const visibles = listeCourses.querySelectorAll(".course-item").length;
    noResultsCourses.classList.toggle("hidden", visibles > 0);
}

// Le nombre sur le badge "sac de courses" (voir hero__badge--courses) n'était posé qu'une seule
// fois au chargement de la page (rendu côté serveur) : il ne bougeait jamais après un ajout ou
// un achat/suppression en AJAX, sans recharger la page. On le recalcule donc au même moment que
// le message "liste vide" ci-dessus. Le petit "pop"/"shake" ne joue que si le nombre a vraiment
// changé (pas à chaque tri), pour rester un vrai signal et pas un tic visuel permanent.
// "type" distingue l'animation : un achat mérite un rebond joyeux (badge-pop), une suppression
// n'est pas une victoire à célébrer pareil — juste un petit "shake" (badge-shake). Par défaut
// (ajout d'un article, tri initial), on garde le rebond.
function mettreAJourBadgeCourses(type) {
    const nb = listeCourses.querySelectorAll(".course-item").length;
    if (String(nb) === badgeNbCourses.textContent) return;
    badgeNbCourses.textContent = nb;
    const classeAnim = type === "suppression" ? "badge-shake" : "badge-pop";
    badgeNbCourses.classList.remove("badge-pop", "badge-shake");
    void badgeNbCourses.offsetWidth; // force le navigateur à relancer l'animation même répétée coup sur coup
    badgeNbCourses.classList.add(classeAnim);
}

// ============================================
// BADGE COURSES : NAVETTE HERO <-> BARRE D'OUTILS SELON LE SCROLL
// ============================================
// Le badge vit dans le hero par défaut (grand format). Une fois le hero scrollé sous la barre
// d'outils sticky (plus de place pour lui en haut de l'écran), on le déplace RÉELLEMENT (même
// noeud DOM, pas une copie) entre "Au magasin" et "+", en petit format — puis on le ramène dans
// le hero au retour en haut. Technique FLIP (First/Last/Invert/Play) : on capture sa position
// avant/après le déplacement, et on anime la DIFFÉRENCE via un transform, plutôt que de faire
// deviner au navigateur comment interpoler un changement de parent (ce qu'il ne sait pas faire).
const heroCourses = document.getElementById("heroCourses");
const badgeCoursesContainer = document.getElementById("badgeCoursesContainer");
const badgeCoursesAncre = document.getElementById("badgeCoursesAncre");
const barreOutilsCourses = document.querySelector(".courses-controls-row");

let badgeCoursesDansToolbar = false;

// Hauteur réelle du bouton "Trier par" (menu déroulant personnalisé, voir custom-selects.js) :
// mesurée en direct plutôt que devinée en dur en CSS, pour vraiment matcher peu importe comment
// la police/le padding se rendent réellement sur l'appareil.
function hauteurBoutonTri() {
    const bouton = document.querySelector(".sort-wrapper .custom-select__button");
    return bouton ? bouton.offsetHeight : 34;
}

function deplacerBadgeCourses(versToolbar) {
    if (versToolbar === badgeCoursesDansToolbar) return;

    const avant = badgeCoursesContainer.getBoundingClientRect();

    if (versToolbar) {
        badgeCoursesAncre.insertAdjacentElement("afterend", badgeCoursesContainer);
        badgeCoursesContainer.classList.add("badge-courses-toolbar");
        // Taille imposée en JS (pas seulement via la classe CSS) : seul ce moment-là (vers le
        // bas) doit changer la taille — le retour vers le hero (ci-dessous) l'efface pour
        // retrouver EXACTEMENT la taille d'origine du hero, sans valeur intermédiaire figée.
        const taille = hauteurBoutonTri();
        badgeCoursesContainer.style.width = taille + "px";
        badgeCoursesContainer.style.height = taille + "px";
        // Même ratio padding-bottom/hauteur que la version hero (8px pour 65px), pour que le
        // nombre reste centré sur le sac à n'importe quelle taille de bouton "Trier par".
        badgeCoursesContainer.style.paddingBottom = (taille * (8 / 65)).toFixed(1) + "px";
    } else {
        heroCourses.appendChild(badgeCoursesContainer);
        badgeCoursesContainer.classList.remove("badge-courses-toolbar");
        badgeCoursesContainer.style.width = "";
        badgeCoursesContainer.style.height = "";
        badgeCoursesContainer.style.paddingBottom = "";
    }
    badgeCoursesDansToolbar = versToolbar;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const apres = badgeCoursesContainer.getBoundingClientRect();
    const dx = avant.left - apres.left;
    const dy = avant.top - apres.top;
    const echelleX = avant.width / apres.width;
    const echelleY = avant.height / apres.height;

    badgeCoursesContainer.style.transition = "none";
    badgeCoursesContainer.style.transform = `translate(${dx}px, ${dy}px) scale(${echelleX}, ${echelleY})`;
    void badgeCoursesContainer.offsetWidth; // force le navigateur à appliquer l'état de départ avant d'animer
    badgeCoursesContainer.style.transition = "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
    badgeCoursesContainer.style.transform = "";
}

if (heroCourses && badgeCoursesContainer && badgeCoursesAncre && barreOutilsCourses) {
    // rootMargin négatif en haut = zone "cachée" derrière le header fixe + la barre sticky : le
    // badge ne rejoint la barre d'outils que lorsque le hero n'a VRAIMENT plus de place au-dessus
    // de cette zone (pas juste dès qu'on scrolle un peu).
    const styleRacine = getComputedStyle(document.documentElement);
    const hauteurHeader = parseFloat(styleRacine.getPropertyValue("--header-h")) || 65;
    const decalage = hauteurHeader + barreOutilsCourses.offsetHeight;

    const observateurHeroCourses = new IntersectionObserver(
        function (entries) {
            deplacerBadgeCourses(!entries[0].isIntersecting);
        },
        { rootMargin: `-${decalage}px 0px 0px 0px`, threshold: 0 }
    );
    observateurHeroCourses.observe(heroCourses);
}

// Construit un en-tête de catégorie ("FRUITS", "AUTRES"...), inséré juste avant le premier
// article de chaque groupe quand le tri actif est "categorie"
function construireEnteteCategorie(categorie) {
    const entete = document.createElement("p");
    entete.className = "course-categorie-entete";
    entete.textContent = categorie === "zzz" ? "Autres" : categorie;
    return entete;
}

// Retire tous les en-têtes de catégorie actuellement affichés (appelé avant chaque nouveau tri,
// qu'il reste sur "categorie" ou qu'on repasse à "nom")
function retirerEntetesCategories() {
    listeCourses.querySelectorAll(".course-categorie-entete").forEach(function (entete) {
        entete.remove();
    });
}

// Renvoie la clé de tri actuellement active, en lisant directement la valeur du select
function cleTriActive() {
    return sortSelectCourses.value;
}

// Changer la valeur du menu de tri retrie toute la liste, même principe que sur Aliments/Stock
sortSelectCourses.addEventListener("change", function () {
    trierPar(this.value);
});

// Tri initial au chargement de la page, selon la valeur par défaut du select ("Nom")
trierPar(sortSelectCourses.value);

// Insère un nouvel article au bon endroit dans la liste, en respectant le tri actuellement actif
// (plutôt que de toujours l'ajouter à la fin, ce qui casserait l'ordre trié)
function inserrerSelonTri(nouvelItem) {
    const cle = cleTriActive();
    const items = Array.from(listeCourses.querySelectorAll(".course-item"));
    // On cherche le premier article qui devrait venir "après" le nouvel article dans l'ordre trié
    const cible = items.find(function (item) {
        return item.dataset[cle].localeCompare(nouvelItem.dataset[cle]) > 0;
    });

    if (cible) {
        listeCourses.insertBefore(nouvelItem, cible);
    } else {
        // Aucun article ne vient après : on l'ajoute juste avant le panneau d'ajout (qui vit
        // en permanence tout en bas de la liste, voir plus haut), pas après lui
        listeCourses.insertBefore(nouvelItem, panneauAjoutCourse);
    }

    mettreAJourMessageVideCourses();
    mettreAJourBadgeCourses();
}

// ============================================
// PRESET "COURSES DE LA SEMAINE" — ENREGISTRER/METTRE À JOUR
// ============================================

// Clé unique pour un article, qu'il vienne d'un data-food-id (article connu) ou d'un data-nom /
// nom_libre (article "libre") : sert à comparer la liste actuelle au preset sans dépendre de l'id
// de ligne (qui change à chaque fois qu'on vide/recrée la liste).
function cleArticlePreset(foodId, nom) {
    return foodId ? "f:" + foodId : "n:" + (nom || "").toLowerCase();
}

// Affiche "Enregistrer" seulement à partir de 5 articles dans la liste, et le désactive si la
// liste actuelle est déjà identique au preset (rien à mettre à jour). Appelé après chaque ajout
// ou suppression d'article (voir plus bas), pas seulement au chargement.
function mettreAJourBoutonPresetHebdo() {
    const items = Array.from(listeCourses.querySelectorAll(".course-item"));

    if (items.length < 5) {
        btnEnregistrerPresetHebdo.classList.add("hidden");
        return;
    }
    btnEnregistrerPresetHebdo.classList.remove("hidden");

    const ensembleActuel = new Set(
        items.map(function (item) {
            return cleArticlePreset(item.dataset.foodId, item.dataset.nom);
        })
    );
    const ensemblePreset = new Set(
        window.PRESET_HEBDO.map(function (article) {
            return cleArticlePreset(article.food_id, article.nom_libre);
        })
    );

    const identique =
        ensembleActuel.size === ensemblePreset.size &&
        Array.from(ensembleActuel).every(function (cle) { return ensemblePreset.has(cle); });

    btnEnregistrerPresetHebdo.disabled = identique;
}

mettreAJourBoutonPresetHebdo();

btnEnregistrerPresetHebdo.addEventListener("click", function () {
    // Remplace définitivement l'ancien preset : pas d'annulation possible une fois enregistré,
    // donc on confirme avant (même principe que "Tout effacer"/"Supprimer cette recette")
    if (!confirm("Remplacer \"Courses de la semaine\" par la liste actuelle ?")) return;

    fetchAvecRetry("/courses/preset-hebdo/enregistrer", { method: "POST" })
        .then(function (data) {
            if (data.erreur) {
                afficherToast(data.erreur);
                return;
            }

            // Le preset côté client doit refléter ce qu'on vient d'enregistrer, sinon le bouton
            // resterait activable pour rien tant que la page n'est pas rechargée
            window.PRESET_HEBDO = Array.from(listeCourses.querySelectorAll(".course-item")).map(function (item) {
                return item.dataset.foodId
                    ? { food_id: item.dataset.foodId, nom_libre: null }
                    : { food_id: null, nom_libre: item.dataset.nom };
            });
            mettreAJourBoutonPresetHebdo();

            // Petite confirmation visuelle (icône "réussi", même que sur Aliments), avant de
            // revenir à l'icône normale (disquette) après un court délai
            btnEnregistrerPresetHebdo.classList.add("confirme");
            setTimeout(function () {
                btnEnregistrerPresetHebdo.classList.remove("confirme");
            }, 1500);
        })
        .catch(gererErreurReseau);
});

// ============================================
// FILTRES PAR RAYON (mode magasin uniquement, voir .preset-hebdo-row__filtres)
// ============================================
// Sélection MULTIPLE (contrairement à Aliments, où un seul filtre exclut les autres) : chaque
// rayon se coche/décoche indépendamment, pour pouvoir combiner par ex. Fruits + Légumes. "Tous"
// reste EXCLUSIF visuellement : dès que le filtre revient à "tout accepté" (soit en cliquant
// "Tous", soit en cochant chaque rayon un par un à la main), seul le bouton "Tous" s'allume —
// jamais "Tous" + chaque rayon en même temps. Un sous-ensemble strict, lui, n'allume que les
// rayons choisis, jamais "Tous". Déclaré AVANT "MODE MAGASIN" ci-dessous : appliquerModeMagasin()
// (juste après) peut appeler reinitialiserFiltreCategorieCourses() dès son tout premier appel,
// donc tout ça doit déjà exister à ce moment-là (sinon erreur "accès avant initialisation").
const courseFiltresMagasin = document.getElementById("courseFiltresMagasin");
let categoriesFiltreActives = new Set();

function boutonsCategorieCourses() {
    return Array.from(courseFiltresMagasin.querySelectorAll('.filter-btn:not([data-categorie="tous"])'));
}

// Les rayons (chips) sont dérivés UNE FOIS, côté serveur, de la liste au moment du chargement de
// la page (voir courses.ejs) : un article ajouté ensuite peut très bien appartenir à un rayon qui
// n'existait pas encore à ce moment-là (aucune chip pour lui). Sans ce garde-fou, un tel article
// se ferait cacher en permanence par appliquerFiltreCategorie{Item,Courses} ci-dessous — même en
// dehors du mode magasin — puisque categoriesFiltreActives ne peut par définition pas le connaître.
function categorieEstConnue(categorie) {
    return boutonsCategorieCourses().some(function (b) {
        return b.dataset.categorie === categorie;
    });
}

// Reflète categoriesFiltreActives sur les boutons : "Tous" seul si tout est sélectionné, sinon
// seuls les rayons réellement choisis (jamais les deux en même temps, voir plus haut).
function metAJourBoutonsFiltreCourses() {
    const total = boutonsCategorieCourses().length;
    const toutSelectionne = categoriesFiltreActives.size === total;
    const boutonTous = courseFiltresMagasin.querySelector('.filter-btn[data-categorie="tous"]');
    boutonTous.classList.toggle("active", toutSelectionne);
    boutonsCategorieCourses().forEach(function (b) {
        b.classList.toggle("active", !toutSelectionne && categoriesFiltreActives.has(b.dataset.categorie));
    });
}

function appliquerFiltreCategorieCourses() {
    document.querySelectorAll("#listeCourses .course-item").forEach(function (item) {
        if (!categorieEstConnue(item.dataset.categorie)) return; // rayon apparu après coup : jamais filtré
        item.classList.toggle("hidden", !categoriesFiltreActives.has(item.dataset.categorie));
    });
}

// Remet tout à "sélectionné" (donc rien de filtré) : appelé en quittant le mode magasin, pour ne
// pas laisser des articles invisibles la prochaine fois qu'on compose sa liste normalement.
function reinitialiserFiltreCategorieCourses() {
    if (!courseFiltresMagasin) return;
    categoriesFiltreActives = new Set(boutonsCategorieCourses().map((b) => b.dataset.categorie));
    metAJourBoutonsFiltreCourses();
    document.querySelectorAll("#listeCourses .course-item").forEach(function (item) {
        item.classList.remove("hidden");
    });
}

// Applique le filtre actuel à UN article donné (utilisé pour les articles ajoutés après coup,
// pendant qu'un filtre est déjà en cours — voir activerItem plus bas).
function appliquerFiltreCategorieItem(item) {
    if (!courseFiltresMagasin) return;
    if (!categorieEstConnue(item.dataset.categorie)) return; // rayon apparu après coup : jamais filtré
    item.classList.toggle("hidden", !categoriesFiltreActives.has(item.dataset.categorie));
}

if (courseFiltresMagasin) {
    reinitialiserFiltreCategorieCourses(); // tout coché par défaut au chargement

    courseFiltresMagasin.querySelectorAll(".filter-btn").forEach(function (bouton) {
        bouton.addEventListener("click", function () {
            const categorie = this.dataset.categorie;

            const toutEtaitCoche = categoriesFiltreActives.size === boutonsCategorieCourses().length;

            if (categorie === "tous") {
                // Interrupteur : si tout est déjà sélectionné, "Tous" désélectionne tout ; sinon
                // il sélectionne tout (même depuis un état partiel).
                categoriesFiltreActives = toutEtaitCoche ? new Set() : new Set(boutonsCategorieCourses().map((b) => b.dataset.categorie));
            } else if (toutEtaitCoche) {
                // On repart d'une sélection unique plutôt que de juste retirer celle-ci du tout :
                // cliquer un rayon depuis "Tous" doit se sentir comme "je choisis CE rayon-là",
                // pas comme "je retire ce seul rayon parmi tous les autres encore cochés".
                // Les clics suivants (branche ci-dessous) pourront ensuite en ajouter d'autres.
                categoriesFiltreActives = new Set([categorie]);
            } else if (categoriesFiltreActives.has(categorie)) {
                categoriesFiltreActives.delete(categorie);
            } else {
                categoriesFiltreActives.add(categorie);
            }

            metAJourBoutonsFiltreCourses();
            appliquerFiltreCategorieCourses();
        });
    });
}

// ============================================
// MODE MAGASIN
// ============================================

// Le "mode magasin" change l'affichage de la page (probablement en simplifiant l'interface)
// pour une utilisation pratique pendant qu'on fait ses courses au magasin
function appliquerModeMagasin(actif) {
    document.body.classList.toggle("mode-magasin", actif);
    toggleMagasin.classList.toggle("actif", actif);
    // En quittant le mode magasin, on efface le filtre par rayon (voir plus haut) : sinon des
    // articles resteraient invisibles la prochaine fois qu'on compose sa liste normalement,
    // sans le repère visuel du filtre actif pour comprendre pourquoi.
    if (!actif) reinitialiserFiltreCategorieCourses();
}

// On se souvient du mode magasin choisi précédemment grâce au localStorage du navigateur
// (il reste actif même si on ferme et rouvre la page)
const modeMagasinSauvegarde = localStorage.getItem("modeMagasin") === "true";
appliquerModeMagasin(modeMagasinSauvegarde);

// Clic sur le bouton : on inverse l'état actuel et on le sauvegarde
toggleMagasin.addEventListener("click", function () {
    const nouvelEtat = !document.body.classList.contains("mode-magasin");
    appliquerModeMagasin(nouvelEtat);
    localStorage.setItem("modeMagasin", nouvelEtat);
});

// ============================================
// PRESET "COURSES DE LA SEMAINE" (ajout groupé, sans rien effacer)
// ============================================

btnPresetHebdo.addEventListener("click", function () {
    fetchAvecRetry("/courses/preset-hebdo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    })
        .then(function (data) {
            if (data.erreur) {
                alert(data.erreur);
                return;
            }

            // Le serveur n'a renvoyé que les articles pas encore dans la liste : s'il n'y en a aucun,
            // tout le preset était déjà présent, on ne fait rien de plus
            if (data.items.length === 0) {
                alert("Tout est déjà dans la liste de courses.");
                return;
            }

            // On ajoute chaque nouvel article au bon endroit (selon le tri actif), sans toucher au reste
            data.items.forEach(function (item) {
                const nouvelItem = construireItemDOM(item);
                inserrerSelonTri(nouvelItem);
                activerItem(nouvelItem);
                ajouterAnimationEntree(nouvelItem);
            });
            mettreAJourBoutonPresetHebdo();
        })
        .catch(gererErreurReseau);
});

// ============================================
// COMMENTAIRES / NOTES
// ============================================

// Affiche le champ de saisie de commentaire (+ bouton photo) pour un article donné, et cache
// la note affichée à la place. "ligne" (pas juste l'input) est ce qui s'affiche/se cache
// maintenant : elle contient le champ ET le bouton photo côte à côte (voir courses.ejs).
function afficherInput(idCourse) {
    const input = document.querySelector(`.input-commentaire[data-id="${idCourse}"]`);
    const ligne = input.closest(".ligne-commentaire");
    const note = document.querySelector(`.note-affichee[data-id="${idCourse}"]`);

    if (note && !note.classList.contains("hidden")) {
        // Petite animation de disparition avant de cacher réellement la note
        note.classList.add("masquage");
        setTimeout(function () {
            note.classList.add("hidden");
            note.classList.remove("masquage");
        }, 150);
    }

    ligne.classList.remove("hidden");
    input.focus();
}

// Active le comportement "cliquer pour ajouter/modifier une note" sur un article donné
function activerNote(item) {
    const emoji = item.querySelector(".course-nom-emoji");
    const input = item.querySelector(".input-commentaire");
    const ligne = input.closest(".ligne-commentaire");

    // On mémorise la valeur d'origine (celle rendue par le serveur au chargement de la page)
    input.dataset.original = input.value.trim();

    // Seul un tap sur l'émoji ouvre le champ de saisie de commentaire (pas tout le nom, trop
    // facile à toucher par accident) — le reste du nom se comporte comme le reste de la carte.
    emoji.addEventListener("click", function () {
        afficherInput(this.dataset.id);
    });

    // Attache le même comportement "cliquer pour éditer" à une note déjà affichée
    function attacherNote(note) {
        note.addEventListener("click", function () {
            afficherInput(this.dataset.id);
        });
    }

    const noteExistante = item.querySelector(".note-affichee");
    if (noteExistante) {
        attacherNote(noteExistante);
    }

    // Quand on quitte le champ de saisie (perte du focus)...
    input.addEventListener("blur", function () {
        const idCourse = this.dataset.id;
        const commentaire = this.value.trim();
        const original = this.dataset.original || "";
        let note = item.querySelector(".note-affichee");

        // Petite animation de disparition de la ligne (champ + bouton photo)
        ligne.classList.add("masquage-input");
        setTimeout(() => {
            ligne.classList.add("hidden");
            ligne.classList.remove("masquage-input");
        }, 150);
        // Rien n'a changé → on annule, on réaffiche la note telle quelle
        if (commentaire === original) {
            if (note) note.classList.remove("hidden");
            return;
        }

        // Champ vidé volontairement (il y avait un texte avant) → suppression
        if (commentaire === "") {
            fetchAvecRetry("/courses/commentaire", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idCourse: idCourse, commentaire: "" })
            }).catch(gererErreurReseau);

            if (note) {
                note.remove();
            }
            this.dataset.original = "";
            return;
        }

        // Texte nouveau ou modifié → sauvegarde côté serveur
        fetchAvecRetry("/courses/commentaire", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idCourse: idCourse, commentaire: commentaire })
        }).catch(gererErreurReseau);

        // Si aucune note n'existait encore à l'écran, on en crée une nouvelle
        if (!note) {
            note = document.createElement("p");
            note.className = "note-affichee";
            note.dataset.id = idCourse;
            note.addEventListener("click", function () {
                afficherInput(this.dataset.id);
            });
            ligne.insertAdjacentElement("beforebegin", note);
        }

        note.innerHTML = `<span class="icone-note"></span> ${escapeHtml(commentaire)}`;
        note.classList.remove("hidden");
        this.dataset.original = commentaire;
    });
}

// ============================================
// PHOTO DE RÉFÉRENCE
// ============================================

const inputPhotoCourse = document.getElementById("inputPhotoCourse");
const photoBackdrop = document.getElementById("photoBackdrop");
const photoApercu = document.querySelector(".photo-apercu");
const imgApercuPhoto = document.getElementById("imgApercuPhoto");
const btnFermerPhoto = document.getElementById("btnFermerPhoto");
const btnRemplacerPhoto = document.getElementById("btnRemplacerPhoto");
const btnSupprimerPhoto = document.getElementById("btnSupprimerPhoto");

// Article concerné par le sélecteur de fichier ou l'aperçu actuellement ouverts (un seul à la
// fois, comme le "input file" lui-même qui est partagé entre toutes les cartes)
let idCoursePhotoActuelle = null;

// Réduit et recompresse une image côté client, AVANT de l'envoyer : une photo de téléphone fait
// souvent plusieurs Mo, bien plus que nécessaire pour reconnaître un emballage au supermarché.
// Redimensionnée sur son plus grand côté + réencodée en JPEG, elle tient en général entre 300
// et 800 Ko à 1600px/qualité 0.9 (assez pour relire du texte fin sur un emballage), toujours
// raisonnable à envoyer même en wifi faible (voir la résilience réseau ajoutée par ailleurs) et
// à stocker (voir la colonne "photo" en base, BYTEA — voir index.js).
const PHOTO_TAILLE_MAX = 1600; // px, sur le plus grand côté
const PHOTO_QUALITE = 0.9;

function compresserImage(fichier) {
    return new Promise(function (resolve, reject) {
        const lecteur = new FileReader();
        lecteur.onload = function () {
            const image = new Image();
            image.onload = function () {
                let largeur = image.width;
                let hauteur = image.height;
                if (largeur > hauteur && largeur > PHOTO_TAILLE_MAX) {
                    hauteur = Math.round((hauteur * PHOTO_TAILLE_MAX) / largeur);
                    largeur = PHOTO_TAILLE_MAX;
                } else if (hauteur > PHOTO_TAILLE_MAX) {
                    largeur = Math.round((largeur * PHOTO_TAILLE_MAX) / hauteur);
                    hauteur = PHOTO_TAILLE_MAX;
                }

                const canvas = document.createElement("canvas");
                canvas.width = largeur;
                canvas.height = hauteur;
                canvas.getContext("2d").drawImage(image, 0, 0, largeur, hauteur);

                const dataUrl = canvas.toDataURL("image/jpeg", PHOTO_QUALITE);
                resolve(dataUrl.split(",")[1]); // juste la partie base64, sans le préfixe "data:image/jpeg;base64,"
            };
            image.onerror = reject;
            image.src = lecteur.result;
        };
        lecteur.onerror = reject;
        lecteur.readAsDataURL(fichier);
    });
}

// Le même bouton photo vit à deux endroits différents selon qu'une photo existe déjà :
// - PAS de photo : dans .ligne-commentaire, à droite du champ de note (caché tant que la note
//   n'est pas ouverte, voir .ligne-commentaire.hidden dans style.css) ;
// - UNE photo existe : sorti de .ligne-commentaire et déplacé en enfant direct de .course-item
//   (élément de grille à part entière, toujours visible en haut à droite, voir style.css) —
//   pas besoin de rouvrir la note à chaque fois pour la reconsulter avant d'acheter.
// On déplace donc le VRAI noeud DOM (pas de clone) d'un parent à l'autre selon les événements.
function placerBoutonPhotoEnHaut(item, bouton) {
    item.appendChild(bouton);
}

function placerBoutonPhotoDansNote(item, bouton) {
    const ligne = item.querySelector(".ligne-commentaire");
    ligne.appendChild(bouton);
}

// Active le bouton photo (ajouter/revoir) d'un article donné : même bouton pour les deux cas,
// son état "data-a-photo" (posé côté serveur, mis à jour ensuite en JS) décide de l'action.
function activerPhoto(item) {
    const bouton = item.querySelector(".btn-photo-course");

    // Au chargement de la page, un article qui a déjà une photo doit l'afficher tout de suite
    // en haut à droite, sans attendre un clic (voir placerBoutonPhotoEnHaut ci-dessus).
    if (bouton.dataset.aPhoto === "true") {
        placerBoutonPhotoEnHaut(item, bouton);
    }

    bouton.addEventListener("click", function () {
        // Petit rebond à chaque tap (même animation que l'ajout réussi, voir style.css) : un
        // retour visuel immédiat, qu'on ouvre l'aperçu ou le sélecteur de fichier juste après.
        this.classList.remove("photo-pop");
        void this.offsetWidth;
        this.classList.add("photo-pop");

        idCoursePhotoActuelle = this.dataset.id;
        if (this.dataset.aPhoto === "true") {
            ouvrirApercuPhoto(idCoursePhotoActuelle);
        } else {
            inputPhotoCourse.value = ""; // sinon rechoisir EXACTEMENT le même fichier ne redéclenche pas "change"
            inputPhotoCourse.click();
        }
    });
}

// ---- Cache local (localStorage) : voir/ajouter une photo doit marcher SANS réseau au magasin.
// Un fetch() en direct à chaque ouverture ne suffirait pas (aucun réseau là-bas) : la photo,
// déjà compressée à quelques dizaines de Ko, est donc aussi gardée sur l'appareil dès qu'on
// l'ajoute, et relue depuis là en priorité — le réseau ne sert plus qu'à la synchroniser une
// fois, au chargement de la page, tant qu'il y a une vraie connexion (voir synchroniserPhotosLocales).
function clePhotoLocale(idCourse) {
    return "chow-photo-course-" + idCourse;
}

function sauvegarderPhotoLocale(idCourse, base64) {
    try {
        localStorage.setItem(clePhotoLocale(idCourse), base64);
    } catch (err) {
        // Quota dépassé ou stockage désactivé (navigation privée...) : tant pis, la photo reste
        // consultable en ligne seulement, pas la peine de bloquer le reste pour ça.
        console.warn("Impossible de garder la photo en cache locale :", err);
    }
}

function lirePhotoLocale(idCourse) {
    return localStorage.getItem(clePhotoLocale(idCourse));
}

function supprimerPhotoLocale(idCourse) {
    localStorage.removeItem(clePhotoLocale(idCourse));
}

// Choix d'un fichier dans le sélecteur (déclenché par le bouton ci-dessus, un seul input partagé)
inputPhotoCourse.addEventListener("change", function () {
    const fichier = this.files[0];
    if (!fichier || !idCoursePhotoActuelle) return;

    const idCourse = idCoursePhotoActuelle;
    let base64Compressee = null;

    compresserImage(fichier)
        .then(function (base64) {
            base64Compressee = base64;
            return fetchAvecRetry("/courses/photo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idCourse: idCourse, photo: base64 })
            });
        })
        .then(function (data) {
            if (data.erreur) {
                afficherToast(data.erreur);
                return;
            }
            const bouton = document.querySelector(`.btn-photo-course[data-id="${idCourse}"]`);
            if (bouton) {
                const item = bouton.closest(".course-item");
                bouton.dataset.aPhoto = "true";
                if (item) placerBoutonPhotoEnHaut(item, bouton); // no-op si déjà en haut (remplacement d'une photo existante)
                bouton.classList.remove("photo-pop");
                void bouton.offsetWidth; // force le navigateur à "oublier" l'animation précédente
                bouton.classList.add("photo-pop");
            }
            // On la garde déjà en local ici : pas la peine d'attendre une resynchro pour pouvoir
            // la revoir hors-ligne, elle est disponible tout de suite après cet ajout.
            sauvegarderPhotoLocale(idCourse, base64Compressee);
            // Remplacement depuis l'aperçu déjà ouvert (voir btnRemplacerPhoto) : on rafraîchit
            // l'image affichée tout de suite, sinon l'ancienne photo reste visible à l'écran.
            if (photoBackdrop.classList.contains("ouvert") && idCoursePhotoActuelle === idCourse) {
                imgApercuPhoto.src = "data:image/jpeg;base64," + base64Compressee;
            }
        })
        .catch(gererErreurReseau);
});

// Ouvre l'aperçu plein écran d'une photo. Le cache local (localStorage) est TOUJOURS tenté en
// premier : c'est ce qui permet de la revoir sans réseau au magasin. Le réseau n'est utilisé que
// si jamais cette photo n'a pas encore été synchronisée sur cet appareil précis.
function ouvrirApercuPhoto(idCourse) {
    idCoursePhotoActuelle = idCourse;
    const local = lirePhotoLocale(idCourse);
    if (local) {
        imgApercuPhoto.src = "data:image/jpeg;base64," + local;
    } else {
        imgApercuPhoto.src = `/courses/${idCourse}/photo?t=${Date.now()}`;
    }
    photoBackdrop.classList.add("ouvert");
}

// Ferme l'aperçu en "aspirant" visuellement la photo vers l'oeil qui l'a ouverte (plutôt qu'une
// simple disparition) : on calcule la distance réelle entre le centre de la photo affichée et le
// centre du bouton oeil de cet article, puis on laisse le keyframe CSS (voir style.css) animer
// vers ce point avant de vraiment cacher le fond assombri.
function fermerApercuPhoto() {
    const bouton = document.querySelector(`.btn-photo-course[data-id="${idCoursePhotoActuelle}"]`);

    if (bouton && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const cibleRect = bouton.getBoundingClientRect();
        const apercuRect = photoApercu.getBoundingClientRect();
        const versX = cibleRect.left + cibleRect.width / 2 - (apercuRect.left + apercuRect.width / 2);
        const versY = cibleRect.top + cibleRect.height / 2 - (apercuRect.top + apercuRect.height / 2);
        photoApercu.style.setProperty("--vers-x", versX + "px");
        photoApercu.style.setProperty("--vers-y", versY + "px");
        photoApercu.classList.add("fermeture");
        photoBackdrop.classList.remove("ouvert");
        setTimeout(function () {
            photoApercu.classList.remove("fermeture");
        }, 350);
    } else {
        photoBackdrop.classList.remove("ouvert");
    }
}

btnFermerPhoto.addEventListener("click", fermerApercuPhoto);

// Remplace la photo existante : réutilise le même sélecteur de fichier partagé que l'ajout
// initial — l'upload écrase déjà l'ancienne photo côté serveur (UPDATE, pas INSERT, voir
// index.js), donc aucune route séparée n'est nécessaire ici.
btnRemplacerPhoto.addEventListener("click", function () {
    if (!idCoursePhotoActuelle) return;
    inputPhotoCourse.value = "";
    inputPhotoCourse.click();
});

photoBackdrop.addEventListener("click", function (e) {
    if (e.target === photoBackdrop) fermerApercuPhoto();
});

btnSupprimerPhoto.addEventListener("click", function () {
    if (!idCoursePhotoActuelle) return;
    const idCourse = idCoursePhotoActuelle;
    fetchAvecRetry("/courses/photo/supprimer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idCourse: idCourse })
    })
        .then(function (data) {
            if (data.erreur) {
                afficherToast(data.erreur);
                return;
            }
            // Fermer AVANT de déplacer le bouton dans la note : l'animation "vers l'oeil" a
            // besoin de sa position actuelle (en haut à droite), pas de sa future position une
            // fois relogé dans .ligne-commentaire (caché) juste après.
            fermerApercuPhoto();
            supprimerPhotoLocale(idCourse);

            const bouton = document.querySelector(`.btn-photo-course[data-id="${idCourse}"]`);
            if (bouton) {
                const item = bouton.closest(".course-item");
                // Petite pause pour laisser la photo finir d'arriver visuellement dans l'oeil
                // (voir aspirePhotoVersOeil), puis l'oeil se ferme et s'efface avant de reloger
                // le bouton (avec l'icône "télécharger") dans la note.
                setTimeout(function () {
                    bouton.classList.add("oeil-fermeture");
                    setTimeout(function () {
                        bouton.classList.remove("oeil-fermeture");
                        bouton.dataset.aPhoto = "false";
                        if (item) placerBoutonPhotoDansNote(item, bouton);
                    }, 300);
                }, 300);
            }
        })
        .catch(gererErreurReseau);
});

// Récupère et met en cache local toute photo déjà enregistrée mais pas encore vue sur cet
// appareil (ex: ajoutée depuis le téléphone de l'autre, ou avant l'installation de ce cache) —
// tenté une fois au chargement de la page, tant qu'il y a du réseau. Échoue en silence si aucun
// réseau : on retentera simplement au prochain chargement de page avec une vraie connexion.
function synchroniserPhotosLocales() {
    document.querySelectorAll('.btn-photo-course[data-a-photo="true"]').forEach(function (bouton) {
        const idCourse = bouton.dataset.id;
        if (lirePhotoLocale(idCourse)) return; // déjà en cache, rien à refaire

        fetch(`/courses/${idCourse}/photo`)
            .then(function (reponse) {
                if (!reponse.ok) throw new Error("photo introuvable");
                return reponse.blob();
            })
            .then(function (blob) {
                const lecteur = new FileReader();
                lecteur.onload = function () {
                    sauvegarderPhotoLocale(idCourse, lecteur.result.split(",")[1]);
                };
                lecteur.readAsDataURL(blob);
            })
            .catch(function () {
                // Pas grave : on retentera au prochain chargement de page avec du réseau
            });
    });
}

// ============================================
// FORMULAIRES QUANTITÉ (suggestions 1/2/5)
// ============================================

// Active les boutons de suggestion rapide de quantité (+1/+2/+5) pour un article donné
function activerQuantite(item) {
    const form = item.querySelector(".form-quantite");
    if (!form) return; // certains articles (ex: suivis en "cl") n'ont pas ce formulaire de quantité

    const champ = form.querySelector(".champ-quantite-achat");
    const btnEnregistrer = form.querySelector(".btn-enregistrer-achat");
    const suggestions = form.querySelectorAll(".suggestion");

    // Cliquer sur une suggestion (+1/+2/+5) achète directement cette quantité, comme les boutons
    // de soustraction rapide sur Stock (même geste en un tap, pas besoin de confirmer avec
    // "Acheté" en plus) : remplit le champ puis soumet le formulaire tout de suite.
    suggestions.forEach(function (bouton) {
        bouton.addEventListener("click", function () {
            champ.value = this.dataset.valeur;
            // Poser .value directement en JS ne déclenche jamais l'événement "input" tout seul :
            // sans cette ligne, le bouton "Acheté" restait désactivé (voir l'écouteur "input"
            // juste en dessous) et requestSubmit() ne soumettait donc rien du tout — le champ se
            // remplissait, mais l'achat n'était jamais réellement envoyé.
            champ.dispatchEvent(new Event("input"));
            form.requestSubmit();
        });
    });

    // Le bouton "Acheté" ne devient cliquable que si une quantité valide (>= 1) a été saisie
    champ.addEventListener("input", function () {
        const etaitDesactive = btnEnregistrer.disabled;
        btnEnregistrer.disabled = champ.value.trim() === "" || Number(champ.value) < 1;

        // Même couleur au repos, activé ou pas (voir style.css) : ce petit "pop" au moment précis
        // où il devient cliquable est le seul signal que quelque chose a changé, sans avoir besoin
        // de deux couleurs différentes en permanence (qui ne correspondaient plus entre un article
        // "cl", toujours actif, et un article à quantité, désactivé par défaut).
        if (etaitDesactive && !btnEnregistrer.disabled) {
            btnEnregistrer.classList.add("vient-de-s-activer");
            setTimeout(function () {
                btnEnregistrer.classList.remove("vient-de-s-activer");
            }, 350);
        }
    });
}

// ============================================
// ENVOI AJAX (acheter / supprimer) + ANIMATIONS DE SORTIE
// ============================================

// Fonction générique : intercepte la soumission d'un formulaire, l'envoie en arrière-plan (fetch)
// au lieu de recharger la page, puis appelle "callback" en cas de succès
function envoyerFormulaireAjax(form, callback) {
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        // Le bouton reste désactivé tant que CET envoi est en cours : sans ça, retaper "Acheté"
        // par inquiétude ("est-ce que ça a marché ?") pendant un aller-retour lent envoyait
        // silencieusement une 2e requête pour le même article — exactement la peur du "j'ai
        // peut-être envoyé plusieurs fois" au magasin. Un seul tap ne peut plus jamais en
        // déclencher deux.
        const boutonSubmit = form.querySelector('button[type="submit"]');
        if (boutonSubmit && boutonSubmit.disabled) return;
        if (boutonSubmit) boutonSubmit.disabled = true;

        const donnees = new FormData(form);
        const objet = {};
        donnees.forEach(function (valeur, cle) {
            objet[cle] = valeur;
        });

        fetchAvecRetry(form.action, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(objet)
        })
            .then(function (data) {
                if (data.erreur) {
                    afficherToast(data.erreur);
                    if (boutonSubmit) boutonSubmit.disabled = false;
                    return;
                }
                // Pas besoin de réactiver le bouton ici : callback() retire la carte entière
                // de la liste (achat ou suppression), il n'y a plus de bouton à réactiver.
                callback(form);
            })
            .catch(function (err) {
                gererErreurReseau(err);
                if (boutonSubmit) boutonSubmit.disabled = false; // on peut retaper pour réessayer
            });
    });
}

// Retire visuellement un article de la liste (avec une petite animation avant suppression réelle)
function retirerItem(form, classeAnim) {
    const item = form.closest(".course-item");
    if (!item) return;

    // Achat ou suppression : la photo de référence n'a plus lieu d'être (le serveur l'efface
    // aussi de son côté, voir /courses/acheter et /courses/supprimer dans index.js) — sans ça,
    // elle resterait orpheline dans le cache local de l'appareil pour rien.
    const bouton = item.querySelector(".btn-photo-course");
    if (bouton) supprimerPhotoLocale(bouton.dataset.id);

    item.classList.add(classeAnim);
    setTimeout(function () {
        item.remove();
        mettreAJourBoutonPresetHebdo();
        mettreAJourMessageVideCourses();
        mettreAJourBadgeCourses(classeAnim === "disparait-supprimer" ? "suppression" : "achat");
    }, 300);
}

// Active les actions "Acheté" et "Supprimer" pour un article donné
function activerActions(item) {
    const formAcheter = item.querySelectorAll(".form-acheter");
    formAcheter.forEach(function (form) {
        envoyerFormulaireAjax(form, function (f) {
            retirerItem(f, "disparait-achete");
        });
    });

    const formSupprimer = item.querySelectorAll(".form-supprimer");
    formSupprimer.forEach(function (form) {
        envoyerFormulaireAjax(form, function (f) {
            retirerItem(f, "disparait-supprimer");
        });
    });
}

// ============================================
// ACTIVATION D'UN ITEM (existant au chargement, ou nouvel item ajouté)
// ============================================

// Regroupe l'activation de tous les comportements interactifs d'un article de la liste de courses
function activerItem(item) {
    activerNote(item);
    activerPhoto(item);
    activerQuantite(item);
    activerActions(item);
    appliquerFiltreCategorieItem(item);
    // Pas d'appel à un "activerArmement(item)" ici : un seul écouteur global s'en charge pour
    // toutes les cartes à la fois (voir plus bas, juste avant le chargement initial des articles).
}

// ============================================
// "ARMEMENT" (confirmation avant d'acheter)
// ============================================

// Un seul article "armé" à la fois : tap ailleurs (une autre carte, ou en dehors) désarme
// automatiquement celui qui l'était (même principe que l'édition sur Stock)
let itemArmeActuellement = null;

// Tant qu'une carte n'a pas été tapée une première fois, le panier reste inerte (voir CSS) : un
// tap accidentel sur celui d'un article "cl" (toujours actif, sans quantité à saisir) ne peut
// plus déclencher un achat tout seul — il faut d'abord "armer" la carte.
//
// Un seul gestionnaire global (plutôt qu'un par carte, voir l'ancienne version) : sinon, taper
// sur une zone à comportement propre (ex: le nom d'UNE AUTRE carte, pour ouvrir sa note) ne
// désarmait jamais la carte encore armée — chaque carte ne surveillait que ses propres clics, pas
// ceux des autres. Un seul écouteur sur "document" voit tous les clics, peu importe leur cible.
function desarmerCarteActuelle() {
    if (!itemArmeActuellement) return;
    itemArmeActuellement.classList.remove("arme");
    itemArmeActuellement = null;
}

document.addEventListener("click", function (e) {
    const carte = e.target.closest(".course-item");

    // Clic entièrement en dehors de toute carte : désarme, rien d'autre à faire
    if (!carte) {
        desarmerCarteActuelle();
        return;
    }

    // Zones à comportement propre (note, suppression, "+1/+2/+5", panier) : ne réarment/ne
    // redésarment jamais la carte cliquée elle-même, mais désarment quand même une AUTRE carte
    // qui serait restée armée (ex: on ouvre la note d'une carte pendant qu'une autre est armée)
    if (e.target.closest(".course-nom-emoji, .input-commentaire, .note-affichee, .form-supprimer, .course-item__quantite-groupe, .course-item__shop-slot, .btn-photo-course")) {
        if (carte !== itemArmeActuellement) desarmerCarteActuelle();
        return;
    }

    if (carte === itemArmeActuellement) {
        desarmerCarteActuelle();
    } else {
        desarmerCarteActuelle();
        carte.classList.add("arme");
        itemArmeActuellement = carte;

        // Même "pop" que le panier non-cl à l'instant où la quantité devient valide : ici, c'est
        // l'armement de la carte qui joue le rôle de "vient de devenir cliquable".
        const btnPanier = carte.querySelector(".btn-acheter-icone");
        if (btnPanier) {
            btnPanier.classList.remove("vient-de-s-activer");
            void btnPanier.offsetWidth;
            btnPanier.classList.add("vient-de-s-activer");
            setTimeout(function () {
                btnPanier.classList.remove("vient-de-s-activer");
            }, 350);
        }
    }
});

// Au chargement de la page, on active tous les articles déjà présents dans le HTML
document.querySelectorAll(".course-item").forEach(activerItem);
// Tant qu'il y a du réseau maintenant (ex: à la maison, avant de partir), on rapatrie en local
// toute photo pas encore en cache sur cet appareil — voir synchroniserPhotosLocales plus haut.
synchroniserPhotosLocales();


// ============================================
// CONSTRUCTION D'UN NOUVEL ITEM (ajout sans rechargement)
// ============================================

// Construit dynamiquement le bloc HTML d'un nouvel article de courses, à partir des données reçues du serveur
function construireItemDOM(item) {
    const div = document.createElement("div");
    const id = escapeHtml(item.id);
    const emoji = escapeHtml(item.emoji);
    const nom = escapeHtml(item.nom);

    div.className = "course-item carte-article";
    div.dataset.nom = item.nom.toLowerCase();
    // "zzz" pour que les articles sans catégorie se retrouvent triés en dernier
    div.dataset.categorie = item.categorie || "zzz";
    // Sert à comparer cette liste au preset "Courses de la semaine" (voir mettreAJourBoutonPresetHebdo)
    div.dataset.foodId = item.food_id || "";

    // Le formulaire "Acheté" est différent selon le type de l'article :
    let formAchat;
    if (item.food_id && item.tracking_type === "cl") {
        // Aliment suivi en "cl" (ex: bouteille) : un simple bouton "Acheté" (remet le niveau à plein).
        // "--solo" : pas de suggestions de quantité à côté, même raccord visuel que côté serveur (voir courses.ejs)
        formAchat = `
      <form action="/courses/acheter" method="post" class="form-acheter">
        <input type="hidden" name="idCourse" value="${id}" />
        <div class="course-item__shop-slot">
          <button type="submit" class="btn-icone-rond btn-acheter-icone">Acheté</button>
        </div>
      </form>`;
    } else if (item.food_id) {
        // Aliment connu suivi en quantité : on propose de saisir/choisir une quantité avant de valider l'achat
        formAchat = `
      <form action="/courses/acheter" method="post" class="form-acheter form-quantite">
        <input type="hidden" name="idCourse" value="${id}" />
        <div class="course-item__quantite-groupe">
          <div class="suggestions-quantite">
            <button type="button" class="suggestion" data-valeur="1"><span class="signe-mini">+</span>1</button>
            <button type="button" class="suggestion" data-valeur="2"><span class="signe-mini">+</span>2</button>
            <button type="button" class="suggestion" data-valeur="5"><span class="signe-mini">+</span>5</button>
          </div>
          <input type="number" name="quantiteAchetee" class="champ-quantite-achat" min="1" placeholder="Quantité" />
        </div>
        <div class="course-item__shop-slot">
          <button type="submit" class="btn-icone-rond btn-acheter-icone btn-enregistrer-achat" disabled>Acheté</button>
        </div>
      </form>`;
    } else {
        // Article "libre" (nom tapé à la main, pas encore un aliment connu) : bouton "Acheté" simple
        formAchat = `
      <form action="/courses/acheter" method="post" class="form-acheter">
        <input type="hidden" name="idCourse" value="${id}" />
        <div class="course-item__shop-slot">
          <button type="submit" class="btn-icone-rond btn-acheter-icone">Acheté</button>
        </div>
      </form>`;
    }

    // Combien on en a déjà en stock (pastille en haut à gauche) :
    // un nombre pour les aliments suivis en quantité, un point de couleur pour les "cl" (ex: bouteille)
    const aDuStock = item.quantite_stock !== null && item.quantite_stock !== undefined;
    let badgeStock = "";
    if (aDuStock && item.tracking_type !== "cl") {
        badgeStock = `<span class="course-stock-indicator course-stock-badge" title="Déjà ${escapeHtml(item.quantite_stock)} en stock">${escapeHtml(item.quantite_stock)}</span>`;
    } else if (aDuStock && item.tracking_type === "cl") {
        badgeStock = `<span class="course-stock-indicator course-stock-dot ${classeNiveauCL(item.quantite_stock)}" title="En stock : ${escapeHtml(item.quantite_stock)}"></span>`;
    }

    div.innerHTML = `
    ${badgeStock}
    <span class="course-nom"><span class="course-nom-emoji" data-id="${id}">${emoji}</span> ${nom}</span>
    <form action="/courses/supprimer" method="post" class="form-supprimer">
      <input type="hidden" name="idCourse" value="${id}" />
      <button type="submit" class="btn-supprimer-icone btn-supprimer-dash">Supprimer</button>
    </form>
    <div class="ligne-commentaire hidden">
      <input type="text" class="input-commentaire" placeholder="Ajouter une note" value="" data-id="${id}" />
      <button type="button" class="btn-photo-course" data-id="${id}" data-a-photo="false" title="Photo de référence"></button>
    </div>
    ${formAchat}
  `;

    return div;
}

// ============================================
// AUTOCOMPLETE + AJOUT INSTANTANÉ (fetch, sans rechargement)
// ============================================

// Au départ, la liste de suggestions est cachée
listeAlimentsCourses.hidden = true;
const itemsAutocomplete = listeAlimentsCourses.querySelectorAll("li");

// Quand l'utilisateur tape dans le champ de recherche d'article...
rechercheAlimentCourses.addEventListener("input", function () {
    idAlimentCacheCourses.value = "";

    const recherche = normaliserTexte(this.value.toLowerCase());

    if (recherche === "") {
        listeAlimentsCourses.hidden = true;
        // Rien de tapé : ni suggestion ni ajout en texte libre n'ont de sens
        btnAjouterCourse.classList.add("hidden");
        rechercheAlimentCourses.classList.remove("recherche-invalide");
        return;
    }

    listeAlimentsCourses.hidden = false;

    // On affiche tous les aliments correspondants. Aucune limite de nombre :
    // si la liste est longue, elle défile (voir max-height dans style.css). normaliserTexte des
    // deux côtés : taper "e" doit aussi trouver "Café" (accents ignorés).
    let aUneCorrespondance = false;
    itemsAutocomplete.forEach(function (item) {
        const correspond = normaliserTexte(item.textContent.toLowerCase()).includes(recherche);
        item.hidden = !correspond;
        if (correspond) aUneCorrespondance = true;
    });

    // Le bouton "Ajouter" (texte libre) n'apparaît que si aucun aliment connu ne correspond :
    // s'il y a des suggestions, on veut qu'on clique dessus plutôt que de dupliquer l'article
    btnAjouterCourse.classList.toggle("hidden", aUneCorrespondance);
    // Rouge seulement si aucun aliment connu ne correspond (le texte libre prend le relais dans
    // ce cas précis, donc "invalide" ici veut vraiment dire "pas dans la base connue").
    rechercheAlimentCourses.classList.toggle("recherche-invalide", !aUneCorrespondance);
});

// Renvoie l'article de la liste de courses déjà en attente pour un aliment donné, s'il y en a un
function trouverCourseItemParFoodId(foodId) {
    return Array.from(listeCourses.querySelectorAll(".course-item")).find(function (item) {
        return item.dataset.foodId === foodId;
    });
}

// Amène l'utilisateur directement sur un article déjà présent (même effet que sur Stock) :
// défilement + brève surbrillance, plutôt que de créer un doublon dans la liste
function mettreEnAvantCourseItem(item) {
    item.scrollIntoView({ behavior: "smooth", block: "center" });
    item.classList.add("mise-en-avant");
    setTimeout(function () {
        item.classList.remove("mise-en-avant");
    }, 1500);
}

// Cliquer sur une suggestion ajoute directement l'article à la liste de courses. Si l'aliment
// choisi y est déjà (pas de doublon possible), on ne l'ajoute pas une 2e fois : on amène
// directement l'utilisateur sur l'article existant, comme sur Stock.
itemsAutocomplete.forEach(function (item) {
    item.addEventListener("click", function () {
        listeAlimentsCourses.hidden = true;
        btnAjouterCourse.classList.add("hidden");
        fermerPanneauAjoutCourse();

        const itemExistant = trouverCourseItemParFoodId(this.dataset.id);
        if (itemExistant) {
            mettreEnAvantCourseItem(itemExistant);
            return;
        }

        ajouterArticle(this.dataset.id, null);
    });
});

// Cliquer en dehors de la zone d'autocomplétion referme la liste de suggestions
document.addEventListener("click", function (e) {
    if (!document.getElementById("autocompleteCourses").contains(e.target)) {
        listeAlimentsCourses.hidden = true;
    }
});

// Entrée dans le champ de recherche : ajoute en texte libre si rien n'a été sélectionné dans la liste
// (permet d'ajouter un article qui n'existe pas encore dans la base des aliments connus)
rechercheAlimentCourses.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    tenterAjoutArticle();
});

// Cliquer sur le bouton "+" fait exactement la même chose qu'appuyer sur Entrée
btnAjouterCourse.addEventListener("click", function () {
    tenterAjoutArticle();
});

// Regroupe la logique partagée entre "Entrée" et le clic sur "+" : on ajoute soit l'aliment
// choisi dans la liste de suggestions, soit le texte tapé tel quel (article "libre")
function tenterAjoutArticle() {
    const idAliment = idAlimentCacheCourses.value || null;
    const texte = rechercheAlimentCourses.value.trim();

    if (!idAliment && texte === "") return;

    ajouterArticle(idAliment, idAliment ? null : texte);
}

// Envoie l'ajout d'un article de courses au serveur (soit via son id, soit en texte libre),
// puis insère le nouvel article à l'écran au bon endroit selon le tri actif
function ajouterArticle(idAliment, texteLibre) {
    fetchAvecRetry("/courses/ajouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idAliment: idAliment, rechercheAliment: texteLibre })
    })
        .then(function (data) {
            if (data.erreur) {
                afficherToast(data.erreur);
                return;
            }

            const nouvelItem = construireItemDOM(data.item);
            inserrerSelonTri(nouvelItem);
            activerItem(nouvelItem);
            ajouterAnimationEntree(nouvelItem);
            mettreAJourBoutonPresetHebdo();

            // On referme le panneau d'ajout automatiquement après un ajout réussi, comme sur Stock
            fermerPanneauAjoutCourse();
        })
        .catch(gererErreurReseau);
}

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
