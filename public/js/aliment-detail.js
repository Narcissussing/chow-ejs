// ============================================
// ÉQUIVALENCES (poids d'une c. à café / c. à soupe pour CET aliment)
// ============================================
// Auto-sauvegarde au blur, comme la quantité éditable du Journal/Stock : pas de bouton
// "Enregistrer" séparé à chercher, on quitte juste le champ.

const zoneEquivalences = document.querySelector(".detail-equivalences");
const champCafe = document.getElementById("equivGrammesCafe");
const champSoupe = document.getElementById("equivGrammesSoupe");
const statutEquivalences = document.getElementById("equivStatut");

function enregistrerEquivalences() {
    const idAliment = zoneEquivalences.dataset.id;

    fetch(`/aliments/${idAliment}/equivalences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            grammesCafe: champCafe.value,
            grammesSoupe: champSoupe.value
        })
    })
        .then(function (response) { return response.json(); })
        .then(function (data) {
            if (data.erreur) {
                alert(data.erreur);
                return;
            }
            // Petit "Enregistré ✓" qui s'efface tout seul, juste pour confirmer que ça a été pris en compte
            statutEquivalences.classList.remove("hidden");
            clearTimeout(statutEquivalences.dataset.timeoutId);
            const timeoutId = setTimeout(function () {
                statutEquivalences.classList.add("hidden");
            }, 2000);
            statutEquivalences.dataset.timeoutId = timeoutId;
        });
}

champCafe.addEventListener("change", enregistrerEquivalences);
champSoupe.addEventListener("change", enregistrerEquivalences);
