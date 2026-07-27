/*!
 * PixieFields.js
 * Normaliza, estructura y clona campos de perfil dentro de posts y perfiles
 * Requiere: pixiekit.js
 * Versión: 0.5.1
 */

const PixieFields = PixieKit("Fields", function (_) {

  const config = {
    post: "article.post, main.profile",

    fieldsBox: ".profile-fields",
    field: ".profile-field",

    label: ".label, .profile-field > span:first-child",

    renderAttr: "data-profile-render",
    renderValueAttr: "data-profile-render-value",

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

  function findLabelTextNode(field) {
    return Array.from(field.childNodes)
      .find(function (node) {
        return (
          node.nodeType === 3 &&
          cleanText(node.nodeValue).includes(":")
        );
      });
  }

  function removeFirstLabelTextNode(field) {
    const firstText =
      findLabelTextNode(field);

    if (firstText) {
      firstText.remove();
    }
  }

  function getLabelName(field, label) {
    if (label) {
      return cleanText(label.textContent)
        .replace(/\s*:\s*$/, "");
    }

    const firstText =
      findLabelTextNode(field);

    if (!firstText) return "";

    return cleanText(firstText.nodeValue)
      .replace(/\s*:\s*$/, "");
  }

  function getFieldValue(field, opts) {
    const uneditable =
      field.querySelector(".field_uneditable");

    if (uneditable) {
      return cleanText(
        uneditable.textContent
      );
    }

    const clone =
      field.cloneNode(true);

    const cloneLabel =
      clone.querySelector(opts.label);

    if (cloneLabel) {
      cloneLabel.remove();
    } else {
      removeFirstLabelTextNode(clone);
    }

    return cleanText(clone.textContent)
      .replace(/^:\s*/, "")
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

  function rebuildField(field, data, opts) {
    const sourceValue =
      field.querySelector(".field_uneditable");

    const clone = sourceValue
      ? sourceValue.cloneNode(true)
      : field.cloneNode(true);

    const label =
      clone.querySelector(opts.label);

    if (label) {
      label.remove();
    } else {
      removeFirstLabelTextNode(clone);
    }

    clone.classList.remove(
      "field_uneditable"
    );

    field.innerHTML = "";

    const nameEl = _.create("span", {
      class: "field-name",
      text: opts.removeColon
        ? data.name
        : `${data.name} :`
    });

    const valueEl = _.create("span", {
      class: "field-value"
    });

    while (clone.firstChild) {
      valueEl.appendChild(
        clone.firstChild
      );
    }

    field.appendChild(nameEl);
    field.appendChild(valueEl);
  }

  function saveField(post, data) {
    if (!fieldStore.has(post)) {
      fieldStore.set(post, {});
    }

    fieldStore.get(post)[data.slug] =
      data;
  }

  /**
   * Clona únicamente el contenido de .field-value
   * dentro de un destino.
   */
  function cloneValueOnly(field, target) {
    const value =
      field.querySelector(".field-value");

    if (!value) return false;

    Array.from(value.childNodes)
      .forEach(function (node) {
        target.appendChild(
          node.cloneNode(true)
        );
      });

    return true;
  }

  /**
   * Clona el campo en todos los placeholders coincidentes.
   *
   * Campo completo:
   * data-profile-render="mensajes"
   *
   * Solo valor:
   * data-profile-render-value="mensajes"
   */
  function renderToPlaceholder(
    field,
    post,
    slug,
    opts
  ) {
    const fullTargets =
      post.querySelectorAll(
        `[${opts.renderAttr}="${slug}"]`
      );

    const valueTargets =
      post.querySelectorAll(
        `[${opts.renderValueAttr}="${slug}"]`
      );

    let rendered = false;

    fullTargets.forEach(function (target) {
      target.appendChild(
        field.cloneNode(true)
      );

      rendered = true;
    });

    valueTargets.forEach(function (target) {
      if (
        cloneValueOnly(
          field,
          target
        )
      ) {
        rendered = true;
      }
    });

    return rendered;
  }

  /**
   * Clona el campo completo en el destino configurado
   * mediante move.
   *
   * El nombre move se conserva para mantener la
   * compatibilidad con la configuración anterior.
   */
  function moveByConfig(
    field,
    post,
    slug,
    opts
  ) {
    const targetSelector =
      getMoveTarget(
        slug,
        opts.move
      );

    if (!targetSelector) {
      return false;
    }

    const targets =
      post.querySelectorAll(
        targetSelector
      );

    if (!targets.length) {
      _.log(
        `No encuentro ${targetSelector} para clonar ${slug}`
      );

      return false;
    }

    targets.forEach(function (target) {
      target.appendChild(
        field.cloneNode(true)
      );
    });

    return true;
  }

  function processField(
    field,
    post,
    opts
  ) {
    const label =
      field.querySelector(opts.label);

    const name =
      getLabelName(field, label);

    if (!name) return;

    const slug =
      slugify(name);

    const value =
      getFieldValue(field, opts);

    const data = {
      name,
      slug,
      value,
      element: field
    };

    field.classList.add(
      `field-${slug}`
    );

    field.dataset.field = slug;
    field.dataset.value = value;

    rebuildField(
      field,
      data,
      opts
    );

    saveField(post, data);

    if (
      renderToPlaceholder(
        field,
        post,
        slug,
        opts
      )
    ) {
      return;
    }

    moveByConfig(
      field,
      post,
      slug,
      opts
    );
  }

  function processPost(post, opts) {
    const fieldsBox =
      post.querySelector(
        opts.fieldsBox
      );

    if (!fieldsBox) return;

    /*
     * Esta lista se crea antes de clonar los campos.
     * De este modo, los clones no vuelven a procesarse.
     */
    const fields =
      Array.from(
        fieldsBox.querySelectorAll(
          opts.field
        )
      );

    fields.forEach(function (field) {
      processField(
        field,
        post,
        opts
      );
    });

    if (
      opts.hideEmptyBox &&
      !fieldsBox.children.length
    ) {
      fieldsBox.hidden = true;
    }
  }

  function init(options = {}) {
    const opts =
      Object.assign(
        {},
        config,
        options || {}
      );

    _.getAll(opts.post)
      .forEach(function (post) {
        processPost(
          post,
          opts
        );
      });
  }

  function get(post, slug) {
    const fields =
      fieldStore.get(post);

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
