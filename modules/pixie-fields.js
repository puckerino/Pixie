/*!
 * PixieFields.js
 * Normaliza, estructura y mueve campos de perfil dentro de los posts
 * Requiere: pixiekit.js
 * Versión: 0.2.0
 */

const PixieFields = PixieKit("Fields", function (_) {
  const config = {
    post: ".post",
    fieldsBox: ".profile-fields",
    field: ".profile-field",
    label: ".label",

    removeColon: true,
    hideEmptyBox: true,

    move: {
      // ".awards": ["medallas", "premios"],
      // ".rpgsheet": ["mensajes", "fecha-de-inscripcion"]
    }
  };

  const fieldStore = new WeakMap();

  function slugify(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function cleanText(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getLabelName(label) {
    return cleanText(label.textContent).replace(/\s*:\s*$/, "");
  }

  function getFieldValue(field, label) {
    const clone = field.cloneNode(true);
    const cloneLabel = clone.querySelector(".label");

    if (cloneLabel) cloneLabel.remove();

    return cleanText(clone.textContent);
  }

  function getMoveTarget(slug, map) {
    for (const target in map) {
      if (map[target].includes(slug)) return target;
    }

    return null;
  }

  function rebuildField(field, data, opts) {
    field.innerHTML = "";

    const nameEl = _.create("span", {
      class: "field-name",
      text: opts.removeColon ? data.name : `${data.name} :`
    });

    const valueEl = _.create("span", {
      class: "field-value",
      text: data.value
    });

    field.appendChild(nameEl);
    field.appendChild(valueEl);
  }

  function saveField(post, data) {
    if (!fieldStore.has(post)) {
      fieldStore.set(post, {});
    }

    fieldStore.get(post)[data.slug] = data;
  }

  function processField(field, post, opts) {
    const label = field.querySelector(opts.label);
    if (!label) return;

    const name = getLabelName(label);
    if (!name) return;

    const slug = slugify(name);
    const value = getFieldValue(field, label);

    const data = {
      name,
      slug,
      value,
      element: field
    };

    field.classList.add(`field-${slug}`);
    field.dataset.field = slug;
    field.dataset.value = value;

    rebuildField(field, data, opts);
    saveField(post, data);

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

    if (opts.hideEmptyBox && !fieldsBox.children.length) {
      fieldsBox.hidden = true;
    }
  }

  function init(options = {}) {
    const opts = Object.assign({}, config, options || {});

    _.getAll(opts.post).forEach(function (post) {
      processPost(post, opts);
    });
  }

  function get(post, slug) {
    const fields = fieldStore.get(post);
    if (!fields) return null;

    return fields[slug] || null;
  }

  function getAll(post) {
    return fieldStore.get(post) || {};
  }

  _.ready(init);

  return {
    init,
    get,
    getAll,
    slugify,
    processPost
  };
});
