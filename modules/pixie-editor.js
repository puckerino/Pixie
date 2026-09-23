/*!
 * PixieEditor.js
 * Personaliza el editor SCEditor de ForoActivo
 * Requiere: pixiekit.js
 * Versión: 0.3.1
 */

const PixieEditor = PixieKit("Editor", function (_) {

  const config = {
    editor: "#textarea_content, #text_editor_textarea",
    container: ".sceditor-container",
    toolbar: ".sceditor-toolbar",
    buttons: ".sceditor-button",

    defaultTheme: 'link[href*="fa.default.min.css"]',

    icons: {
      bold: "format_bold",
      italic: "format_italic",
      underline: "format_underlined",
      strike: "strikethrough_s",

      left: "format_align_left",
      center: "format_align_center",
      right: "format_align_right",
      justify: "format_align_justify",

      bulletlist: "format_list_bulleted",
      orderedlist: "format_list_numbered",
      horizontalrule: "horizontal_rule",

      quote: "format_quote",
      code: "code",
      faspoiler: "visibility_off",
      fahide: "preview_off",

      image: "image",
      link: "link",

      size: "format_size",
      color: "palette",
      font: "brand_family",

      mention: "alternate_email",
      source: "folder_code"
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
      "twemojifa",
      "subscript",
      "superscript",
      "fascroll",
      "emoticon"
    ]
  };

  function icon(name) {
    return `<span class="material-symbols-outlined">${name}</span>`;
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
    if (!Object.prototype.hasOwnProperty.call(config.icons, command)) {
      return;
    }

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
