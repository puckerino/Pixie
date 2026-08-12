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


  /*
   * =========================================================
   * URL
   * =========================================================
   */

  function isFullURL(value) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }


  function normalizeProfileURL(value) {
    value =
      String(value || "").trim();

    if (!value) {
      return null;
    }

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
    const response =
      await fetch(url, {
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
    return new DOMParser()
      .parseFromString(
        html,
        "text/html"
      );
  }


  /*
   * =========================================================
   * LOCALIZAR CAMPO DE LECTURA
   * =========================================================
   *
   * En Spectra pueden existir dos elementos con el mismo ID:
   *
   * 1. Campo transformado:
   *
   *    <article
   *      id="field_id9"
   *      class="profile-field field-inventario"
   *      data-field="inventario"
   *      data-value="..."
   *    >
   *
   * 2. Campo editable nativo:
   *
   *    <article
   *      id="field_id9"
   *      class="profile-field popover-profile-field"
   *    >
   *
   * Para leer preferimos el primero.
   */

  function findReadField(
    doc,
    field
  ) {
    if (!doc || !field) {
      return null;
    }


    /*
     * 1. Campo transformado por Spectra.
     */

    if (field.field) {
      const bySpectraField =
        doc.querySelector(
          `.profile-field[data-field="${CSS.escape(
            String(field.field)
          )}"]`
        );

      if (bySpectraField) {
        return bySpectraField;
      }
    }


    /*
     * 2. Buscar por ID, evitando si es posible
     *    el campo del popover.
     */

    if (field.id) {
      const matches =
        doc.querySelectorAll(
          `#${CSS.escape(
            String(field.id)
          )}`
        );

      const normalField =
        Array.from(matches)
          .find(
            element =>
              !element.classList.contains(
                "popover-profile-field"
              )
          );

      if (normalField) {
        return normalField;
      }

      if (matches.length) {
        return matches[0];
      }
    }


    /*
     * 3. Foroactivo legacy.
     */

    if (
      field.forumField !== undefined &&
      field.forumField !== null
    ) {
      const legacy =
        doc.querySelector(
          `.campo_perfil[field="${CSS.escape(
            String(field.forumField)
          )}"]`
        );

      if (legacy) {
        return legacy;
      }
    }


    return null;
  }


  /*
   * =========================================================
   * LOCALIZAR CAMPO EDITABLE
   * =========================================================
   *
   * Para escribir queremos específicamente
   * el campo nativo del popover de Foroactivo.
   */

  function findEditableField(
    doc,
    field
  ) {
    if (!doc || !field) {
      return null;
    }


    /*
     * 1. Popover de perfil.
     */

    if (field.id) {
      const popoverField =
        doc.querySelector(
          `.popover-profile-field#${CSS.escape(
            String(field.id)
          )}`
        );

      if (popoverField) {
        return popoverField;
      }
    }


    /*
     * 2. ajax-profil_parent.
     *
     * Fallback para otros temas/versiones
     * de Foroactivo.
     */

    if (field.id) {
      const ajaxParent =
        doc.querySelector(
          `.ajax-profil_parent#${CSS.escape(
            String(field.id)
          )}`
        );

      if (ajaxParent) {
        return ajaxParent;
      }
    }


    /*
     * 3. Foroactivo legacy.
     */

    if (
      field.forumField !== undefined &&
      field.forumField !== null
    ) {
      const legacy =
        doc.querySelector(
          `.campo_perfil[field="${CSS.escape(
            String(field.forumField)
          )}"]`
        );

      if (legacy) {
        return legacy;
      }
    }


    return null;
  }


  /*
   * =========================================================
   * LEER VALOR
   * =========================================================
   */

  function getDisplay(wrapper) {
    if (!wrapper) {
      return {
        html: "",
        text: ""
      };
    }


    /*
     * 1. Campo nativo de Foroactivo.
     */

    const uneditable =
      wrapper.matches?.(
        ".field_uneditable"
      )
        ? wrapper
        : wrapper.querySelector(
            ".field_uneditable"
          );

    if (uneditable) {
      return {
        html:
          uneditable.innerHTML.trim(),

        text:
          uneditable.textContent.trim()
      };
    }


    /*
     * 2. Campo transformado por el foro/Spectra.
     */

    const valueElement =
      wrapper.querySelector(
        ".field-value"
      );

    if (valueElement) {
      return {
        html:
          valueElement.innerHTML.trim(),

        text:
          wrapper.getAttribute(
            "data-value"
          ) ??
          valueElement.textContent.trim()
      };
    }


    /*
     * 3. data-value.
     */

    if (
      wrapper.hasAttribute(
        "data-value"
      )
    ) {
      const value =
        wrapper.getAttribute(
          "data-value"
        ) || "";

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


  function defaultRead(
    display,
    field
  ) {
    if (
      field.type ===
      "number"
    ) {
      const clean =
        String(
          display.text || ""
        )
          .replace(
            /[^\d,.-]/g,
            ""
          )
          .replace(
            ",",
            "."
          );

      const number =
        Number(clean);

      return Number.isFinite(
        number
      )
        ? number
        : 0;
    }


    if (
      field.type ===
      "html"
    ) {
      return display.html;
    }


    return display.text;
  }


  function readValue(
    display,
    field
  ) {
    if (
      typeof field.read ===
      "function"
    ) {
      return field.read({
        html:
          display.html,

        text:
          display.text,

        field
      });
    }

    return defaultRead(
      display,
      field
    );
  }


  function serializeValue(
    value,
    field
  ) {
    if (
      typeof field.write ===
      "function"
    ) {
      return field.write(
        value,
        field
      );
    }

    if (
      value === undefined ||
      value === null
    ) {
      return "";
    }

    return String(value);
  }


  /*
   * =========================================================
   * CARGAR PERFIL PARA LECTURA
   * =========================================================
   */

  async function loadProfile(
    profile,
    fields = []
  ) {
    const url =
      normalizeProfileURL(
        profile
      );

    if (!url) {
      throw new Error(
        "No se ha indicado un perfil válido."
      );
    }


    const html =
      await fetchHTML(url);

    const doc =
      parseHTML(html);

    const values = {};


    fields.forEach(field => {
      /*
       * IMPORTANTE:
       *
       * Aquí usamos findReadField(),
       * no findEditableField().
       */
      const wrapper =
        findReadField(
          doc,
          field
        );


      if (!wrapper) {
        values[
          field.key
        ] = {
          found: false,
          value: null,
          html: "",
          text: ""
        };

        return;
      }


      const display =
        getDisplay(
          wrapper
        );


      values[
        field.key
      ] = {
        found: true,

        value:
          readValue(
            display,
            field
          ),

        html:
          display.html,

        text:
          display.text
      };
    });


    return {
      url,
      document: doc,
      values
    };
  }


  /*
   * =========================================================
   * IFRAME
   * =========================================================
   */

  function getIframe() {
    let iframe =
      document.querySelector(
        `iframe.${CONFIG.iframeClass}`
      );


    if (iframe) {
      return iframe;
    }


    iframe =
      document.createElement(
        "iframe"
      );


    iframe.className =
      CONFIG.iframeClass;


    iframe.title =
      "Pixie Profile";


    /*
     * No usamos hidden ni display:none.
     *
     * El iframe permanece renderizado para que
     * el JavaScript de Foroactivo pueda ejecutarse
     * normalmente.
     */

    iframe.style.position =
      "fixed";

    iframe.style.left =
      "-10000px";

    iframe.style.top =
      "0";

    iframe.style.width =
      "1200px";

    iframe.style.height =
      "900px";

    iframe.style.opacity =
      "0";

    iframe.style.pointerEvents =
      "none";

    iframe.style.border =
      "0";


    document.body.appendChild(
      iframe
    );


    return iframe;
  }


  function loadIframe(
    iframe,
    url
  ) {
    return new Promise(
      (resolve, reject) => {
        let finished =
          false;


        const timeout =
          setTimeout(() => {
            if (finished) {
              return;
            }

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
          if (finished) {
            return;
          }

          finished = true;

          clearTimeout(
            timeout
          );

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


        iframe.src =
          url;
      }
    );
  }


  /*
   * =========================================================
   * RELLENAR EDITOR
   * =========================================================
   */

  function fillEditable(
    editable,
    value,
    field
  ) {
    if (
      typeof field.fill ===
      "function"
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
      serializeValue(
        value,
        field
      );


    [
      "input",
      "change",
      "blur"
    ].forEach(type => {
      control.dispatchEvent(
        new Event(
          type,
          {
            bubbles: true
          }
        )
      );
    });


    return true;
  }


  /*
   * =========================================================
   * INTENTAR ACTIVAR EDICIÓN
   * =========================================================
   */

  function triggerEditDiscovery(
    wrapper
  ) {
    /*
     * El wrapper pertenece al documento
     * del iframe.
     *
     * Utilizamos su propia window para
     * construir los MouseEvent.
     */

    const win =
      wrapper.ownerDocument
        ?.defaultView ||
      window;


    const targets = [
      wrapper,
      wrapper.querySelector(
        ".field_uneditable"
      )
    ].filter(Boolean);


    targets.forEach(target => {
      [
        "mouseover",
        "mouseenter",
        "mousemove"
      ].forEach(type => {
        target.dispatchEvent(
          new win.MouseEvent(
            type,
            {
              bubbles: true,
              cancelable: true,
              view: win
            }
          )
        );
      });
    });
  }


  /*
   * =========================================================
   * GUARDAR UN CAMPO
   * =========================================================
   */

  function saveField(
    doc,
    field,
    value
  ) {
    return new Promise(resolve => {
      /*
       * IMPORTANTE:
       *
       * Aquí usamos findEditableField().
       */
      const wrapper =
        findEditableField(
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
            `${label}: campo editable no encontrado`
        });

        return;
      }


      /*
       * ============================================
       * ESPERAR AL MODO EDICIÓN
       * ============================================
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
           * Ya estamos en edición.
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
           * Buscar botón editar.
           */

          const editButton =
            wrapper.querySelector(
              ".ajax-profil_edit"
            );


          if (
            editButton &&
            !editClicked
          ) {
            editClicked =
              true;

            editButton.click();

            return;
          }


          /*
           * Intentar que Foroactivo active
           * los controles AJAX.
           */

          if (!editButton) {
            triggerEditDiscovery(
              wrapper
            );
          }


          /*
           * Timeout.
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
       * RELLENAR Y VALIDAR
       * ============================================
       */

      function continueSave(
        editable,
        validButton
      ) {
        const oldDisplay =
          getDisplay(
            wrapper
          );


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


        let finished =
          false;


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


            if (
              !validNow ||
              !editableNow ||
              changed
            ) {
              finished =
                true;

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
         * Guardar mediante Foroactivo.
         */

        validButton.click();


        /*
         * Fallback de confirmación.
         */

        setTimeout(() => {
          if (finished) {
            return;
          }


          finished =
            true;

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


  /*
   * =========================================================
   * ACTUALIZAR PERFIL
   * =========================================================
   */

  async function updateProfile(
    profile,
    changes = []
  ) {
    const url =
      normalizeProfileURL(
        profile
      );


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


    /*
     * Damos un pequeño margen para que
     * los scripts de Foroactivo inicialicen.
     */

    await sleep(300);


    const results = [];


    /*
     * Guardamos secuencialmente.
     *
     * Evitamos abrir varios editores AJAX
     * simultáneamente.
     */

    for (
      const change
      of changes
    ) {
      const result =
        await saveField(
          doc,
          change.field,
          change.value
        );

      results.push(
        result
      );

      await sleep(150);
    }


    return {
      url,
      results
    };
  }


  /*
   * =========================================================
   * API PÚBLICA
   * =========================================================
   */

  window.PixieProfile = {
    normalizeProfileURL,

    loadProfile,
    updateProfile,

    findReadField,
    findEditableField
  };

})();
