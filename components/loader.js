const COMPONENTS = {
  // UI
  "pix-audio": "ui/pix-audio.js",
  "pix-spoiler": "ui/pix-spoiler.js",
  "pix-tabs": "ui/pix-tabs.js",
  "pix-tab": "ui/pix-tab.js",
  "pix-carousel": "ui/pix-carousel.js",
  "pix-copy": "ui/pix-copy.js",
  "pix-accordion": "ui/pix-accordion.js"
};

const loadingComponents = new Set();

function loadComponent(tag) {
  if (customElements.get(tag)) return;
  if (loadingComponents.has(tag)) return;

  const file = COMPONENTS[tag];
  if (!file) return;

  loadingComponents.add(tag);

  // Resuelve la ruta tomando como referencia components/loader.js
  const componentUrl = new URL(file, import.meta.url);

  import(componentUrl.href)
    .then(module => {
      if (customElements.get(tag)) return;

      const component = module.default || module;
      customElements.define(tag, component);
    })
    .catch(error => {
      console.error(`Error cargando ${tag}`, error);
    })
    .finally(() => {
      loadingComponents.delete(tag);
    });
}

function scan(root = document) {
  if (root.nodeType !== Node.ELEMENT_NODE &&
      root.nodeType !== Node.DOCUMENT_NODE &&
      root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    return;
  }

  if (
    root.nodeType === Node.ELEMENT_NODE &&
    root.tagName.includes("-")
  ) {
    loadComponent(root.tagName.toLowerCase());
  }

  root.querySelectorAll?.("*").forEach(element => {
    if (element.tagName.includes("-")) {
      loadComponent(element.tagName.toLowerCase());
    }
  });
}

scan();

new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      scan(node);
    });
  });
}).observe(document.body, {
  childList: true,
  subtree: true
});
