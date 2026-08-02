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

// Le panneau vit dans la liste, comme dernier enfant : il s'ouvre juste sous le dernier article.
listeCourses.appendChild(panneauAjoutCourse);

// Remet le panneau en dernière position après un tri/insertion (trierPar/inserrerSelonTri le déplaceraient sinon).
function repositionnerPanneauAjout() {
    listeCourses.appendChild(panneauAjoutCourse);
}

// Retire "entree" après l'animation, sinon "animation: ... both" écraserait tout transform posé plus tard en JS.
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

// Retire les accents (NFD + strip des diacritiques) pour que "e" trouve aussi "Café".
function normaliserTexte(str) {
    return str.normalize("NFD").replace(new RegExp("[̀-ͯ]", "g"), "");
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

// Bandeau discret auto-effaçable (pas d'alert() bloquante pour une simple coupure wifi).
function afficherToast(message) {
    let toast = document.getElementById("toastReseau");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toastReseau";
        toast.className = "toast-reseau";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    // Reflow forcé pour rejouer l'animation même si "visible" était déjà posée.
    toast.classList.remove("visible");
    void toast.offsetWidth;
    toast.classList.add("visible");
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function () {
        toast.classList.remove("visible");
    }, 3500);
}

// Sans ça, un fetch() qui échoue en silence (portail captif, wifi faible) laisse le tap sans aucun retour.
function gererErreurReseau(err) {
    console.error("Erreur réseau :", err);
    afficherToast("Connexion instable : réessaie dans un instant.");
}

// Un seul réessai auto après 800ms : rattrape la plupart des accrocs de wifi magasin sans retaper.
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

// Referme le panneau et vide son contenu (texte tapé, bouton "Ajouter" éventuel).
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
    btnToggleAjoutCourse.classList.toggle("actif", estOuvert);
    if (!estOuvert) {
        fermerPanneauAjoutCourse();
    } else {
        // Fait défiler jusqu'au panneau (tout en bas de la liste) avant d'y mettre le curseur.
        panneauAjoutCourse.scrollIntoView({ behavior: "smooth", block: "center" });
        rechercheAlimentCourses.focus();
    }
});

// Cliquer en dehors du panneau (et du bouton qui l'ouvre) le referme.
document.addEventListener("click", function (e) {
    if (!panneauAjoutCourse.classList.contains("ouvert")) return;
    if (e.target.closest("#panneauAjoutCourse") || e.target.closest("#btnToggleAjoutCourse")) return;
    fermerPanneauAjoutCourse();
});

// "pret" repasse en overflow:visible une fois ouvert, pour que la liste de suggestions dépasse sous le panneau.
panneauAjoutCourse.addEventListener("transitionend", function (event) {
    if (event.propertyName === "grid-template-rows" && panneauAjoutCourse.classList.contains("ouvert")) {
        panneauAjoutCourse.classList.add("pret");
    }
});

// Classe CSS du niveau de remplissage pour un aliment suivi en "cl" (même mapping que stock.js).
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
    // Exclut les en-têtes de catégorie d'un tri précédent : pas des articles.
    const items = Array.from(listeCourses.querySelectorAll(".course-item"));
    items.sort(function (a, b) {
        return a.dataset[cle].localeCompare(b.dataset[cle]);
    });

    retirerEntetesCategories();

    if (cle === "categorie") {
        // En-tête discret devant chaque nouveau groupe de catégorie (repère visuel, pas cliquable).
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

    // Le tri vient de recoller tout en fin de liste : remet le panneau d'ajout après.
    repositionnerPanneauAjout();
    mettreAJourMessageVideCourses();
    mettreAJourBadgeCourses();
}

// Affiche "Aucun article" seulement quand la liste est réellement vide.
function mettreAJourMessageVideCourses() {
    const visibles = listeCourses.querySelectorAll(".course-item").length;
    noResultsCourses.classList.toggle("hidden", visibles > 0);
}

// Recalcule le badge après chaque ajout/achat/suppression AJAX. "type" choisit l'anim : achat = rebond (badge-pop), suppression = shake.
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
// Le badge se déplace (même noeud DOM) du hero vers la barre d'outils une fois le hero scrollé
// hors champ, et inversement. Technique FLIP : on anime la différence de position via transform.
const heroCourses = document.getElementById("heroCourses");
const badgeCoursesContainer = document.getElementById("badgeCoursesContainer");
const badgeCoursesAncre = document.getElementById("badgeCoursesAncre");
const barreOutilsCourses = document.querySelector(".courses-controls-row");

