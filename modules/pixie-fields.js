/*!
 * PixieFields.js
 * Normaliza y mueve campos de perfil dentro de los posts
 * Requiere: pixiekit.js
 * Versión: 0.1.0
 */

const PixieFields = PixieKit("Fields", function (_) {
  const config = {
    post: ".post",
    fieldsBox: ".profile-fields",
    field: ".profile-field",
    label: ".label",

    removeColon: true,
    showFieldsBox: false,

    move: {
      // ".awards": ["premios", "medallas"],
      // ".rpgsheet": ["mensajes", "fecha-de-inscripcion"]
    }
  };

  function slugify(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function cleanLabelText(label) {
    return (label.textContent || "")
      .replace(/\s*:\s*$/, "")
      .trim();
  }

  function getMoveTarget(slug, map) {
    for (const target in map) {
      if (map[target].includes(slug)) {
        return target;
      }
    }

    return null;
  }

  function cleanLabel(label, name, opts) {
    label.textContent = opts.removeColon ? name : `${name} :`;
  }

  function processField(field, post, opts) {
    const label = field.querySelector(opts.label);
    if (!label) return;

    const name = cleanLabelText(label);
    if (!name) return;

    const slug = slugify(name);

    field.classList.add(`field-${slug}`);
    field.dataset.field = slug;

    cleanLabel(label, name, opts);

    const targetSelector = getMoveTarget(slug, opts.move);
    if (!targetSelector) return;

    const target = post.querySelector(targetSelector);

    if (!target) {
      _.log(`No encuentro ${targetSelector} para mover ${slug}`);
      return;
    }

    target.appendChild(field);
  }

  function processPost(post, opts) {
    const fieldsBox = post.querySelector(opts.fieldsBox);
    if (!fieldsBox) return;

    const fields = Array.from(fieldsBox.querySelectorAll(opts.field));

    fields.forEach(function (field) {
      processField(field, post, opts);
    });

    if (opts.showFieldsBox) {
      fieldsBox.style.display = "";
    }
  }

  function init(options = {}) {
    const opts = Object.assign({}, config, options || {});

    _.getAll(opts.post).forEach(function (post) {
      processPost(post, opts);
    });
  }

  _.ready(init);

  return {
    init,
    slugify,
    processPost
  };
});
