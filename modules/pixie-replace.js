/*!
 * PixieReplace.js
 * Sustituye elementos de ForoActivo por texto, iconos, clases o atributos
 * Requiere: pixiekit.js + lucide
 * Versión: 0.2.0
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
    },

    {
      selector: ".button2",
      target: "self",
      replaceClasses: {
        button2: "button"
      }
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

  function applyAttrs(target, attrs) {
    if (!attrs || typeof attrs !== "object") return;

    Object.entries(attrs).forEach(function ([name, value]) {
      target.setAttribute(name, value);
    });
  }

  function removeAttrs(target, attrs) {
    if (!Array.isArray(attrs)) return;

    attrs.forEach(function (name) {
      target.removeAttribute(name);
    });
  }

  function applyClasses(target, classes) {
    if (!Array.isArray(classes)) return;

    target.classList.add(...classes);
  }

  function removeClasses(target, classes) {
    if (!Array.isArray(classes)) return;

    target.classList.remove(...classes);
  }

  function replaceClasses(target, classMap) {
    if (!classMap || typeof classMap !== "object") return;

    Object.entries(classMap).forEach(function ([oldClass, newClass]) {
      target.classList.remove(oldClass);

      if (newClass) {
        target.classList.add(newClass);
      }
    });
  }

  function applyContent(target, rule) {
    if (rule.text) {
      target.textContent = rule.text;
    }

    if (rule.html) {
      target.innerHTML = rule.html;
    }

    if (rule.icon) {
      target.innerHTML = icon(rule.icon);
    }
  }

  function applyTooltip(target, tooltip) {
    if (!tooltip) return;

    target.setAttribute("tooltip", tooltip);
    target.setAttribute("aria-label", tooltip);
  }

  function applyRule(rule) {
    const elements = _.getAll(rule.selector);

    elements.forEach(function (element) {
      const target = getTarget(element, rule.target);

      if (!target) return;

      if (target.dataset.pixieReplaceReady === "true") return;

      applyTooltip(target, rule.tooltip);
      applyAttrs(target, rule.attrs);
      removeAttrs(target, rule.removeAttrs);

      replaceClasses(target, rule.replaceClasses);
      removeClasses(target, rule.removeClasses);
      applyClasses(target, rule.classes);

      applyContent(target, rule);

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