let badgeCoursesDansToolbar = false;

// Hauteur réelle du bouton "Trier par", mesurée en direct (pas devinée en CSS).
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
        // Taille imposée en JS pour matcher le bouton "Trier par" ; effacée au retour au hero.
        const taille = hauteurBoutonTri();
        badgeCoursesContainer.style.width = taille + "px";
        badgeCoursesContainer.style.height = taille + "px";
        // Même ratio padding-bottom/hauteur que la version hero, pour garder le nombre centré.
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
    // rootMargin = zone cachée derrière header + barre sticky : le badge ne bouge qu'une fois le hero vraiment hors champ.
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

// Clé stable pour comparer un article au preset, indépendante de son id de ligne.
function cleArticlePreset(foodId, nom) {
    return foodId ? "f:" + foodId : "n:" + (nom || "").toLowerCase();
}

// "Enregistrer" apparaît à partir de 5 articles, désactivé si la liste égale déjà le preset.
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
                alert(data.erreur);
                return;
            }

            // Reflète le preset côté client, sinon le bouton resterait activable pour rien.
            window.PRESET_HEBDO = Array.from(listeCourses.querySelectorAll(".course-item")).map(function (item) {
                return item.dataset.foodId
                    ? { food_id: item.dataset.foodId, nom_libre: null }
                    : { food_id: null, nom_libre: item.dataset.nom };
            });
            mettreAJourBoutonPresetHebdo();

            // Confirmation visuelle temporaire (icône "réussi").
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
// Sélection multiple (Fruits + Légumes combinables). "Tous" est exclusif visuellement : allumé
// seul quand tout est sélectionné, jamais avec les autres chips. Déclaré avant "MODE MAGASIN"
// car appliquerModeMagasin() peut appeler reinitialiserFiltreCategorieCourses() dès son 1er appel.
const courseFiltresMagasin = document.getElementById("courseFiltresMagasin");
let categoriesFiltreActives = new Set();

function boutonsCategorieCourses() {
    return Array.from(courseFiltresMagasin.querySelectorAll('.filter-btn:not([data-categorie="tous"])'));
}

// Un article d'un rayon apparu après le chargement n'a pas de chip : sans ce garde-fou il serait caché en permanence.
function categorieEstConnue(categorie) {
    return boutonsCategorieCourses().some(function (b) {
        return b.dataset.categorie === categorie;
    });
}

// "Tous" seul si tout est sélectionné, sinon seuls les rayons réellement choisis.
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

// Remet tout à "sélectionné" (rien de filtré) en quittant le mode magasin.
function reinitialiserFiltreCategorieCourses() {
    if (!courseFiltresMagasin) return;
    categoriesFiltreActives = new Set(boutonsCategorieCourses().map((b) => b.dataset.categorie));
    metAJourBoutonsFiltreCourses();
    document.querySelectorAll("#listeCourses .course-item").forEach(function (item) {
        item.classList.remove("hidden");
    });
}

// Applique le filtre actuel à un article ajouté après coup.
function appliquerFiltreCategorieItem(item) {
    if (!courseFiltresMagasin) return;
    if (!categorieEstConnue(item.dataset.categorie)) return; // rayon apparu après coup : jamais filtré
    item.classList.toggle("hidden", !categoriesFiltreActives.has(item.dataset.categorie));
}

// Extrait à part pour être attaché aux chips serveur ET à celles créées en direct.
function activerBoutonFiltreCourses(bouton) {
    bouton.addEventListener("click", function () {
        const categorie = this.dataset.categorie;

        const toutEtaitCoche = categoriesFiltreActives.size === boutonsCategorieCourses().length;

        if (categorie === "tous") {
            // Interrupteur : tout désélectionner si déjà tout coché, sinon tout cocher.
            categoriesFiltreActives = toutEtaitCoche ? new Set() : new Set(boutonsCategorieCourses().map((b) => b.dataset.categorie));
        } else if (toutEtaitCoche) {
            // Repart d'une sélection unique : cliquer un rayon depuis "Tous" = "je choisis CE rayon", pas "je retire celui-ci".
            categoriesFiltreActives = new Set([categorie]);
        } else if (categoriesFiltreActives.has(categorie)) {
            categoriesFiltreActives.delete(categorie);
        } else {
            categoriesFiltreActives.add(categorie);
        }

        metAJourBoutonsFiltreCourses();
        appliquerFiltreCategorieCourses();
    });
}

