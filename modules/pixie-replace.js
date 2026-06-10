/*!
 * PixieReplace.js
 * Sustituye elementos de ForoActivo por texto, iconos, clases, atributos o estructura HTML
 * Requiere: pixiekit.js + lucide
 * Versión: 0.6.0
 */

const PixieReplace = PixieKit("Replace", function (_) {
  const rules = [
    {
      selector: "img.i_icon_quote, img#i_icon_quote",
      target: "a",
      icon: "quote",
      text: "CITAR",
      tooltip: "Citar mensaje",
      classes: ["button", "button-action-post"]
    },

    {
      selector: "img.i_icon_edit",
      target: "a",
      icon: "square-pen",
      text: "EDITAR",
      tooltip: "Editar mensaje",
      classes: ["button", "button-action-post"]
    },

    {
      selector: "img.i_icon_delete",
      target: "a",
      icon: "x",
      text: "BORRAR",
      tooltip: "Borrar mensaje",
      classes: ["button", "button-action-post"]
    },

    {
      selector: "img.i_icon_ip",
      target: "a",
      icon: "info",
      text: "IP",
      tooltip: "Ver IP",
      classes: ["button", "button-action-post"]
    },

    {
      selector: "img.i_icon_pm",
      target: "a",
      icon: "mail",
      tooltip: "Enviar Mensaje Privado",
      classes: ["button", "button-icon"]
    },

    {
      selector: "img.i_icon_profile, img#i_icon_profile",
      target: "a",
      icon: "user",
      tooltip: "Ver Perfil",
      classes: ["button-icon"]
    },

    {
      selector: ".button1",
      target: "self",
      replaceClasses: {
        button1: "button"
      }
    },

    {
      selector: ".button2",
      target: "self",
      replaceClasses: {
        button2: "button"
      }
    },

    {
      selector: ".btn.btn-flat",
      target: "self",
      removeClasses: ["btn", "btn-flat"],
      classes: ["button"]
    },

    {
      selector: ".corners-top, .corners-bottom, .clear",
      target: "self",
      remove: true
    },

    {
      selector: ".form-control:has(#profile_field_16_-7)",
      target: "self",
      remove: true
    },

    {
      selector: "#page-footer .rightside",
      target: "self",
      removeTextContains: "|"
    },

    {
      selector: ".panel.row3 .inner",
      target: "self",
      unwrap: true
    },

    {
      selector: ".panel.row3",
      target: "self",
      unwrap: true
    },

    {
      selector: 'form[name="notif_opts"] .panel fieldset',
      target: "self",
      unwrap: true
    },

    {
      selector: 'form[name="notif_opts"] .panel',
      target: "self",
      unwrap: true
    },

    {
      selector: "h1.page-title",
      target: "self",
      replaceTag: "h3"
    },

    {
      selector: "fieldset.submit-buttons",
      target: "self",
      replaceTag: "article",
      classes: ["group-buttons"]
    },

    {
      selector: "p.right-box",
      target: "self",
      replaceTag: "section",
      classes: ["group-buttons"]
    },

    {
      selector: "p.pagination",
      target: "self",
      replaceTag: "article",
      classes: ["pagination"]
    },

    {
      selector: ".group-buttons a",
      target: "self",
      removeClasses: ["gensmall"],
      classes: ["button"]
    },

    {
      selector: ".group-buttons",
      target: "self",
      removeTextContains: "::"
    },

    {
      selector: "menu.form-list",
      target: "self",
      removeBlankTextNodes: true
    },

    {
      selector: ".forum .lastpost .username",
      target: "self",
      removeBlankTextNodes: true
    },

    {
      custom() {
        const tabs = document.querySelector("#tabs");
        const cpMain = document.querySelector("#cp-main");

        if (
          tabs &&
          cpMain &&
          !tabs.parentElement.matches("main.panel-tabs.ucp")
        ) {
          const wrapper = document.createElement("main");
          wrapper.className = "panel-tabs ucp";

          tabs.parentNode.insertBefore(wrapper, tabs);
          wrapper.appendChild(tabs);
          wrapper.appendChild(cpMain);
        }
      }
    },

    {
      selector: "table#checkboxes.table1",
      target: "self",
      replaceTag: "section",
      classes: ["notif-preferences"]
    },

    {
      selector: ".notif-preferences thead",
      target: "self",
      remove: true
    },

    {
      selector: ".notif-preferences tbody",
      target: "self",
      unwrap: true
    },

    {
      selector: ".notif-preferences tr",
      target: "self",
      replaceTag: "menu",
      classes: ["form-list"]
    },

    {
      selector: ".notif-preferences td",
      target: "self",
      replaceTag: "li",
      classes: ["form-control"]
    },

    {
      selector: '.notif-preferences input[name="mail_type[]"]',
      target: "self",
      afterHTML: " <span>Por email</span>"
    },

    {
      selector: '.notif-preferences input[name="notif_type[]"]',
      target: "self",
      afterHTML: " <span>Por notificación push</span>"
    },

    {
      selector: ".drafts-list .panel",
      target: "self",
      unwrap: true
    },

    {
      selector: ".drafts-list .table1",
      target: "self",
      replaceTag: "section",
      classes: ["drafts", "stack"]
    },

    {
      selector: ".drafts-list .drafts.stack thead",
      target: "self",
      remove: true
    },

    {
      selector: ".drafts-list .drafts.stack tbody",
      target: "self",
      unwrap: true
    },

    {
      selector: ".drafts-list .drafts.stack tr",
      target: "self",
      replaceTag: "article",
      classes: ["draft"]
    },

    {
      selector: ".drafts-list .drafts.stack td:first-of-type",
      target: "self",
      replaceTag: "article"
    },

    {
      selector: ".drafts-list .drafts.stack td",
      target: "self",
      unwrap: true
    },

    {
      selector: 'form[action="/search?search_id=watchsearch"] .panel',
      target: "self",
      unwrap: true
    },

    {
      selector: 'form[action="/search?search_id=watchsearch"] table#memberlist.table1',
      target: "self",
      replaceTag: "section",
      removeAttrs: ["cellspacing"],
      classes: ["supervised-topics", "stack"]
    },

    {
      selector: ".supervised-topics.stack thead",
      target: "self",
      remove: true
    },

    {
      selector: ".supervised-topics.stack tbody",
      target: "self",
      unwrap: true
    },

    {
      selector: ".supervised-topics.stack tr",
      target: "self",
      replaceTag: "article",
      classes: ["supervised-topic"]
    },

    {
      selector: ".supervised-topics.stack td",
      target: "self",
      replaceTag: "span"
    },

    {
      selector: "label span[style]",
      target: "self",
      removeAttrs: ["style"],
      unwrap: true
    },

    {
      selector: "label",
      target: "self",
      textReplace: {
        " : ": "",
        ":": ""
      }
    }
  ];

  const processed = new WeakMap();

  function icon(name) {
    return `<i data-lucide="${name}"></i>`;
  }

  function getTarget(element, targetSelector) {
    if (targetSelector === "self") return element;
    if (!targetSelector) return element.parentElement;

    return element.closest(targetSelector) || element.parentElement;
  }

  function hasApplied(target, id) {
    const applied = processed.get(target);
    return applied ? applied.has(id) : false;
  }

  function markApplied(target, id) {
    if (!processed.has(target)) {
      processed.set(target, new Set());
    }

    processed.get(target).add(id);
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

  function unwrap(target) {
    const parent = target.parentNode;
    if (!parent) return;

    while (target.firstChild) {
      parent.insertBefore(target.firstChild, target);
    }

    target.remove();
  }

  function replaceTag(target, newTag) {
  const replacement = document.createElement(newTag);

  Array.from(target.attributes).forEach(function (attr) {
    replacement.setAttribute(attr.name, attr.value);
  });

  while (target.firstChild) {
    replacement.appendChild(target.firstChild);
  }

  target.replaceWith(replacement);

  return replacement;
}

  function applyContent(target, rule) {
    if (rule.html) {
      target.innerHTML = rule.html;
      return;
    }

    if (rule.icon && rule.text) {
      target.innerHTML = `
        ${icon(rule.icon)}
        <span>${rule.text}</span>
      `;
      return;
    }

    if (rule.icon) {
      target.innerHTML = icon(rule.icon);
      return;
    }

    if (rule.text) {
      target.textContent = rule.text;
    }
  }

  function applyTooltip(target, tooltip) {
    if (!tooltip) return;

    target.setAttribute("tooltip", tooltip);
    target.setAttribute("aria-label", tooltip);
  }

  function removeTextContains(target, text) {
    if (!text) return;

    Array.from(target.childNodes).forEach(function (node) {
      if (
        node.nodeType === 3 &&
        node.nodeValue.includes(text)
      ) {
        node.remove();
      }
    });
  }

  function replaceTextNodes(target, replacements) {
    if (!replacements || typeof replacements !== "object") return;

    const walker = document.createTreeWalker(
      target,
      NodeFilter.SHOW_TEXT
    );

    let node;

    while ((node = walker.nextNode())) {
      Object.entries(replacements).forEach(function ([search, replace]) {
        node.nodeValue = node.nodeValue.split(search).join(replace);
      });
    }
  }

  function removeBlankTextNodes(target) {
    Array.from(target.childNodes).forEach(function (node) {
      if (
        node.nodeType === 3 &&
        node.nodeValue.replace(/\u00a0/g, "").trim() === ""
      ) {
        node.remove();
      }
    });
  }

  function insertAfter(target, html) {
    if (!html) return;

    target.insertAdjacentHTML("afterend", html);
  }

  function insertBefore(target, html) {
  if (!html) return;

  target.insertAdjacentHTML("beforebegin", html);
}

function appendHTML(target, html) {
  if (!html) return;

  target.insertAdjacentHTML("beforeend", html);
}

function prependHTML(target, html) {
  if (!html) return;

  target.insertAdjacentHTML("afterbegin", html);
}

  function applyRule(rule, id) {
    if (typeof rule.custom === "function") {
      rule.custom();
      return;
    }

    const elements = _.getAll(rule.selector);

    elements.forEach(function (element) {
      let target = getTarget(element, rule.target);

      if (!target) return;
      if (hasApplied(target, id)) return;

      if (rule.remove) {
        target.remove();
        return;
      }

      applyTooltip(target, rule.tooltip);
      applyAttrs(target, rule.attrs);
      removeAttrs(target, rule.removeAttrs);

      replaceClasses(target, rule.replaceClasses);
      removeClasses(target, rule.removeClasses);
      applyClasses(target, rule.classes);

      if (rule.replaceTag) {
        target = replaceTag(target, rule.replaceTag);
      }

      if (rule.unwrap) {
        unwrap(target);
        return;
      }

      removeTextContains(target, rule.removeTextContains);
      replaceTextNodes(target, rule.textReplace);

      if (rule.removeBlankTextNodes) {
        removeBlankTextNodes(target);
      }

    insertBefore(target, rule.beforeHTML);
    prependHTML(target, rule.prependHTML);

    applyContent(target, rule);

    appendHTML(target, rule.appendHTML);
    insertAfter(target, rule.afterHTML);

    markApplied(target, id);
    });
  }

  function replace() {
    rules.forEach(function (rule, index) {
      applyRule(rule, index);
    });

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
