// ============================================
// RÉCUPÉRATION DES ÉLÉMENTS HTML DE LA PAGE
// ============================================

const listeCourses = document.getElementById("listeCourses"); // conteneur de tous les articles de la liste de courses
const triAlpha = document.getElementById("triAlpha"); // bouton "trier par nom"
const triCategorie = document.getElementById("triCategorie"); // bouton "trier par catégorie"
const toggleMagasin = document.getElementById("toggleMagasin"); // bouton pour activer/désactiver le "mode magasin"

const rechercheAlimentCourses = document.getElementById("rechercheAlimentCourses"); // champ de recherche pour ajouter un article
const listeAlimentsCourses = document.getElementById("listeAlimentsCourses"); // liste de suggestions d'aliments
const idAlimentCacheCourses = document.getElementById("idAlimentCacheCourses"); // champ caché stockant l'id de l'aliment sélectionné
const formAjouterCourse = document.getElementById("formAjouterCourse"); // formulaire d'ajout d'un article

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
// TRI
// ============================================

// Trie tous les articles de la liste selon la clé demandée ("nom" ou "categorie"),
// puis les réinsère dans le bon ordre dans la page
function trierPar(cle) {
    const items = Array.from(listeCourses.querySelectorAll(".course-item"));
    items.sort(function (a, b) {
        return a.dataset[cle].localeCompare(b.dataset[cle]);
    });
    items.forEach(function (item) {
        listeCourses.appendChild(item);
    });
}

// Renvoie la clé de tri actuellement active, en regardant quel bouton de tri porte la classe "tri-actif"
function cleTriActive() {
    return triCategorie.classList.contains("tri-actif") ? "categorie" : "nom";
}

// Clic sur "trier par nom"
triAlpha.addEventListener("click", function () {
    trierPar("nom");
    triAlpha.classList.add("tri-actif");
    triCategorie.classList.remove("tri-actif");
});

// Clic sur "trier par catégorie"
triCategorie.addEventListener("click", function () {
    trierPar("categorie");
    triCategorie.classList.add("tri-actif");
    triAlpha.classList.remove("tri-actif");
});

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

    div.innerHTML = `
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
        return;
    }

    let count = 0;
    listeAlimentsCourses.hidden = false;

    // On affiche seulement les aliments correspondants, limité à 5 suggestions
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

// Cliquer sur une suggestion ajoute directement l'article à la liste de courses
itemsAutocomplete.forEach(function (item) {
    item.addEventListener("click", function () {
        ajouterArticle(item.dataset.id, null);
        listeAlimentsCourses.hidden = true;
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

    const idAliment = idAlimentCacheCourses.value || null;
    const texte = rechercheAlimentCourses.value.trim();

    if (!idAliment && texte === "") return;

    ajouterArticle(idAliment, idAliment ? null : texte);
});

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
        });
}
