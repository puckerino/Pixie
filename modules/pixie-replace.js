/*!
 * PixieReplace.js
 * Sustituye elementos de ForoActivo por texto, iconos, clases o atributos
 * Requiere: pixiekit.js + lucide
 * Versión: 0.1.0
 */

const PixieReplace = PixieKit("Replace", function (_) {
  const rules = [
    {
      selector: "img.i_icon_quote, img#i_icon_quote",
      target: "a",
      text: "CITAR",
      classes: ["button", "button-action"]
    },
    {
      selector: "img.i_icon_edit",
      target: "a",
      text: "EDITAR",
      classes: ["button"]
    },
    {
      selector: "img.i_icon_delete",
      target: "a",
      text: "BORRAR",
      classes: ["button", "button-danger"]
    },
    {
      selector: "img.i_icon_pm",
      target: "a",
      icon: "mail",
      tooltip: "Enviar Mensaje Privado",
      classes: ["button-icon"]
    },
    {
      selector: "img.i_icon_profile, img#i_icon_profile",
      target: "a",
      icon: "user",
      tooltip: "Ver Perfil",
      classes: ["button-icon"]
    }
  ];

  function icon(name) {
    return `<i data-lucide="${name}"></i>`;
  }

  function getTarget(element, targetSelector) {
    if (targetSelector === "self") return element;
    if (!targetSelector) return element.parentElement;

    return element.closest(targetSelector) || element.parentElement;
  }

  function applyRule(rule) {
    const elements = _.getAll(rule.selector);

    elements.forEach(function (element) {
      const target = getTarget(element, rule.target);
      if (!target) return;

      if (target.dataset.pixieReplaceReady === "true") return;

      if (rule.tooltip) {
        target.setAttribute("tooltip", rule.tooltip);
        target.setAttribute("aria-label", rule.tooltip);
      }

      if (rule.attrs) {
        Object.entries(rule.attrs).forEach(function ([name, value]) {
          target.setAttribute(name, value);
        });
      }

      if (rule.text) {
        target.textContent = rule.text;
      }

      if (rule.html) {
        target.innerHTML = rule.html;
      }

      if (rule.icon) {
        target.innerHTML = icon(rule.icon);
      }

      if (Array.isArray(rule.classes)) {
        target.classList.add(...rule.classes);
      }

      target.classList.add("pixie-replaced");
      target.dataset.pixieReplaceReady = "true";
    });
  }

  function replace() {
    rules.forEach(applyRule);
    _.icons();
  }

  function init() {
    replace();
  }

  _.ready(init);

  return {
    init,
    replace
  };
});
