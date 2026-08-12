/*!
 * PixieProfile.js
 * Lectura y escritura genérica de campos de perfil en Foroactivo.
 */

(function () {
  "use strict";

  const CONFIG = {
    saveTimeoutMs: 7000,
    waitForEditableMs: 8000,
    pollMs: 100,
    iframeClass: "pixie-profile-frame"
  };

  const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

  function isFullURL(value) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  function normalizeProfileURL(value) {
    value = String(value || "").trim();

    if (!value) return null;

    if (isFullURL(value)) {
      return value;
    }

    if (/^\/?u\d+$/i.test(value)) {
      return value.startsWith("/")
        ? value
        : `/${value}`;
    }

    if (/^\d+$/.test(value)) {
      return `/u${value}`;
    }

    return value.startsWith("/")
      ? value
      : `/u${value}`;
  }

  async function fetchHTML(url) {
    const response = await fetch(url, {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} al cargar ${url}`
      );
    }

    return response.text();
  }

  function parseHTML(html) {
    return new DOMParser().parseFromString(
      html,
      "text/html"
    );
  }

  function findFieldWrapper(doc, field) {
    if (!doc || !field) return null;

    /*
     * 1. ID de Foroactivo.
     *
     * Ejemplo:
     * #field_id4
     *
     * Esta será nuestra opción preferente.
     */
    if (field.id) {
      const byId = doc.getElementById(field.id);

      if (byId) {
        return byId;
      }
    }

    /*
     * 2. Estructura de Spectra.
     *
     * Ejemplo:
     * .profile-field[data-field="faceclaim-2"]
     */
    if (field.field) {
      const bySpectraField = doc.querySelector(
        `.profile-field[data-field="${CSS.escape(String(field.field))}"]`
      );

      if (bySpectraField) {
        return bySpectraField;
      }
    }

    /*
     * 3. Estructura original de Foroactivo.
     *
     * La mantenemos como fallback porque es la
     * que utiliza Foroactivo internamente para
     * la edición AJAX.
     */
    if (field.forumField) {
      const byForumField = doc.querySelector(
        `.campo_perfil[field="${CSS.escape(String(field.forumField))}"]`
      );

      if (byForumField) {
        return byForumField;
      }
    }

    return null;
  }

function getDisplay(wrapper) {
  if (!wrapper) {
    return {
      html: "",
      text: ""
    };
  }

  /*
   * 1. Foroactivo.
   */
  const uneditable =
    wrapper.matches?.(".field_uneditable")
      ? wrapper
      : wrapper.querySelector(".field_uneditable");

  if (uneditable) {
    return {
      html: uneditable.innerHTML.trim(),
      text: uneditable.textContent.trim()
    };
  }

  /*
   * 2. Foro.
   */
  const valueElement =
    wrapper.querySelector(".field-value");

  if (valueElement) {
    return {
      html: valueElement.innerHTML.trim(),

      text:
        wrapper.getAttribute("data-value") ??
        valueElement.textContent.trim()
    };
  }

  /*
   * 3. data-value.
   */
  if (wrapper.hasAttribute("data-value")) {
    const value =
      wrapper.getAttribute("data-value") || "";

    return {
      html: value,
      text: value
    };
  }

  return {
    html: "",
    text: ""
  };
}

  function defaultRead(display, field) {
    if (field.type === "number") {
      const clean = String(display.text || "")
        .replace(/[^\d,.-]/g, "")
        .replace(",", ".");

      const number = Number(clean);

      return Number.isFinite(number)
        ? number
        : 0;
    }

    if (field.type === "html") {
      return display.html;
    }

    return display.text;
  }

  function readValue(display, field) {
    if (typeof field.read === "function") {
      return field.read({
        html: display.html,
        text: display.text,
        field
      });
    }

    return defaultRead(display, field);
  }

  function serializeValue(value, field) {
    if (typeof field.write === "function") {
      return field.write(value, field);
    }

    if (
      value === undefined ||
      value === null
    ) {
      return "";
    }

    return String(value);
  }

  async function loadProfile(profile, fields = []) {
    const url =
      normalizeProfileURL(profile);

    if (!url) {
      throw new Error(
        "No se ha indicado un perfil válido."
      );
    }

    const html = await fetchHTML(url);
    const doc = parseHTML(html);

    const values = {};

    fields.forEach(field => {
      const wrapper =
        findFieldWrapper(doc, field);

      if (!wrapper) {
        values[field.key] = {
          found: false,
          value: null,
          html: "",
          text: ""
        };

        return;
      }

      const display =
        getDisplay(wrapper);

      values[field.key] = {
        found: true,

        value: readValue(
          display,
          field
        ),

        html: display.html,
        text: display.text
      };
    });

    return {
      url,
      document: doc,
      values
    };
  }

  function getIframe() {
    let iframe = document.querySelector(
      `iframe.${CONFIG.iframeClass}`
    );

    if (iframe) {
      return iframe;
    }

    iframe =
      document.createElement("iframe");

    iframe.className =
      CONFIG.iframeClass;

    iframe.title =
      "Pixie Profile";

    iframe.hidden = true;

    document.body.appendChild(iframe);

    return iframe;
  }

  function loadIframe(iframe, url) {
    return new Promise(
      (resolve, reject) => {
        let finished = false;

        const timeout = setTimeout(() => {
          if (finished) return;

          finished = true;

          iframe.removeEventListener(
            "load",
            onLoad
          );

          reject(
            new Error(
              "El perfil tardó demasiado en cargar."
            )
          );
        }, CONFIG.waitForEditableMs);

        function onLoad() {
          if (finished) return;

          finished = true;

          clearTimeout(timeout);

          iframe.removeEventListener(
            "load",
            onLoad
          );

          try {
            const doc =
              iframe.contentDocument;

            if (!doc) {
              throw new Error(
                "No se pudo acceder al perfil."
              );
            }

            resolve(doc);
          } catch (error) {
            reject(error);
          }
        }

        iframe.addEventListener(
          "load",
          onLoad
        );

        iframe.src = url;
      }
    );
  }

  function fillEditable(
    editable,
    value,
    field
  ) {
    if (
      typeof field.fill === "function"
    ) {
      return field.fill({
        editable,
        value,
        field
      });
    }

    const control =
      editable.querySelector(
        'textarea[name^="profile_field_"]'
      ) ||
      editable.querySelector(
        'input[name^="profile_field_"]'
      ) ||
      editable.querySelector(
        'select[name^="profile_field_"]'
      ) ||
      editable.querySelector(
        "textarea, input, select"
      );

    if (!control) {
      return false;
    }

    control.value =
      serializeValue(value, field);

    [
      "input",
      "change",
      "blur"
    ].forEach(type => {
      control.dispatchEvent(
        new Event(type, {
          bubbles: true
        })
      );
    });

    return true;
  }

  function triggerEditDiscovery(wrapper) {
  /*
   * Foroactivo genera el control .ajax-profil_edit
   * dinámicamente al interactuar con un campo
   * .ajax-profil_parent.
   *
   * Simulamos esa interacción.
   */

  const targets = [
    wrapper,
    wrapper.querySelector(".field_uneditable")
  ].filter(Boolean);

  targets.forEach(target => {
    target.dispatchEvent(
      new MouseEvent("mouseover", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );

    target.dispatchEvent(
      new MouseEvent("mouseenter", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );

    target.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
  });
}

function saveField(
  doc,
  field,
  value
) {
  return new Promise(resolve => {
    const wrapper =
      findFieldWrapper(
        doc,
        field
      );

    const label =
      field.label ||
      field.key;


    /*
     * ============================================
     * CAMPO NO ENCONTRADO
     * ============================================
     */

    if (!wrapper) {
      resolve({
        ok: false,
        key: field.key,
        message:
          `${label}: campo no encontrado`
      });

      return;
    }


    /*
     * ============================================
     * ESPERAR AL MODO EDICIÓN
     * ============================================
     *
     * Foroactivo no mantiene necesariamente
     * .ajax-profil_edit dentro del HTML.
     *
     * Puede generarlo dinámicamente al interactuar
     * con .ajax-profil_parent.
     */

    let elapsed = 0;
    let editClicked = false;


    const editTimer =
      setInterval(() => {
        elapsed +=
          CONFIG.pollMs;


        const editable =
          wrapper.querySelector(
            ".field_editable"
          );


        const validButton =
          wrapper.querySelector(
            ".ajax-profil_valid"
          );


        /*
         * ========================================
         * YA ESTAMOS EN MODO EDICIÓN
         * ========================================
         *
         * Esto también cubre el caso en el que
         * alguien hubiese pulsado editar antes.
         */

        if (
          editable &&
          validButton &&
          !editable.classList.contains(
            "invisible"
          )
        ) {
          clearInterval(
            editTimer
          );

          continueSave(
            editable,
            validButton
          );

          return;
        }


        /*
         * ========================================
         * BUSCAR BOTÓN EDITAR
         * ========================================
         */

        const editButton =
          wrapper.querySelector(
            ".ajax-profil_edit"
          );


        if (
          editButton &&
          !editClicked
        ) {
          editClicked = true;

          editButton.click();

          return;
        }


        /*
         * ========================================
         * FORZAR DETECCIÓN POR FOROACTIVO
         * ========================================
         *
         * Si todavía no existe .ajax-profil_edit,
         * simulamos interacción con el campo.
         */

        if (!editButton) {
          triggerEditDiscovery(
            wrapper
          );
        }


        /*
         * ========================================
         * TIMEOUT
         * ========================================
         */

        if (
          elapsed >=
          CONFIG.waitForEditableMs
        ) {
          clearInterval(
            editTimer
          );

          resolve({
            ok: false,
            key: field.key,
            message:
              `${label}: no se pudo activar la edición`
          });
        }

      }, CONFIG.pollMs);


    /*
     * ============================================
     * RELLENAR Y GUARDAR
     * ============================================
     */

    function continueSave(
      editable,
      validButton
    ) {
      const filled =
        fillEditable(
          editable,
          value,
          field
        );


      if (!filled) {
        resolve({
          ok: false,
          key: field.key,
          message:
            `${label}: no se pudo rellenar`
        });

        return;
      }


      /*
       * Guardamos el valor visible anterior
       * para poder comprobar si cambió.
       */

      const oldDisplay =
        getDisplay(
          wrapper
        );


      let finished =
        false;


      /*
       * ========================================
       * OBSERVAR GUARDADO
       * ========================================
       */

      const observer =
        new MutationObserver(() => {
          if (finished) {
            return;
          }


          const validNow =
            wrapper.querySelector(
              ".ajax-profil_valid"
            );


          const editableNow =
            wrapper.querySelector(
              ".field_editable:not(.invisible)"
            );


          const newDisplay =
            getDisplay(
              wrapper
            );


          const changed =
            newDisplay.html !==
              oldDisplay.html ||
            newDisplay.text !==
              oldDisplay.text;


          /*
           * Foroactivo normalmente:
           *
           * - oculta .field_editable
           * - vuelve a mostrar .field_uneditable
           * - elimina .ajax-profil_valid
           *
           * Cualquiera de estas señales nos sirve.
           */

          if (
            !validNow ||
            !editableNow ||
            changed
          ) {
            finished = true;

            observer.disconnect();

            resolve({
              ok: true,
              key: field.key,
              value,
              message:
                `${label}: guardado ✓`
            });
          }
        });


      observer.observe(
        wrapper,
        {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true
        }
      );


      /*
       * ========================================
       * VALIDAR
       * ========================================
       */

      validButton.click();


      /*
       * ========================================
       * FALLBACK DE CONFIRMACIÓN
       * ========================================
       */

      setTimeout(() => {
        if (finished) {
          return;
        }


        finished = true;

        observer.disconnect();


        const editableNow =
          wrapper.querySelector(
            ".field_editable:not(.invisible)"
          );


        const validNow =
          wrapper.querySelector(
            ".ajax-profil_valid"
          );


        const saved =
          !editableNow ||
          !validNow;


        resolve({
          ok: saved,
          key: field.key,
          value,

          message:
            saved
              ? `${label}: guardado ✓`
              : `${label}: no se confirmó el guardado`
        });

      }, CONFIG.saveTimeoutMs);
    }
  });
}

  async function updateProfile(
    profile,
    changes = []
  ) {
    const url =
      normalizeProfileURL(profile);

    if (!url) {
      throw new Error(
        "Perfil inválido."
      );
    }

    if (!changes.length) {
      return {
        url,
        results: []
      };
    }

    const iframe =
      getIframe();

    const doc =
      await loadIframe(
        iframe,
        url
      );

    await sleep(300);

    const results = [];

    /*
     * Importante:
     * los campos se guardan uno detrás
     * de otro, no simultáneamente.
     */
    for (const change of changes) {
      const result =
        await saveField(
          doc,
          change.field,
          change.value
        );

      results.push(result);

      await sleep(150);
    }

    return {
      url,
      results
    };
  }

  window.PixieProfile = {
    normalizeProfileURL,
    loadProfile,
    updateProfile,
    findFieldWrapper
  };
})();
