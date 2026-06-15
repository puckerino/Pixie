const COMPONENTS = {

  // UI
  "pix-audio": "components/ui/pix-audio.js",
  "pix-spoiler": "components/ui/pix-spoiler.js",
  "pix-tabs": "components/ui/pix-tabs.js",
  "pix-tab": "components/ui/pix-tab.js",
  "pix-carousel": "components/ui/pix-carousel.js",
  "pix-copy": "components/ui/pix-copy.js",
  "pix-accordion": "components/ui/pix-accordion.js"
};

const loadingComponents = new Set();

function loadComponent(tag) {
  if (customElements.get(tag)) return;
  if (loadingComponents.has(tag)) return;

  const file = COMPONENTS[tag];
  if (!file) return;

  loadingComponents.add(tag);

  const base = import.meta.url.replace("/loader.js", "");

  import(`${base}/components/${file}`)
    .then(module => {
      if (customElements.get(tag)) return;

      const comp = module.default || module;
      customElements.define(tag, comp);
    })
    .catch(err => {
      console.error(`Error cargando ${tag}`, err);
    })
    .finally(() => {
      loadingComponents.delete(tag);
    });
}

function scan(root = document) {
  if (root.nodeType !== 1 && root.nodeType !== 9) return;

  if (root.nodeType === 1 && root.tagName.includes("-")) {
    loadComponent(root.tagName.toLowerCase());
  }

  root.querySelectorAll("*").forEach(el => {
    if (el.tagName.includes("-")) {
      loadComponent(el.tagName.toLowerCase());
    }
  });
}

scan();

new MutationObserver(mutations => {
  mutations.forEach(m => {
    m.addedNodes.forEach(node => {
      scan(node);
    });
  });
}).observe(document.body, {
  childList: true,
  subtree: true
});