// Ajoute/retire des chips selon les rayons réellement présents, après chaque achat/suppression/ajout.
function synchroniserChipsFiltreCourses() {
    if (!courseFiltresMagasin) return;

    const categoriesPresentes = new Set(
        Array.from(listeCourses.querySelectorAll(".course-item")).map(function (item) {
            return item.dataset.categorie;
        })
    );

    // Un rayon vidé n'a plus lieu de proposer un filtre vide.
    boutonsCategorieCourses().forEach(function (bouton) {
        if (categoriesPresentes.has(bouton.dataset.categorie)) return;
        categoriesFiltreActives.delete(bouton.dataset.categorie);
        bouton.remove();
    });

    // Nouveau rayon sans chip : coché tout de suite, sinon son article disparaîtrait sans raison apparente.
    const categoriesConnues = new Set(boutonsCategorieCourses().map((b) => b.dataset.categorie));
    categoriesPresentes.forEach(function (categorie) {
        if (categoriesConnues.has(categorie)) return;
        const bouton = document.createElement("button");
        bouton.type = "button";
        bouton.className = "filter-btn active";
        bouton.dataset.categorie = categorie;
        bouton.textContent = categorie === "zzz" ? "Autres" : categorie;
        activerBoutonFiltreCourses(bouton);
        courseFiltresMagasin.appendChild(bouton);
        categoriesFiltreActives.add(categorie);
    });

    metAJourBoutonsFiltreCourses();
}

if (courseFiltresMagasin) {
    reinitialiserFiltreCategorieCourses(); // tout coché par défaut au chargement
    courseFiltresMagasin.querySelectorAll(".filter-btn").forEach(activerBoutonFiltreCourses);
}

// ============================================
// MODE MAGASIN
// ============================================

function appliquerModeMagasin(actif) {
    document.body.classList.toggle("mode-magasin", actif);
    toggleMagasin.classList.toggle("actif", actif);
    // Efface le filtre en quittant le mode magasin, sinon des articles resteraient invisibles sans repère visuel.
    if (!actif) reinitialiserFiltreCategorieCourses();
}

// Mémorisé en localStorage, restauré au chargement.
const modeMagasinSauvegarde = localStorage.getItem("modeMagasin") === "true";
appliquerModeMagasin(modeMagasinSauvegarde);

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

            // Le serveur ne renvoie que ce qui manquait déjà à la liste.
            if (data.items.length === 0) {
                alert("Tout est déjà dans la liste de courses.");
                return;
            }

            data.items.forEach(function (item) {
                const nouvelItem = construireItemDOM(item);
                inserrerSelonTri(nouvelItem);
                activerItem(nouvelItem);
                ajouterAnimationEntree(nouvelItem);
            });
            mettreAJourBoutonPresetHebdo();
            synchroniserChipsFiltreCourses(); // une passe pour tout le lot
        })
        .catch(gererErreurReseau);
});

// ============================================
// COMMENTAIRES / NOTES
// ============================================

// Affiche le champ de note (et cache la note affichée). "ligne" contient champ + bouton photo.
function afficherInput(idCourse) {
    const input = document.querySelector(`.input-commentaire[data-id="${idCourse}"]`);
    const ligne = input.closest(".ligne-commentaire");
    const note = document.querySelector(`.note-affichee[data-id="${idCourse}"]`);

    if (note && !note.classList.contains("hidden")) {
        note.classList.add("masquage");
        setTimeout(function () {
            note.classList.add("hidden");
            note.classList.remove("masquage");
        }, 150);
    }

    ligne.classList.remove("hidden");
    input.focus();
}

