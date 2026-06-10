/*!
 * PixieEditor.js
 * Personaliza los botones del editor SCEditor de ForoActivo
 * Requiere: pixiekit.js + lucide
 * Versión: 0.1.0
 */

const PixieEditor = PixieKit("Editor", function (_) {

  const config = {
    editor: "#textarea_content, #text_editor_textarea",
    toolbar: ".sceditor-toolbar",
    buttons: ".sceditor-button",

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
      "twemojifa"
    ]
  };

  function icon(name) {
    return `<i data-lucide="${name}"></i>`;
  }

  function removeButtons(command, btn) {
    if (config.remove.includes(command)) {
      btn.remove();
      return true;
    }

    return false;
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

      if (removeButtons(command, btn)) return;

      replaceIcon(command, btn);
    });

    _.icons();
  }

  function init() {
    const editor = _.get(config.editor, { required: false });
    if (!editor) return;

    _.waitFor(config.toolbar, {
      timeout: 10000
    })
      .then(function () {
        customizeButtons();
      })
      .catch(function () {
        _.log("No he encontrado la toolbar del editor.");
      });
  }

  _.ready(init);

  return {
    init,
    customizeButtons
  };

});
