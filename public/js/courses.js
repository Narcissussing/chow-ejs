// ============================================
// RÉCUPÉRATION DES ÉLÉMENTS HTML DE LA PAGE
// ============================================

const listeCourses = document.getElementById("listeCourses"); // conteneur de tous les articles de la liste de courses
const sortSelectCourses = document.getElementById("sortSelectCourses"); // menu de tri (Nom/Catégorie), même select que sur Aliments/Stock
const toggleMagasin = document.getElementById("toggleMagasin"); // bouton pour activer/désactiver le "mode magasin"
const btnPresetHebdo = document.getElementById("btnPresetHebdo"); // bouton "Courses de la semaine" (ajout groupé)

const rechercheAlimentCourses = document.getElementById("rechercheAlimentCourses"); // champ de recherche pour ajouter un article
const listeAlimentsCourses = document.getElementById("listeAlimentsCourses"); // liste de suggestions d'aliments
const idAlimentCacheCourses = document.getElementById("idAlimentCacheCourses"); // champ caché stockant l'id de l'aliment sélectionné
const formAjouterCourse = document.getElementById("formAjouterCourse"); // formulaire d'ajout d'un article
const btnAjouterCourse = document.getElementById("btnAjouterCourse"); // bouton "+" (même ajout que la touche Entrée)
const btnToggleAjoutCourse = document.getElementById("btnToggleAjoutCourse"); // bouton "+" en haut de page qui ouvre/ferme le panneau
const panneauAjoutCourse = document.getElementById("panneauAjoutCourse"); // le panneau (formulaire) d'ajout lui-même

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
// PANNEAU D'AJOUT (repliable)
// ============================================
// Même comportement que le panneau d'ajout de Stock : le "+" ouvre/ferme un panneau juste en
// dessous de lui (au lieu du formulaire fixe tout en bas de page qu'il y avait avant), avec la
// même animation d'accordéon (voir .panneau-ajout dans style.css).

btnToggleAjoutCourse.addEventListener("click", function () {
    const estOuvert = panneauAjoutCourse.classList.toggle("ouvert");
    // Le "+" reste rouge (plein) tant que le panneau est ouvert, pour indiquer qu'on est
    // en train d'ajouter, puis redevient un simple contour dès qu'on le referme
    btnToggleAjoutCourse.classList.toggle("actif", estOuvert);
    if (!estOuvert) {
        panneauAjoutCourse.classList.remove("pret");
        // On efface la recherche en fermant : rouvrir le panneau plus tard ne doit pas retrouver
        // un vieux texte tapé (et le bouton "Ajouter" qu'il avait éventuellement fait apparaître)
        rechercheAlimentCourses.value = "";
        idAlimentCacheCourses.value = "";
        listeAlimentsCourses.hidden = true;
        btnAjouterCourse.classList.add("hidden");
    } else {
        // Le curseur se place directement dans le champ, pour pouvoir taper tout de suite
        rechercheAlimentCourses.focus();
    }
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
        // Aucun article ne vient après : on l'ajoute à la fin
        listeCourses.appendChild(nouvelItem);
    }
}

// ============================================
// MODE MAGASIN
// ============================================

// Le "mode magasin" change l'affichage de la page (probablement en simplifiant l'interface)
// pour une utilisation pratique pendant qu'on fait ses courses au magasin
function appliquerModeMagasin(actif) {
    document.body.classList.toggle("mode-magasin", actif);
    toggleMagasin.classList.toggle("actif", actif);
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
    fetch("/courses/preset-hebdo", {
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
                nouvelItem.classList.add("entree");
            });
        });
});

// ============================================
// COMMENTAIRES / NOTES
// ============================================

// Affiche le champ de saisie de commentaire pour un article donné (et cache la note affichée à la place)
function afficherInput(idCourse) {
    const input = document.querySelector(`.input-commentaire[data-id="${idCourse}"]`);
    const note = document.querySelector(`.note-affichee[data-id="${idCourse}"]`);

    if (note && !note.classList.contains("hidden")) {
        // Petite animation de disparition avant de cacher réellement la note
        note.classList.add("masquage");
        setTimeout(function () {
            note.classList.add("hidden");
            note.classList.remove("masquage");
        }, 150);
    }

    input.classList.remove("hidden");
    input.focus();
}

// Active le comportement "cliquer pour ajouter/modifier une note" sur un article donné
function activerNote(item) {
    const nom = item.querySelector(".course-nom");
    const input = item.querySelector(".input-commentaire");

    // On mémorise la valeur d'origine (celle rendue par le serveur au chargement de la page)
    input.dataset.original = input.value.trim();

    // Cliquer sur le nom de l'article ouvre le champ de saisie de commentaire
    nom.addEventListener("click", function () {
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

        // Petite animation de disparition du champ de saisie
        this.classList.add("masquage-input");
        setTimeout(() => {
            this.classList.add("hidden");
            this.classList.remove("masquage-input");
        }, 150);
        // Rien n'a changé → on annule, on réaffiche la note telle quelle
        if (commentaire === original) {
            if (note) note.classList.remove("hidden");
            return;
        }

        // Champ vidé volontairement (il y avait un texte avant) → suppression
        if (commentaire === "") {
            fetch("/courses/commentaire", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idCourse: idCourse, commentaire: "" })
            });

            if (note) {
                note.remove();
            }
            this.dataset.original = "";
            return;
        }

        // Texte nouveau ou modifié → sauvegarde côté serveur
        fetch("/courses/commentaire", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idCourse: idCourse, commentaire: commentaire })
        });

        // Si aucune note n'existait encore à l'écran, on en crée une nouvelle
        if (!note) {
            note = document.createElement("p");
            note.className = "note-affichee";
            note.dataset.id = idCourse;
            note.addEventListener("click", function () {
                afficherInput(this.dataset.id);
            });
            this.insertAdjacentElement("beforebegin", note);
        }

        note.textContent = `📝 ${commentaire}`;
        note.classList.remove("hidden");
        this.dataset.original = commentaire;
    });
}

