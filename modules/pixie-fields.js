/*!
 * PixieFields.js
 * Normaliza, estructura y clona campos de perfil dentro de posts y perfiles
 * Requiere: pixiekit.js
 * Versión: 0.5.1
 * data-profile-render="fecha-de-inscripcion"
 * data-profile-render-value="fecha-de-inscripcion"
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

  /**
   * Convierte el nombre de un campo en un slug.
   *
   * Ejemplo:
   * "Fecha de inscripción" → "fecha-de-inscripcion"
   */
  function slugify(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Limpia espacios, saltos de línea y espacios no separables.
   */
  function cleanText(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Busca el nodo de texto que contiene el nombre del campo
   * cuando Foroactivo no lo envuelve en un elemento.
   */
  function findLabelTextNode(field) {
    return Array.from(field.childNodes)
      .find(function (node) {
        return (
          node.nodeType === 3 &&
          cleanText(node.nodeValue).includes(":")
        );
      });
  }

  /**
   * Elimina del clon el primer nodo de texto usado como etiqueta.
   */
  function removeFirstLabelTextNode(field) {
    const firstText = findLabelTextNode(field);

    if (firstText) {
      firstText.remove();
    }
  }

  /**
   * Obtiene el nombre visible del campo.
   */
  function getLabelName(field, label) {
    if (label) {
      return cleanText(label.textContent)
        .replace(/\s*:\s*$/, "");
    }

    const firstText = findLabelTextNode(field);

    if (!firstText) return "";

    return cleanText(firstText.nodeValue)
      .replace(/\s*:\s*$/, "");
  }

  /**
   * Obtiene el valor textual del campo.
   */
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

  /**
   * Comprueba si el slug del campo aparece en la configuración move.
   */
  function getMoveTarget(slug, map) {
    for (const target in map) {
      if (map[target].includes(slug)) {
        return target;
      }
    }

    return null;
  }

  /**
   * Reconstruye el campo con una estructura uniforme:
   *
   * .field-name
   * .field-value
   */
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

  /**
   * Guarda la información del campo para poder recuperarla
   * posteriormente mediante PixieFields.get().
   */
  function saveField(post, data) {
    if (!fieldStore.has(post)) {
      fieldStore.set(post, {});
    }

    fieldStore.get(post)[data.slug] =
      data;
  }

  /**
   * Clona únicamente el contenido de .field-value
   * dentro del destino.
   *
   * El campo original permanece en .profile-fields.
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
   * Clona el campo en los placeholders declarados mediante:
   *
   * data-profile-render
   * data-profile-render-value
   */
  function renderToPlaceholder(
    field,
    post,
    slug,
    opts
  ) {
    const fullTarget =
      post.querySelector(
        `[${opts.renderAttr}="${slug}"]`
      );

    const valueTarget =
      post.querySelector(
        `[${opts.renderValueAttr}="${slug}"]`
      );

    /*
     * Clona el campo completo:
     *
     * <div
     *   data-profile-render="fecha-de-inscripcion"
     * ></div>
     */
    if (fullTarget) {
      fullTarget.appendChild(
        field.cloneNode(true)
      );

      return true;
    }

    /*
     * Clona solamente el valor:
     *
     * <div
     *   data-profile-render-value="fecha-de-inscripcion"
     * ></div>
     */
    if (valueTarget) {
      return cloneValueOnly(
        field,
        valueTarget
      );
    }

    return false;
  }

  /**
   * Clona el campo completo en el destino indicado
   * mediante la configuración move.
   *
   * Se conserva el nombre "move" para mantener la
   * compatibilidad con la configuración original.
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

    const target =
      post.querySelector(
        targetSelector
      );

    if (!target) {
      _.log(
        `No encuentro ${targetSelector} para clonar ${slug}`
      );

      return false;
    }

    target.appendChild(
      field.cloneNode(true)
    );

    return true;
  }

  /**
   * Normaliza y procesa un campo individual.
   */
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

    /*
     * Primero busca un placeholder HTML.
     */
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

    /*
     * Si no hay placeholder, busca un destino
     * dentro de la configuración move.
     */
    moveByConfig(
      field,
      post,
      slug,
      opts
    );
  }

  /**
   * Procesa todos los campos de un post o perfil.
   */
  function processPost(
    post,
    opts
  ) {
    const fieldsBox =
      post.querySelector(
        opts.fieldsBox
      );

    if (!fieldsBox) return;

    /*
     * Se crea una lista fija antes de empezar.
     * Así, los clones generados no vuelven a procesarse.
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

    /*
     * Al clonarse los campos, normalmente la caja
     * original conservará contenido y no se ocultará.
     */
    if (
      opts.hideEmptyBox &&
      !fieldsBox.children.length
    ) {
      fieldsBox.hidden = true;
    }
  }

  /**
   * Inicializa PixieFields.
   */
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

  /**
   * Recupera un campo concreto previamente procesado.
   */
  function get(post, slug) {
    const fields =
      fieldStore.get(post);

    if (!fields) return null;

    return fields[slug] || null;
  }

  /**
   * Recupera todos los campos procesados de un post.
   */
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