// Active "cliquer pour ajouter/modifier une note" sur un article donné.
function activerNote(item) {
    const emoji = item.querySelector(".course-nom-emoji");
    const input = item.querySelector(".input-commentaire");
    const ligne = input.closest(".ligne-commentaire");

    input.dataset.original = input.value.trim();

    // Seul l'émoji ouvre la note (pas tout le nom, trop facile à toucher par accident).
    emoji.addEventListener("click", function () {
        afficherInput(this.dataset.id);
    });

    function attacherNote(note) {
        note.addEventListener("click", function () {
            afficherInput(this.dataset.id);
        });
    }

    const noteExistante = item.querySelector(".note-affichee");
    if (noteExistante) {
        attacherNote(noteExistante);
    }

    input.addEventListener("blur", function () {
        const idCourse = this.dataset.id;
        const commentaire = this.value.trim();
        const original = this.dataset.original || "";
        let note = item.querySelector(".note-affichee");

        ligne.classList.add("masquage-input");
        setTimeout(() => {
            ligne.classList.add("hidden");
            ligne.classList.remove("masquage-input");
        }, 150);
        // Rien n'a changé : on annule.
        if (commentaire === original) {
            if (note) note.classList.remove("hidden");
            return;
        }

        // Champ vidé volontairement : suppression.
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

        // Texte nouveau ou modifié : sauvegarde.
        fetchAvecRetry("/courses/commentaire", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idCourse: idCourse, commentaire: commentaire })
        }).catch(gererErreurReseau);

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
const btnSupprimerPhoto = document.getElementById("btnSupprimerPhoto");

// Article concerné par le sélecteur de fichier / l'aperçu ouverts (un seul à la fois).
let idCoursePhotoActuelle = null;

// Redimensionne + recompresse en JPEG côté client avant l'envoi (~300-800Ko à 1600px/qualité 0.9).
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
                resolve(dataUrl.split(",")[1]); // base64 seul, sans le préfixe data:
            };
            image.onerror = reject;
            image.src = lecteur.result;
        };
        lecteur.onerror = reject;
        lecteur.readAsDataURL(fichier);
    });
}

// Le même bouton (vrai noeud DOM déplacé, pas cloné) vit dans .ligne-commentaire sans photo, ou en haut à droite de la carte avec photo.
function placerBoutonPhotoEnHaut(item, bouton) {
    item.appendChild(bouton);
}

function placerBoutonPhotoDansNote(item, bouton) {
    const ligne = item.querySelector(".ligne-commentaire");
    ligne.appendChild(bouton);
}

// "data-a-photo" (posé côté serveur, mis à jour en JS) décide de l'action du bouton.
function activerPhoto(item) {
    const bouton = item.querySelector(".btn-photo-course");

    if (bouton.dataset.aPhoto === "true") {
        placerBoutonPhotoEnHaut(item, bouton);
    }

    bouton.addEventListener("click", function () {
        // Petit rebond à chaque tap, retour visuel immédiat.
        this.classList.remove("photo-pop");
        void this.offsetWidth;
        this.classList.add("photo-pop");

        idCoursePhotoActuelle = this.dataset.id;
        if (this.dataset.aPhoto === "true") {
            ouvrirApercuPhoto(idCoursePhotoActuelle);
        } else {
            inputPhotoCourse.value = ""; // sinon rechoisir le même fichier ne redéclenche pas "change"
            inputPhotoCourse.click();
        }
    });
}

// Cache local (localStorage) : voir/ajouter une photo doit marcher sans réseau au magasin.
function clePhotoLocale(idCourse) {
    return "chow-photo-course-" + idCourse;
}

function sauvegarderPhotoLocale(idCourse, base64) {
    try {
        localStorage.setItem(clePhotoLocale(idCourse), base64);
    } catch (err) {
        // Quota dépassé ou stockage désactivé : tant pis, reste consultable en ligne.
        console.warn("Impossible de garder la photo en cache locale :", err);
    }
}

function lirePhotoLocale(idCourse) {
    return localStorage.getItem(clePhotoLocale(idCourse));
}

function supprimerPhotoLocale(idCourse) {
    localStorage.removeItem(clePhotoLocale(idCourse));
}

// Un seul input file partagé entre toutes les cartes.
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
                alert(data.erreur);
                return;
            }
            const bouton = document.querySelector(`.btn-photo-course[data-id="${idCourse}"]`);
            if (bouton) {
                const item = bouton.closest(".course-item");
                bouton.dataset.aPhoto = "true";
                if (item) placerBoutonPhotoEnHaut(item, bouton); // no-op si déjà en haut
                bouton.classList.remove("photo-pop");
                void bouton.offsetWidth; // force le navigateur à rejouer l'animation
                bouton.classList.add("photo-pop");
            }
            sauvegarderPhotoLocale(idCourse, base64Compressee);
        })
        .catch(gererErreurReseau);
});

