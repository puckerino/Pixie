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
     *
     * Lo mantenemos como fuente preferente porque
     * es el valor que participa en la edición AJAX.
     */
    const uneditable =
      wrapper.querySelector(".field_uneditable");

    if (uneditable) {
      return {
        html: uneditable.innerHTML.trim(),
        text: uneditable.textContent.trim()
      };
    }

    /*
     * 2. Spectra.
     *
     * Si estamos leyendo una versión ya procesada
     * por PixieFields/Spectra.
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
     * 3. Último fallback: data-value.
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

      if (!wrapper) {
        resolve({
          ok: false,
          key: field.key,
          message:
            `${label}: campo no encontrado`
        });

        return;
      }

      const editButton =
        wrapper.querySelector(
          ".ajax-profil_edit"
        );

      if (!editButton) {
        resolve({
          ok: false,
          key: field.key,
          message:
            `${label}: botón de edición no encontrado`
        });

        return;
      }

      editButton.click();

      let elapsed = 0;

      const timer = setInterval(() => {
        elapsed += CONFIG.pollMs;

        const editable =
          wrapper.querySelector(
            ".field_editable"
          );

        const validButton =
          wrapper.querySelector(
            ".ajax-profil_valid"
          );

        if (
          editable &&
          validButton
        ) {
          clearInterval(timer);

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

          let finished = false;

          const observer =
            new MutationObserver(() => {
              const valid =
                wrapper.querySelector(
                  ".ajax-profil_valid"
                );

              const visibleEditable =
                wrapper.querySelector(
                  ".field_editable:not(.invisible)"
                );

              if (
                !valid ||
                !visibleEditable
              ) {
                if (finished) return;

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

          validButton.click();

          setTimeout(() => {
            if (finished) return;

            finished = true;

            observer.disconnect();

            const stillEditing =
              wrapper.querySelector(
                ".field_editable:not(.invisible)"
              );

            resolve({
              ok: !stillEditing,
              key: field.key,
              value,

              message: stillEditing
                ? `${label}: no se confirmó el guardado`
                : `${label}: guardado ✓`
            });
          }, CONFIG.saveTimeoutMs);

          return;
        }

        if (
          elapsed >=
          CONFIG.waitForEditableMs
        ) {
          clearInterval(timer);

          resolve({
            ok: false,
            key: field.key,
            message:
              `${label}: no apareció el editor`
          });
        }
      }, CONFIG.pollMs);
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
