// Ce fichier transforme les <select> HTML classiques (moches et difficiles à styliser)
// en menus déroulants "faits maison" avec du HTML/CSS personnalisé, tout en gardant
// le <select> d'origine caché derrière (pour que le formulaire fonctionne normalement).

// Transforme un <select> donné en menu déroulant personnalisé, s'il ne l'a pas déjà été
function enhanceSelect(select) {
  // Si ce select a déjà été transformé, on ne le refait pas une deuxième fois
  if (select.dataset.customSelectReady === "true") return;

  select.dataset.customSelectReady = "true";
  // On cache visuellement le vrai <select> (mais il reste dans le formulaire, donc toujours fonctionnel)
  select.classList.add("custom-select-native");

  // On crée le conteneur principal du menu personnalisé
  const wrapper = document.createElement("div");
  wrapper.className = "custom-select";

  // Le bouton visible qui affiche l'option actuellement choisie, et qu'on peut cliquer pour ouvrir la liste
  const button = document.createElement("button");
  button.type = "button";
  button.className = "custom-select__button";
  button.setAttribute("aria-haspopup", "listbox"); // pour l'accessibilité (lecteurs d'écran)
  button.setAttribute("aria-expanded", "false");

  // Le texte affiché dans le bouton (le nom de l'option sélectionnée)
  const label = document.createElement("span");
  label.className = "custom-select__label";

  // La liste déroulante des options, cachée par défaut
  const list = document.createElement("ul");
  list.className = "custom-select__list";
  list.setAttribute("role", "listbox");
  list.hidden = true;

  button.appendChild(label);
  wrapper.appendChild(button);
  wrapper.appendChild(list);
  // On place notre menu personnalisé juste après le <select> d'origine dans la page
  select.insertAdjacentElement("afterend", wrapper);

  // Met à jour l'apparence du menu personnalisé pour qu'elle corresponde à l'état actuel du <select> réel
  // (utile si le select est caché, désactivé, ou si sa valeur a changé depuis l'extérieur)
  function syncState() {
    wrapper.classList.toggle("hidden", select.classList.contains("hidden"));
    wrapper.classList.toggle("custom-select--disabled", select.disabled);
    button.disabled = select.disabled;
    label.textContent = select.selectedOptions[0]?.textContent || select.options[0]?.textContent || "";
  }

  // Referme la liste déroulante
  function close() {
    wrapper.classList.remove("custom-select--open");
    button.setAttribute("aria-expanded", "false");
    list.hidden = true;
  }

  // Ouvre la liste déroulante (et ferme d'abord tous les autres menus personnalisés déjà ouverts)
  function open() {
    if (select.disabled) return;
    closeAllCustomSelects(wrapper);
    renderOptions();
    wrapper.classList.add("custom-select--open");
    button.setAttribute("aria-expanded", "true");
    list.hidden = false;
  }

  // (Re)construit la liste des options affichées, à partir des vraies <option> du <select>
  function renderOptions() {
    list.innerHTML = "";

    Array.from(select.options).forEach(function (option) {
      const item = document.createElement("li");
      item.className = "custom-select__option";
      item.textContent = option.textContent;
      item.dataset.value = option.value;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", option.selected ? "true" : "false");

      if (option.disabled) {
        item.classList.add("custom-select__option--disabled");
      }

      if (option.selected) {
        item.classList.add("custom-select__option--selected");
      }

      // Cliquer sur une option personnalisée met à jour la vraie valeur du <select>
      item.addEventListener("click", function (event) {
        event.stopPropagation();
        if (option.disabled) return;

        select.value = option.value;
        syncState();
        renderOptions();
        close();
        // On déclenche un événement "change" sur le vrai <select>, pour que le reste du code
        // (qui écoute normalement les <select>) réagisse comme si l'utilisateur avait choisi l'option lui-même
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });

      list.appendChild(item);
    });
  }

  // Cliquer sur le bouton ouvre ou ferme la liste
  button.addEventListener("click", function (event) {
    event.stopPropagation();
    if (wrapper.classList.contains("custom-select--open")) {
      close();
    } else {
      open();
    }
  });

  // Empêche qu'un clic à l'intérieur du menu ne remonte jusqu'au document
  // (sinon le gestionnaire global plus bas le fermerait immédiatement)
  wrapper.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  // Si la valeur du <select> change depuis l'extérieur, on met à jour l'affichage personnalisé
  select.addEventListener("change", syncState);
  // Événement personnalisé qu'on peut déclencher manuellement ailleurs dans le code
  // (par exemple après avoir vidé le select en JavaScript) pour forcer une resynchronisation
  select.addEventListener("custom-select:update", function () {
    syncState();
    renderOptions();
  });

  // Un "MutationObserver" surveille les changements sur le <select> d'origine
  // (classes, attribut disabled, ou options ajoutées/retirées) et resynchronise automatiquement l'affichage
  const observer = new MutationObserver(function () {
    syncState();
    renderOptions();
  });

  observer.observe(select, {
    attributes: true,
    attributeFilter: ["class", "disabled"],
    childList: true,
    subtree: true
  });

  // Premier affichage, au moment où on transforme le select
  syncState();
  renderOptions();
}

// Ferme tous les menus personnalisés ouverts sur la page, sauf celui passé en exception (le cas échéant)
function closeAllCustomSelects(exceptWrapper) {
  document.querySelectorAll(".custom-select").forEach(function (wrapper) {
    if (wrapper === exceptWrapper) return;
    wrapper.classList.remove("custom-select--open");
    const button = wrapper.querySelector(".custom-select__button");
    const list = wrapper.querySelector(".custom-select__list");
    if (button) button.setAttribute("aria-expanded", "false");
    if (list) list.hidden = true;
  });
}

// Transforme tous les <select> présents à l'intérieur d'un élément donné (utile pour un contenu ajouté dynamiquement)
function enhanceSelects(root) {
  root.querySelectorAll("select").forEach(enhanceSelect);
}

// Cliquer n'importe où sur la page ferme tous les menus personnalisés ouverts
document.addEventListener("click", function () {
  closeAllCustomSelects();
});

// Appuyer sur la touche "Échap" ferme aussi tous les menus personnalisés ouverts
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeAllCustomSelects();
  }
});

// On transforme tous les <select> déjà présents dès le chargement de la page
enhanceSelects(document);

// On surveille aussi tout le document : si du nouveau HTML est ajouté dynamiquement plus tard
// (par exemple un nouvel article de stock avec son propre <select>), on le transforme automatiquement aussi
const customSelectObserver = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    mutation.addedNodes.forEach(function (node) {
      if (!(node instanceof Element)) return;
      if (node.matches("select")) enhanceSelect(node);
      enhanceSelects(node);
    });
  });
});

customSelectObserver.observe(document.body, {
  childList: true,
  subtree: true
});
