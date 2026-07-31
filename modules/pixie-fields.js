/*!
 * PixieFields.js
 * Normaliza, estructura y clona campos de perfil dentro de posts y perfiles.
 *
 * Requiere: pixiekit.js
 * Versión: 0.6.0
 */

const PixieFields = PixieKit("Fields", function (_) {

  const config = {
    post: "article.post, main.profile",

    fieldsBox: ".profile-fields",
    field: ".profile-field",

    label: ".label, .profile-field > span:first-child",

    /*
     * Clona el campo completo:
     * data-profile-render="mensajes"
     */
    renderAttr: "data-profile-render",

    /*
     * Clona únicamente el valor:
     * data-profile-render-value="mensajes"
     */
    renderValueAttr: "data-profile-render-value",

    /*
     * Interpreta el valor como HTML:
     * data-profile-render-html="timeline-dos"
     */
    renderHTMLAttr: "data-profile-render-html",

    removeColon: true,
    hideEmptyBox: true,

    move: {
      // ".awards": ["medallas", "premios"],
      // ".rpgsheet": ["mensajes", "fecha-de-inscripcion"]
    }
  };

  /*
   * Guarda los datos de los campos procesados
   * para cada post o perfil.
   */
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
   * Limpia espacios duplicados y espacios no separables.
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
          node.nodeType === Node.TEXT_NODE &&
          cleanText(node.nodeValue).includes(":")
        );
      });
  }

  /**
   * Elimina el nodo de texto usado como etiqueta.
   */
  function removeFirstLabelTextNode(field) {
    const firstText =
      findLabelTextNode(field);

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

    const firstText =
      findLabelTextNode(field);

    if (!firstText) {
      return "";
    }

    return cleanText(firstText.nodeValue)
      .replace(/\s*:\s*$/, "");
  }

  /**
   * Obtiene el valor textual del campo.
   *
   * Este valor se usa para data-value y para la API pública.
   * No se utiliza para reconstruir el HTML del campo.
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
   * Busca en la configuración move qué destino
   * corresponde a un slug.
   */
  function getMoveTarget(slug, map) {
    for (const target in map) {
      if (
        Object.prototype.hasOwnProperty.call(
          map,
          target
        ) &&
        Array.isArray(map[target]) &&
        map[target].includes(slug)
      ) {
        return target;
      }
    }

    return null;
  }

  /**
   * Reconstruye un campo con esta estructura:
   *
   * .profile-field
   * ├── .field-name
   * └── .field-value
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
   * Guarda un campo en el almacén interno.
   */
  function saveField(post, data) {
    if (!fieldStore.has(post)) {
      fieldStore.set(post, {});
    }

    fieldStore.get(post)[data.slug] =
      data;
  }

  /**
   * Clona únicamente el contenido de .field-value.
   *
   * No interpreta el texto como HTML.
   */
  function cloneValueOnly(field, target) {
    const value =
      field.querySelector(".field-value");

    if (!value) {
      return false;
    }

    Array.from(value.childNodes)
      .forEach(function (node) {
        target.appendChild(
          node.cloneNode(true)
        );
      });

    return true;
  }

  /**
   * Obtiene el HTML que se debe interpretar.
   *
   * Si Foroactivo ha convertido las etiquetas en texto:
   *
   * &lt;s-timeline&gt;
   *
   * textContent devolverá:
   *
   * <s-timeline>
   */
  function getHTMLValue(field) {
    const value =
      field.querySelector(".field-value");

    if (!value) {
      return "";
    }

    return String(
      value.textContent || ""
    ).trim();
  }

  /**
   * Interpreta el contenido de .field-value como HTML
   * y lo inserta dentro del destino.
   *
   * Debe utilizarse solamente con campos cuyo contenido
   * sea de confianza.
   */
  function renderHTMLValue(field, target) {
    const html =
      getHTMLValue(field);

    if (!html) {
      return false;
    }

    const template =
      document.createElement("template");

    template.innerHTML = html;

    target.appendChild(
      template.content.cloneNode(true)
    );

    return true;
  }

  /**
   * Busca placeholders dentro del post y clona:
   *
   * Campo completo:
   * data-profile-render="mensajes"
   *
   * Solo valor:
   * data-profile-render-value="mensajes"
   *
   * Valor interpretado como HTML:
   * data-profile-render-html="timeline-dos"
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

    const htmlTargets =
      post.querySelectorAll(
        `[${opts.renderHTMLAttr}="${slug}"]`
      );

    let rendered = false;

    /*
     * Clona el campo completo.
     */
    fullTargets.forEach(function (target) {
      target.appendChild(
        field.cloneNode(true)
      );

      rendered = true;
    });

    /*
     * Clona únicamente los nodos de .field-value.
     */
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

    /*
     * Convierte el texto del campo en HTML real.
     */
    htmlTargets.forEach(function (target) {
      if (
        renderHTMLValue(
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
   * Clona el campo completo en los destinos configurados
   * mediante move.
   *
   * El nombre move se conserva por compatibilidad con
   * versiones anteriores.
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

  /**
   * Procesa un campo individual.
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

    if (!name) {
      return;
    }

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

    saveField(
      post,
      data
    );

    /*
     * Los placeholders tienen prioridad sobre move.
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
  function processPost(post, opts) {
    /*
     * Evita procesar dos veces el mismo post.
     */
    if (post.dataset.pixieFieldsReady === "true") {
      return;
    }

    const fieldsBox =
      post.querySelector(
        opts.fieldsBox
      );

    if (!fieldsBox) {
      return;
    }

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

    post.dataset.pixieFieldsReady =
      "true";

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

    /*
     * Se copia move para evitar modificar accidentalmente
     * el objeto de configuración original.
     */
    opts.move =
      Object.assign(
        {},
        config.move,
        options.move || {}
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
   * Devuelve un campo concreto de un post.
   */
  function get(post, slug) {
    const fields =
      fieldStore.get(post);

    if (!fields) {
      return null;
    }

    return fields[slug] || null;
  }

  /**
   * Devuelve todos los campos guardados de un post.
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