// ============================================
// FORMULAIRES QUANTITÉ (suggestions 1/2/5)
// ============================================

// Active les boutons de suggestion rapide de quantité (1, 2, 5) pour un article donné
function activerQuantite(item) {
    const form = item.querySelector(".form-quantite");
    if (!form) return; // certains articles (ex: suivis en "cl") n'ont pas ce formulaire de quantité

    const champ = form.querySelector(".champ-quantite-achat");
    const btnEnregistrer = form.querySelector(".btn-enregistrer-achat");
    const suggestions = form.querySelectorAll(".suggestion");

    // Cliquer sur une suggestion (1/2/5) remplit directement le champ quantité
    suggestions.forEach(function (bouton) {
        bouton.addEventListener("click", function () {
            champ.value = this.dataset.valeur;
            btnEnregistrer.disabled = false;
        });
    });

    // Le bouton "Acheté" ne devient cliquable que si une quantité valide (>= 1) a été saisie
    champ.addEventListener("input", function () {
        btnEnregistrer.disabled = champ.value.trim() === "" || Number(champ.value) < 1;
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

        const donnees = new FormData(form);
        const objet = {};
        donnees.forEach(function (valeur, cle) {
            objet[cle] = valeur;
        });

        fetch(form.action, {
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
                callback(form);
            });
    });
}

// Retire visuellement un article de la liste (avec une petite animation avant suppression réelle)
function retirerItem(form, classeAnim) {
    const item = form.closest(".course-item");
    if (!item) return;

    item.classList.add(classeAnim);
    setTimeout(function () {
        item.remove();
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
    activerQuantite(item);
    activerActions(item);
}

// Au chargement de la page, on active tous les articles déjà présents dans le HTML
document.querySelectorAll(".course-item").forEach(activerItem);

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

    // Le formulaire "Acheté" est différent selon le type de l'article :
    let formAchat;
    if (item.food_id && item.tracking_type === "cl") {
        // Aliment suivi en "cl" (ex: bouteille) : un simple bouton "Acheté" (remet le niveau à plein)
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
            <button type="button" class="suggestion" data-valeur="1">1</button>
            <button type="button" class="suggestion" data-valeur="2">2</button>
            <button type="button" class="suggestion" data-valeur="5">5</button>
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
    <span class="course-nom" data-id="${id}">${emoji} ${nom}</span>
    <form action="/courses/supprimer" method="post" class="form-supprimer">
      <input type="hidden" name="idCourse" value="${id}" />
      <button type="submit" class="btn-supprimer-icone btn-supprimer-dash">Supprimer</button>
    </form>
    <input type="text" class="input-commentaire hidden" placeholder="Ajouter une note" value="" data-id="${id}" />
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

    const recherche = this.value.toLowerCase();

    if (recherche === "") {
        listeAlimentsCourses.hidden = true;
        // Rien de tapé : ni suggestion ni ajout en texte libre n'ont de sens
        btnAjouterCourse.classList.add("hidden");
        return;
    }

    listeAlimentsCourses.hidden = false;

    // On affiche tous les aliments correspondants. Aucune limite de nombre :
    // si la liste est longue, elle défile (voir max-height dans style.css)
    let aUneCorrespondance = false;
    itemsAutocomplete.forEach(function (item) {
        const correspond = item.textContent.toLowerCase().includes(recherche);
        item.hidden = !correspond;
        if (correspond) aUneCorrespondance = true;
    });

    // Le bouton "Ajouter" (texte libre) n'apparaît que si aucun aliment connu ne correspond :
    // s'il y a des suggestions, on veut qu'on clique dessus plutôt que de dupliquer l'article
    btnAjouterCourse.classList.toggle("hidden", aUneCorrespondance);
});

// Cliquer sur une suggestion ajoute directement l'article à la liste de courses
itemsAutocomplete.forEach(function (item) {
    item.addEventListener("click", function () {
        ajouterArticle(item.dataset.id, null);
        listeAlimentsCourses.hidden = true;
        btnAjouterCourse.classList.add("hidden");
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
    fetch("/courses/ajouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idAliment: idAliment, rechercheAliment: texteLibre })
    })
        .then(function (response) { return response.json(); })
        .then(function (data) {
            if (data.erreur) {
                alert(data.erreur);
                return;
            }

            const nouvelItem = construireItemDOM(data.item);
            inserrerSelonTri(nouvelItem);
            activerItem(nouvelItem);
            nouvelItem.classList.add("entree"); // petite animation d'apparition

            rechercheAlimentCourses.value = "";
            idAlimentCacheCourses.value = "";
            btnAjouterCourse.classList.add("hidden");

            // On referme le panneau d'ajout automatiquement après un ajout réussi, comme sur Stock
            panneauAjoutCourse.classList.remove("ouvert");
            panneauAjoutCourse.classList.remove("pret");
            btnToggleAjoutCourse.classList.remove("actif");
        });
}
