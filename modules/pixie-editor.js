/*!
 * PixieEditor.js
 * Personaliza el editor SCEditor de ForoActivo
 * Requiere: pixiekit.js + lucide
 * Versión: 0.2.0
 */

const PixieEditor = PixieKit("Editor", function (_) {

  const config = {
    editor: "#textarea_content, #text_editor_textarea",
    container: ".sceditor-container",
    toolbar: ".sceditor-toolbar",
    buttons: ".sceditor-button",

    defaultTheme: 'link[href*="fa.default.min.css"]',

    icons: {
      bold: "bold",
      italic: "italic",
      underline: "underline",
      strike: "strikethrough",

      left: "align-left",
      center: "align-center",
      right: "align-right",
      justify: "align-justify",

      bulletlist: "list",
      orderedlist: "list-ordered",
      horizontalrule: "minus",

      quote: "quote",
      code: "code",
      faspoiler: "eye-off",
      fahide: "eye-closed",

      image: "image",
      link: "link",

      size: "type",
      color: "palette",
      font: "case-sensitive",

      mention: "at-sign",
      emoticon: "smile",
      source: "file-code"
    },

    remove: [
      "table",
      "servimg",
      "youtube",
      "headers",
      "date",
      "time",
      "pastetext",
      "removeformat",
      "more",
      "embed",
      "farand",
      "faupdown",
      "twemojifa"
    ]
  };

  function icon(name) {
    return `<i data-lucide="${name}"></i>`;
  }

  function removeDefaultTheme() {
    _.getAll(config.defaultTheme).forEach(function (link) {
      link.remove();
    });
  }

  function markEditor() {
    const container = _.get(config.container, {
      required: false
    });

    if (!container) return;

    container.classList.add("pixie-editor");
  }

  function removeButton(command, btn) {
    if (!config.remove.includes(command)) return false;

    btn.remove();
    return true;
  }

  function replaceIcon(command, btn) {
    if (!Object.prototype.hasOwnProperty.call(config.icons, command)) return;

    btn.innerHTML = icon(config.icons[command]);
    btn.classList.add("pixie-editor-icon");
  }

  function customizeButtons() {
    const buttons = _.getAll(config.buttons);

    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      const command = btn.getAttribute("data-sceditor-command");

      if (!command) return;

      if (removeButton(command, btn)) return;

      replaceIcon(command, btn);
    });

    _.icons();
  }

  function initEditor() {
    markEditor();
    customizeButtons();
  }

  function init() {
    removeDefaultTheme();

    const editor = _.get(config.editor, {
      required: false
    });

    if (!editor) return;

    _.waitFor(config.toolbar, {
      timeout: 10000
    })

      .then(function () {
        initEditor();
      })

      .catch(function () {
        _.log("No he encontrado la toolbar del editor.");
      });
  }

  _.ready(init);

  return {
    init,
    removeDefaultTheme,
    markEditor,
    customizeButtons
  };

});
