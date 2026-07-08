const listeCourses = document.getElementById("listeCourses");
const triAlpha = document.getElementById("triAlpha");
const triCategorie = document.getElementById("triCategorie");
const toggleMagasin = document.getElementById("toggleMagasin");

const rechercheAlimentCourses = document.getElementById("rechercheAlimentCourses");
const listeAlimentsCourses = document.getElementById("listeAlimentsCourses");
const idAlimentCacheCourses = document.getElementById("idAlimentCacheCourses");
const formAjouterCourse = document.getElementById("formAjouterCourse");

// ============================================
// TRI
// ============================================

function trierPar(cle) {
    const items = Array.from(listeCourses.querySelectorAll(".course-item"));
    items.sort(function (a, b) {
        return a.dataset[cle].localeCompare(b.dataset[cle]);
    });
    items.forEach(function (item) {
        listeCourses.appendChild(item);
    });
}

function cleTriActive() {
    return triCategorie.classList.contains("tri-actif") ? "categorie" : "nom";
}

triAlpha.addEventListener("click", function () {
    trierPar("nom");
    triAlpha.classList.add("tri-actif");
    triCategorie.classList.remove("tri-actif");
});

triCategorie.addEventListener("click", function () {
    trierPar("categorie");
    triCategorie.classList.add("tri-actif");
    triAlpha.classList.remove("tri-actif");
});

function inserrerSelonTri(nouvelItem) {
    const cle = cleTriActive();
    const items = Array.from(listeCourses.querySelectorAll(".course-item"));
    const cible = items.find(function (item) {
        return item.dataset[cle].localeCompare(nouvelItem.dataset[cle]) > 0;
    });

    if (cible) {
        listeCourses.insertBefore(nouvelItem, cible);
    } else {
        listeCourses.appendChild(nouvelItem);
    }
}

// ============================================
// MODE MAGASIN
// ============================================

function appliquerModeMagasin(actif) {
    document.body.classList.toggle("mode-magasin", actif);
    toggleMagasin.classList.toggle("actif", actif);
}

const modeMagasinSauvegarde = localStorage.getItem("modeMagasin") === "true";
appliquerModeMagasin(modeMagasinSauvegarde);

toggleMagasin.addEventListener("click", function () {
    const nouvelEtat = !document.body.classList.contains("mode-magasin");
    appliquerModeMagasin(nouvelEtat);
    localStorage.setItem("modeMagasin", nouvelEtat);
});

// ============================================
// COMMENTAIRES / NOTES
// ============================================

function afficherInput(idCourse) {
    const input = document.querySelector(`.input-commentaire[data-id="${idCourse}"]`);
    const note = document.querySelector(`.note-affichee[data-id="${idCourse}"]`);

    if (note && !note.classList.contains("hidden")) {
        note.classList.add("masquage");
        setTimeout(function () {
            note.classList.add("hidden");
            note.classList.remove("masquage");
        }, 150);
    }

    input.classList.remove("hidden");
    input.focus();
}

function activerNote(item) {
    const nom = item.querySelector(".course-nom");
    const input = item.querySelector(".input-commentaire");

    // On mémorise la valeur d'origine (celle rendue par le serveur)
    input.dataset.original = input.value.trim();

    nom.addEventListener("click", function () {
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

        // Texte nouveau ou modifié → sauvegarde
        fetch("/courses/commentaire", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idCourse: idCourse, commentaire: commentaire })
        });

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

function activerQuantite(item) {
    const form = item.querySelector(".form-quantite");
    if (!form) return;

    const champ = form.querySelector(".champ-quantite-achat");
    const btnEnregistrer = form.querySelector(".btn-enregistrer-achat");
    const suggestions = form.querySelectorAll(".suggestion");

    suggestions.forEach(function (bouton) {
        bouton.addEventListener("click", function () {
            champ.value = this.dataset.valeur;
            btnEnregistrer.disabled = false;
        });
    });

    champ.addEventListener("input", function () {
        btnEnregistrer.disabled = champ.value.trim() === "" || Number(champ.value) < 1;
    });
}

// ============================================
// ENVOI AJAX (acheter / supprimer) + ANIMATIONS DE SORTIE
// ============================================

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

function retirerItem(form, classeAnim) {
    const item = form.closest(".course-item");
    if (!item) return;

    item.classList.add(classeAnim);
    setTimeout(function () {
        item.remove();
    }, 300);
}

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

function activerItem(item) {
    activerNote(item);
    activerQuantite(item);
    activerActions(item);
}

document.querySelectorAll(".course-item").forEach(activerItem);

// ============================================
// CONSTRUCTION D'UN NOUVEL ITEM (ajout sans rechargement)
// ============================================

function construireItemDOM(item) {
    const div = document.createElement("div");
    div.className = "course-item carte-article";
    div.dataset.nom = item.nom.toLowerCase();
    div.dataset.categorie = item.categorie || "zzz";

    let formAchat;
    if (item.food_id && item.tracking_type === "cl") {
        formAchat = `
      <form action="/courses/acheter" method="post" class="form-acheter">
        <input type="hidden" name="idCourse" value="${item.id}" />
        <div class="course-item__shop-slot">
          <button type="submit" class="btn-icone-rond btn-acheter-icone">Acheté</button>
        </div>
      </form>`;
    } else if (item.food_id) {
        formAchat = `
      <form action="/courses/acheter" method="post" class="form-acheter form-quantite">
        <input type="hidden" name="idCourse" value="${item.id}" />
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
        formAchat = `
      <form action="/courses/acheter" method="post" class="form-acheter">
        <input type="hidden" name="idCourse" value="${item.id}" />
        <div class="course-item__shop-slot">
          <button type="submit" class="btn-icone-rond btn-acheter-icone">Acheté</button>
        </div>
      </form>`;
    }

    div.innerHTML = `
    <span class="course-nom" data-id="${item.id}">${item.emoji} ${item.nom}</span>
    <form action="/courses/supprimer" method="post" class="form-supprimer">
      <input type="hidden" name="idCourse" value="${item.id}" />
      <button type="submit" class="btn-supprimer-icone btn-supprimer-dash">Supprimer</button>
    </form>
    <input type="text" class="input-commentaire hidden" placeholder="Ajouter une note" value="" data-id="${item.id}" />
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

    const recherche = this.value.toLowerCase();

    if (recherche === "") {
        listeAlimentsCourses.hidden = true;
        return;
    }

    let count = 0;
    listeAlimentsCourses.hidden = false;

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

itemsAutocomplete.forEach(function (item) {
    item.addEventListener("click", function () {
        ajouterArticle(item.dataset.id, null);
        listeAlimentsCourses.hidden = true;
    });
});

document.addEventListener("click", function (e) {
    if (!document.getElementById("autocompleteCourses").contains(e.target)) {
        listeAlimentsCourses.hidden = true;
    }
});

// Entrée dans le champ de recherche : ajoute en texte libre si rien n'a été sélectionné dans la liste
rechercheAlimentCourses.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;
    event.preventDefault();

    const idAliment = idAlimentCacheCourses.value || null;
    const texte = rechercheAlimentCourses.value.trim();

    if (!idAliment && texte === "") return;

    ajouterArticle(idAliment, idAliment ? null : texte);
});

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
            nouvelItem.classList.add("entree");

            rechercheAlimentCourses.value = "";
            idAlimentCacheCourses.value = "";
        });
}