// Le cache local est toujours tenté en premier (pour marcher sans réseau au magasin).
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

// Ferme en animant la photo vers le bouton oeil (distance calculée, jouée via keyframe CSS).
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
                alert(data.erreur);
                return;
            }
            // Fermer AVANT de déplacer le bouton : l'anim "vers l'oeil" a besoin de sa position actuelle.
            fermerApercuPhoto();
            supprimerPhotoLocale(idCourse);

            const bouton = document.querySelector(`.btn-photo-course[data-id="${idCourse}"]`);
            if (bouton) {
                const item = bouton.closest(".course-item");
                // Laisse l'anim d'arrivée finir avant que l'oeil se ferme et se replace en note.
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

// Met en cache local toute photo pas encore vue sur cet appareil. Échoue en silence si hors ligne.
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
                // Retenté au prochain chargement de page.
            });
    });
}

// ============================================
// FORMULAIRES QUANTITÉ (suggestions 1/2/5)
// ============================================

// Boutons de suggestion rapide de quantité (+1/+2/+5).
function activerQuantite(item) {
    const form = item.querySelector(".form-quantite");
    if (!form) return; // pas de formulaire de quantité pour un article suivi en "cl"

    const champ = form.querySelector(".champ-quantite-achat");
    const btnEnregistrer = form.querySelector(".btn-enregistrer-achat");
    const suggestions = form.querySelectorAll(".suggestion");

    // Une suggestion remplit le champ et soumet directement, sans repasser par "Acheté".
    suggestions.forEach(function (bouton) {
        bouton.addEventListener("click", function () {
            champ.value = this.dataset.valeur;
            // .value seul ne déclenche pas "input" : sans ça "Acheté" resterait désactivé.
            champ.dispatchEvent(new Event("input"));
            form.requestSubmit();
        });
    });

    // "Acheté" ne devient cliquable qu'avec une quantité valide (>= 1).
    champ.addEventListener("input", function () {
        const etaitDesactive = btnEnregistrer.disabled;
        btnEnregistrer.disabled = champ.value.trim() === "" || Number(champ.value) < 1;

        // Petit "pop" au moment précis où il s'active, seul signal du changement.
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

// Intercepte la soumission d'un formulaire pour l'envoyer en fetch() au lieu de recharger la page.
function envoyerFormulaireAjax(form, callback) {
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        // Désactivé pendant l'envoi : empêche un double-tap d'envoyer 2 requêtes.
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
                    alert(data.erreur);
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
        // Un rayon vidé par cet achat/suppression ne doit plus avoir de chip de filtre (voir
        // synchroniserChipsFiltreCourses) : appelé APRÈS item.remove() pour que ce rayon ne
        // compte plus parmi les catégories encore présentes dans la liste.
        synchroniserChipsFiltreCourses();
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

    // Zones à comportement propre (note, suppression, "+1/+2/+5") : ne réarment/ne redésarment
    // jamais la carte cliquée elle-même, mais désarment quand même une AUTRE carte qui serait
    // restée armée (ex: on ouvre la note d'une carte pendant qu'une autre est armée).
    // ".course-item__shop-slot" (le bouton "Acheté") N'EST PLUS exclu ici : tant que la carte
    // n'est pas armée, ce bouton est inerte (pointer-events:none, voir style.css) — l'exclure
    // du geste d'armement faisait qu'un tap dessus ne faisait RIEN DU TOUT (ni armer, ni
    // acheter), au lieu d'armer la carte comme un tap sur n'importe quelle autre zone neutre.
    if (e.target.closest(".course-nom-emoji, .input-commentaire, .note-affichee, .form-supprimer, .course-item__quantite-groupe, .btn-photo-course")) {
        if (carte !== itemArmeActuellement) desarmerCarteActuelle();
        return;
    }

    if (carte === itemArmeActuellement) {
        desarmerCarteActuelle();
    } else {
        desarmerCarteActuelle();
        carte.classList.add("arme");
        itemArmeActuellement = carte;

        // Même "pop" que le panier quand la quantité devient valide.
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

document.querySelectorAll(".course-item").forEach(activerItem);
synchroniserPhotosLocales();

// ============================================
// CONSTRUCTION D'UN NOUVEL ITEM (ajout sans rechargement)
// ============================================

// Construit le HTML d'un nouvel article à partir des données du serveur.
function construireItemDOM(item) {
    const div = document.createElement("div");
    const id = escapeHtml(item.id);
    const emoji = escapeHtml(item.emoji);
    const nom = escapeHtml(item.nom);

    div.className = "course-item carte-article";
    div.dataset.nom = item.nom.toLowerCase();
    div.dataset.categorie = item.categorie || "zzz"; // "zzz" trié en dernier
    div.dataset.foodId = item.food_id || "";

    let formAchat;
    if (item.food_id && item.tracking_type === "cl") {
        formAchat = `
      <form action="/courses/acheter" method="post" class="form-acheter">
        <input type="hidden" name="idCourse" value="${id}" />
        <div class="course-item__shop-slot">
          <button type="submit" class="btn-icone-rond btn-acheter-icone">Acheté</button>
        </div>
      </form>`;
    } else if (item.food_id) {
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
        formAchat = `
      <form action="/courses/acheter" method="post" class="form-acheter">
        <input type="hidden" name="idCourse" value="${id}" />
        <div class="course-item__shop-slot">
          <button type="submit" class="btn-icone-rond btn-acheter-icone">Acheté</button>
        </div>
      </form>`;
    }

    // Pastille "déjà en stock" : un nombre, ou un point de couleur pour les "cl".
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

listeAlimentsCourses.hidden = true;
const itemsAutocomplete = listeAlimentsCourses.querySelectorAll("li");

rechercheAlimentCourses.addEventListener("input", function () {
    idAlimentCacheCourses.value = "";

    const recherche = normaliserTexte(this.value.toLowerCase());

    if (recherche === "") {
        listeAlimentsCourses.hidden = true;
        btnAjouterCourse.classList.add("hidden");
        rechercheAlimentCourses.classList.remove("recherche-invalide");
        return;
    }

    listeAlimentsCourses.hidden = false;

    let aUneCorrespondance = false;
    itemsAutocomplete.forEach(function (item) {
        const correspond = normaliserTexte(item.textContent.toLowerCase()).includes(recherche);
        item.hidden = !correspond;
        if (correspond) aUneCorrespondance = true;
    });

    // "Ajouter" (texte libre) n'apparaît que si aucun aliment connu ne correspond.
    btnAjouterCourse.classList.toggle("hidden", aUneCorrespondance);
    rechercheAlimentCourses.classList.toggle("recherche-invalide", !aUneCorrespondance);
});

function trouverCourseItemParFoodId(foodId) {
    return Array.from(listeCourses.querySelectorAll(".course-item")).find(function (item) {
        return item.dataset.foodId === foodId;
    });
}

// Scroll + surbrillance vers un article déjà présent, au lieu d'un doublon.
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
            afficherToast("Déjà dans la liste de courses.");
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

// Entrée ajoute en texte libre si rien n'a été choisi dans les suggestions.
rechercheAlimentCourses.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    tenterAjoutArticle();
});

btnAjouterCourse.addEventListener("click", function () {
    tenterAjoutArticle();
});

function tenterAjoutArticle() {
    const idAliment = idAlimentCacheCourses.value || null;
    const texte = rechercheAlimentCourses.value.trim();

    if (!idAliment && texte === "") return;

    ajouterArticle(idAliment, idAliment ? null : texte);
}

// Verrou anti double-tap : sans lui, un 2e tap avant la réponse du 1er créait une vraie 2e ligne en base.
let ajoutArticleEnCours = false;

function ajouterArticle(idAliment, texteLibre) {
    if (ajoutArticleEnCours) return;
    ajoutArticleEnCours = true;

    fetchAvecRetry("/courses/ajouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idAliment: idAliment, rechercheAliment: texteLibre })
    })
        .then(function (data) {
            if (data.erreur) {
                alert(data.erreur);
                return;
            }

            const nouvelItem = construireItemDOM(data.item);
            inserrerSelonTri(nouvelItem);
            activerItem(nouvelItem);
            ajouterAnimationEntree(nouvelItem);
            mettreAJourBoutonPresetHebdo();
            synchroniserChipsFiltreCourses(); // nouvelle chip si ce rayon n'en avait pas encore
            fermerPanneauAjoutCourse();
        })
        .catch(gererErreurReseau)
        .finally(function () {
            ajoutArticleEnCours = false;
        });
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
