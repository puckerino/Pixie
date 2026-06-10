/*!
 * PixieCopy.js
 * Añade botón para copiar bloques de código
 * Requiere: pixiekit.js + lucide
 * Versión: 0.1.0
 */

const PixieCopy = PixieKit("Copy", function (_) {
  const defaults = {
    codebox: ".codebox:not(.spoiler, .hidecode)",
    container: "dd",
    target: ".cont_code, code",

    buttonText: "Copiar",
    buttonIcon: "copy",
    copiedText: "Copiado",
    copiedIcon: "check",

    buttonClass: "copy-button",
    copiedClass: "copied",

    resetDelay: 2000
  };

  function mergeOptions(defaults, options) {
    return Object.assign({}, defaults, options || {});
  }

  function buttonHTML(icon, text) {
    return `
      <i data-lucide="${icon}"></i>
      <span>${text}</span>
    `;
  }

  function getTargetText(btn, opts) {
    const codebox = btn.closest(opts.codebox);
    if (!codebox) return "";

    const target = codebox.querySelector(opts.target);
    if (!target) return "";

    return (target.innerText || target.textContent || "").trim();
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return _.copy(text);
  }

  function resetButton(btn, opts) {
    const previousHTML = btn.innerHTML;

    btn.innerHTML = buttonHTML(opts.copiedIcon, opts.copiedText);
    btn.classList.add(opts.copiedClass);

    _.icons();

    window.setTimeout(function () {
      btn.innerHTML = previousHTML || buttonHTML(opts.buttonIcon, opts.buttonText);
      btn.classList.remove(opts.copiedClass);

      _.icons();
    }, opts.resetDelay);
  }

  function bindButton(btn, opts) {
    btn.addEventListener("click", async function () {
      const text = getTargetText(btn, opts);
      if (!text) return;

      try {
        await copyText(text);
        resetButton(btn, opts);
      } catch (error) {
        _.log("No he podido copiar el contenido.", error);
      }
    });
  }

  function createButton(opts) {
    const btn = _.create("button", {
      type: "button",
      class: opts.buttonClass,
      html: buttonHTML(opts.buttonIcon, opts.buttonText)
    });

    bindButton(btn, opts);

    return btn;
  }

  function addButtons(options) {
    const opts = mergeOptions(defaults, options);
    const codeboxes = _.getAll(opts.codebox);

    codeboxes.forEach(function (codebox) {
      const container = codebox.querySelector(opts.container);
      if (!container) return;

      if (container.querySelector("." + opts.buttonClass)) return;

      const btn = createButton(opts);

      container.insertAdjacentElement("afterbegin", btn);
    });

    _.icons();
  }

  function init(options) {
    addButtons(options);
  }

  _.ready(init);

  return {
    init,
    addButtons
  };
});
