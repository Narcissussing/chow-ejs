const rechercheAliment = document.getElementById("rechercheAliment");
const listeAliments = document.getElementById("listeAliments");
const idAlimentCache = document.getElementById("idAlimentCache");
const champQuantite = document.getElementById("champQuantite");
const champCL = document.getElementById("champCL");
const btnAjouter = document.getElementById("btnAjouter");
const items = listeAliments.querySelectorAll("li");

listeAliments.hidden = true;

rechercheAliment.addEventListener("input", function() {
  idAlimentCache.value = "";
  btnAjouter.disabled = true;

  champQuantite.disabled = true;
  champQuantite.value = "";

  champCL.disabled = true;
  champCL.selectedIndex = 0;

  const recherche = this.value.toLowerCase();

  if (recherche === "") {
    listeAliments.hidden = true;
    return;
  }

  let count = 0;
  listeAliments.hidden = false;

  items.forEach(function(item) {
    const match = item.textContent.toLowerCase().includes(recherche);

    if (match && count < 3) {
      item.hidden = false;
      count++;
    } else {
      item.hidden = true;
    }
  });
});

items.forEach(function(item) {
  item.addEventListener("click", function() {
    const type = this.dataset.type;
    idAlimentCache.value = this.dataset.id;
    rechercheAliment.value = this.textContent.trim();
    listeAliments.hidden = true;

    if (type === "cl") {
      champCL.disabled = false;
      champQuantite.disabled = true;
      champQuantite.value = "";
    } else {
      champQuantite.disabled = false;
      champCL.disabled = true;
    }
  });
});

champQuantite.addEventListener("input", function() {
  btnAjouter.disabled = this.value.trim() === "";
});

champCL.addEventListener("change", function() {
  btnAjouter.disabled = this.value === "";
});

document.addEventListener("click", function(e) {
  if (!document.getElementById("autocomplete").contains(e.target)) {
    listeAliments.hidden = true;
  }
});

document.querySelectorAll(".form-modif").forEach(function(form) {
  const champ = form.querySelector(".champ-modif");
  const btnEditer = form.querySelector(".btn-editer");
  const btnSauvegarder = form.querySelector(".btn-sauvegarder");

  btnEditer.addEventListener("click", function() {
    document.querySelectorAll(".form-modif").forEach(function(autreForm) {
      const autreChamp = autreForm.querySelector(".champ-modif");
      const autreBtnEditer = autreForm.querySelector(".btn-editer");
      const autreBtnSauvegarder = autreForm.querySelector(".btn-sauvegarder");

      autreChamp.disabled = true;
      autreChamp.value = autreChamp.dataset.initial;
      autreBtnEditer.hidden = false;
      autreBtnSauvegarder.hidden = true;
      autreBtnSauvegarder.disabled = true;
    });

    champ.disabled = false;
    champ.focus();
    btnEditer.hidden = true;
    btxnSauvegarder.hidden = false;
  });

  champ.addEventListener("input", function() {
    const valeur = champ.value;
    const initial = champ.dataset.initial;
    const estValide = champ.tagName === "SELECT" ? valeur !== "" : valeur !== "" && Number(valeur) >= 0;

    btnSauvegarder.disabled = !(valeur !== initial && estValide);
  });

  champ.addEventListener("change", function() {
    champ.dispatchEvent(new Event("input"));
  });
});