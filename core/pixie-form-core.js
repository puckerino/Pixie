/*!
 * PixieFormCore.js
 * Motor compartido para PixieForm y PixieReplyForm.
 *
 * Requiere:
 * - PixieKit
 *
 * Versión: 2.1.0
 */

(function (window, document) {
  "use strict";

  if (window.PixieFormCore) return;

  const PixieFormCore = {
    initGeneratedForm,
    parseHTML,
    getForumError,
    fetchHTML,
    getOfficialForm,
    buildOfficialFormData,
    getTopicUrl,
    escapeSelector
  };

  /**
   * Escapa un valor para utilizarlo en un selector CSS.
   */
  function escapeSelector(value) {
    const stringValue = String(value || "");

    if (
      window.CSS &&
      typeof window.CSS.escape === "function"
    ) {
      return window.CSS.escape(stringValue);
    }

    return stringValue.replace(
      /([ !"#$%&'()*+,./:;<=>?@[\]\\^`{|}~])/g,
      "\\$1"
    );
  }

  /**
   * Escapa contenido que se insertará dentro de HTML.
   */
  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Convierte una cadena HTML en un Document.
   */
  function parseHTML(html) {
    return new DOMParser().parseFromString(
      String(html || ""),
      "text/html"
    );
  }

  /**
   * Convierte un texto en formato título.
   */
  function capitalizeWords(value) {
    return String(value || "")
      .toLowerCase()
      .replace(
        /\b([a-záéíóúñü])/gi,
        function (letter) {
          return letter.toUpperCase();
        }
      );
  }

  /**
   * Busca un elemento mediante ID dentro de un contenedor.
   */
  function getById(root, id) {
    return root.querySelector(
      "#" + escapeSelector(id)
    );
  }

  /**
   * Convierte NodeList, HTMLCollection, etc. en Array.
   */
  function toArray(value) {
    return Array.from(value || []);
  }

  /**
   * Obtiene el contenido de una plantilla.
   */
  function getTemplateValue(template) {
    if (
      template instanceof HTMLInputElement ||
      template instanceof HTMLTextAreaElement
    ) {
      return String(template.value || "");
    }

    if (template instanceof HTMLTemplateElement) {
      return String(template.innerHTML || "");
    }

    return String(template.textContent || "");
  }

  /**
   * Busca un mensaje de error dentro del HTML de Foroactivo.
   */
  function getForumError(html) {
    const parsedDocument = parseHTML(html);

    const selectors = [
      ".message_die",
      ".block-error",
      ".panel.error",
      ".errorbox",
      ".error",
      ".main-content.error"
    ];

    for (const selector of selectors) {
      const errorElement =
        parsedDocument.querySelector(selector);

      const errorText = String(
        errorElement?.textContent || ""
      )
        .replace(/\s+/g, " ")
        .trim();

      if (errorText) {
        return errorText;
      }
    }

    return "";
  }

  /**
   * Realiza una petición y devuelve su HTML.
   */
  async function fetchHTML(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options
    });

    const html = await response.text();

    if (!response.ok) {
      throw new Error(
        getForumError(html) ||
        `Foroactivo devolvió el error ${response.status}.`
      );
    }

    return {
      response,
      html
    };
  }

  /**
   * Obtiene el formulario oficial de Foroactivo.
   *
   * Ejemplo:
   *
   * getOfficialForm({
   *   t: 123,
   *   mode: "reply"
   * });
   */
  async function getOfficialForm(params) {
    const url = new URL(
      "/post",
      window.location.origin
    );

    Object.entries(params).forEach(
      function ([key, value]) {
        url.searchParams.set(
          key,
          String(value)
        );
      }
    );

    const result = await fetchHTML(
      url.href,
      {
        method: "GET"
      }
    );

    const parsedDocument =
      parseHTML(result.html);

    const officialForm =
      parsedDocument.querySelector(
        [
          'form[name="post"]',
          'form[action*="/post"]'
        ].join(",")
      );

    if (!officialForm) {
      throw new Error(
        getForumError(result.html) ||
        "No se ha encontrado el formulario oficial de Foroactivo."
      );
    }

    return officialForm;
  }

  /**
   * Copia todos los campos oficiales y sustituye
   * únicamente los valores indicados.
   */
  function buildOfficialFormData(
    officialForm,
    replacements = {},
    deletions = []
  ) {
    const formData =
      new FormData(officialForm);

    Object.entries(replacements).forEach(
      function ([name, value]) {
        formData.set(
          name,
          String(value ?? "")
        );
      }
    );

    deletions.forEach(function (name) {
      formData.delete(name);
    });

    return formData;
  }

  /**
   * Intenta localizar la URL del tema después
   * de publicar una respuesta o crear un tema.
   */
  function getTopicUrl(
    response,
    html,
    topicId = null
  ) {
    const topicPattern = topicId
      ? new RegExp(
          "/t" + topicId + "(?:-|/|$)",
          "i"
        )
      : /\/t\d+(?:-|\/|$)/i;

    if (
      response?.url &&
      topicPattern.test(response.url)
    ) {
      return response.url;
    }

    const parsedDocument =
      parseHTML(html);

    /*
     * URL canónica.
     */

    const canonical = String(
      parsedDocument
        .querySelector(
          'link[rel="canonical"]'
        )
        ?.getAttribute("href") || ""
    );

    if (topicPattern.test(canonical)) {
      return new URL(
        canonical,
        window.location.origin
      ).href;
    }

    /*
     * Redirección mediante meta refresh.
     */

    const refresh = String(
      parsedDocument
        .querySelector(
          'meta[http-equiv="refresh" i]'
        )
        ?.getAttribute("content") || ""
    );

    const refreshMatch =
      refresh.match(
        /url\s*=\s*([^;]+)/i
      );

    if (
      refreshMatch &&
      topicPattern.test(refreshMatch[1])
    ) {
      return new URL(
        refreshMatch[1].replace(
          /^['"]|['"]$/g,
          ""
        ),
        window.location.origin
      ).href;
    }

    /*
     * Primer enlace que apunte a un tema.
     */

    const links =
      parsedDocument.querySelectorAll(
        'a[href*="/t"]'
      );

    for (const link of links) {
      const href = String(
        link.getAttribute("href") || ""
      );

      if (topicPattern.test(href)) {
        return new URL(
          href,
          window.location.origin
        ).href;
      }
    }

    return "";
  }

  /**
   * Inicializa el motor de plantillas,
   * filtros y repetidores de un formulario.
   */
  function initGeneratedForm(
    form,
    options = {}
  ) {
    if (!(form instanceof HTMLFormElement)) {
      return null;
    }

    const settings = {
      Pixie: null,

      readyAttribute:
        "data-pixie-form-core-ready",

      templatePrefix:
        "fa-template-",

      ...options
    };

    if (
      form.getAttribute(
        settings.readyAttribute
      ) === "true"
    ) {
      return null;
    }

    const formId = String(
      form.dataset.id || ""
    ).trim();

    if (!formId) {
      throw new Error(
        "Se ha encontrado un formulario sin data-id."
      );
    }

    const templateId =
      settings.templatePrefix + formId;

    const template =
      document.querySelector(
        "#" + escapeSelector(templateId)
      );

    if (!template) {
      throw new Error(
        `No se ha encontrado la plantilla #${templateId}.`
      );
    }

    form.setAttribute(
      settings.readyAttribute,
      "true"
    );

    /**
     * Convierte:
     *
     * item=label,cantidad=cantidad
     *
     * en:
     *
     * {
     *   item: "label",
     *   cantidad: "cantidad"
     * }
     */
    function parseAttrsFilter(value) {
      const output = {};

      String(value || "")
        .split(",")
        .map(function (part) {
          return part.trim();
        })
        .filter(Boolean)
        .forEach(function (part) {
          const equalsIndex =
            part.indexOf("=");

          if (equalsIndex === -1) {
            return;
          }

          const attribute = part
            .slice(0, equalsIndex)
            .trim();

          const source = part
            .slice(equalsIndex + 1)
            .trim();

          if (attribute && source) {
            output[attribute] = source;
          }
        });

      return output;
    }

    /**
     * Analiza una etiqueta de plantilla.
     *
     * Ejemplo:
     *
     * productos
     * | component:s-product
     * | attrs:item=label,cantidad=cantidad
     */
    function parseTag(tag) {
      const parts = String(tag || "")
        .split("|")
        .map(function (part) {
          return part.trim();
        })
        .filter(Boolean);

      const id = parts.shift() || "";

      let component = "";
      let attrs = null;
      let wrap = "";

      const filters = [];

      parts.forEach(function (part) {
        if (
          part.startsWith("component:")
        ) {
          component =
            part.slice(10).trim();

          return;
        }

        if (
          part.startsWith("attrs:")
        ) {
          attrs = parseAttrsFilter(
            part.slice(6)
          );

          return;
        }

        if (
          part.startsWith("wrap:")
        ) {
          wrap =
            part.slice(5).trim();

          return;
        }

        filters.push(part);
      });

      return {
        id,
        component,
        attrs,
        wrap,
        filters
      };
    }

    /**
     * Obtiene las entradas de un repetidor.
     */
    function getRepeatEntries(id) {
      const repeat = toArray(
        form.querySelectorAll(
          ".fa-repeat"
        )
      ).find(function (element) {
        return (
          element.dataset.repeat === id
        );
      });

      if (!repeat) {
        return null;
      }

      const entries = [];

      repeat
        .querySelectorAll(".fa-entry")
        .forEach(function (entry) {
          const label = String(
            entry.querySelector(
              ".fa-label"
            )?.value || ""
          ).trim();

          const value = String(
            entry.querySelector(
              ".fa-value"
            )?.value || ""
          ).trim();

          const cantidad = String(
            entry.querySelector(
              ".fa-cantidad"
            )?.value || ""
          ).trim();

          const text = String(
            entry.querySelector(
              ".fa-text"
            )?.value || ""
          ).trim();

          const extra = String(
            entry.querySelector(
              ".fa-extra"
            )?.value || ""
          ).trim();

          if (
            !label &&
            !value &&
            !cantidad &&
            !text &&
            !extra
          ) {
            return;
          }

          entries.push({
            label,
            value: value || label,
            cantidad,
            text,
            extra
          });
        });

      return entries;
    }

    /**
     * Obtiene el texto asociado a un control
     * mediante su label[for].
     */
    function getLabelForControl(control) {
      if (!control?.id) {
        return "";
      }

      return String(
        form.querySelector(
          'label[for="' +
            escapeSelector(control.id) +
          '"]'
        )?.textContent || ""
      ).trim();
    }

    /**
     * Obtiene los controles con un mismo name.
     */
    function getNamedControls(name) {
      return toArray(form.elements).filter(
        function (control) {
          return control.name === name;
        }
      );
    }

    /**
     * Obtiene el valor de un campo.
     */
    function getFieldData(
      id,
      useLabel
    ) {
      const repeatEntries =
        getRepeatEntries(id);

      if (repeatEntries !== null) {
        return repeatEntries;
      }

      const field =
        getById(form, id);

      if (!field) {
        return "";
      }

      const type = String(
        field.type || ""
      ).toLowerCase();

      /*
       * Radio.
       */

      if (type === "radio") {
        const controls = field.name
          ? getNamedControls(field.name)
          : [field];

        const checked =
          controls.find(
            function (control) {
              return control.checked;
            }
          );

        if (!checked) {
          return "";
        }

        return useLabel
          ? getLabelForControl(checked)
          : checked.value || "";
      }

      /*
       * Checkbox.
       *
       * Devuelve un array de objetos:
       *
       * {
       *   label: "Texto visible",
       *   value: "valor"
       * }
       *
       * Esto permite utilizar:
       *
       * {{checkbox|wrap:<li>{label}</li>}}
       * {{checkbox|component:s-tag}}
       */

      if (type === "checkbox") {
        const controls = field.name
          ? getNamedControls(field.name)
          : [field];

        return controls
          .filter(function (control) {
            return control.checked;
          })
          .map(function (control) {
            return {
              label:
                getLabelForControl(control),

              value: String(
                control.value || ""
              )
            };
          });
      }

      /*
       * Select.
       */

      if (
        field instanceof
        HTMLSelectElement
      ) {
        /*
         * Select múltiple.
         *
         * Devuelve la misma estructura que
         * los checkboxes y los repetidores:
         *
         * {
         *   label: "Texto visible",
         *   value: "valor"
         * }
         */

        if (field.multiple) {
          return toArray(
            field.selectedOptions
          ).map(function (option) {
            return {
              label: String(
                option.textContent || ""
              ).trim(),

              value: String(
                option.value || ""
              )
            };
          });
        }

        /*
         * Select simple.
         */

        if (useLabel) {
          return String(
            field.selectedOptions[0]
              ?.textContent || ""
          ).trim();
        }

        return field.value || "";
      }

      /*
       * Input o textarea.
       */

      return field.value || "";
    }

    /**
     * Aplica los filtros de la plantilla.
     */
    function applyFilters(
      value,
      filters
    ) {
      let result = value;

      filters.forEach(function (filter) {
        /*
         * label ya se procesa al leer el campo.
         */

        if (filter === "label") {
          return;
        }

        if (filter === "upper") {
          result = Array.isArray(result)
            ? result.map(
                function (item) {
                  return String(
                    item
                  ).toUpperCase();
                }
              )
            : String(
                result
              ).toUpperCase();

          return;
        }

        if (filter === "lower") {
          result = Array.isArray(result)
            ? result.map(
                function (item) {
                  return String(
                    item
                  ).toLowerCase();
                }
              )
            : String(
                result
              ).toLowerCase();

          return;
        }

        if (
          filter === "capitalizar"
        ) {
          result = Array.isArray(result)
            ? result.map(
                capitalizeWords
              )
            : capitalizeWords(result);

          return;
        }

        if (filter === "lines") {
          result = Array.isArray(result)
            ? result.join("\n")
            : String(result)
                .split(",")
                .map(function (item) {
                  return item.trim();
                })
                .filter(Boolean)
                .join("\n");

          return;
        }

        if (filter === "comma") {
          result = Array.isArray(result)
            ? result.join(", ")
            : result;

          return;
        }

        if (filter === "br") {
          result = String(
            result
          ).replace(
            /\r\n|\r|\n/g,
            "<br>"
          );
        }
      });

      if (Array.isArray(result)) {
        result = result.join(", ");
      }

      return String(
        result || ""
      ).trim();
    }

    /**
     * Genera los atributos de un componente.
     */
    function buildAttrs(
      item,
      attrsMap
    ) {
      const map = attrsMap || {
        item: "label",
        cantidad: "cantidad"
      };

      return Object.keys(map)
        .map(function (attribute) {
          const source =
            map[attribute];

          const value =
            item[source];

          if (
            value == null ||
            value === ""
          ) {
            return "";
          }

          return (
            attribute +
            '="' +
            escapeHTML(value) +
            '"'
          );
        })
        .filter(Boolean)
        .join(" ");
    }

    /**
     * Genera componentes personalizados.
     */
    function renderComponent(
      items,
      tag,
      attrs
    ) {
      if (
        !/^[a-z][a-z0-9-]*$/i.test(tag)
      ) {
        console.warn(
          "[PixieFormCore] Nombre de componente no válido:",
          tag
        );

        return "";
      }

      return items
        .map(function (item) {
          const attributes =
            buildAttrs(item, attrs);

          /*
           * attrs: vacío permite usar contenido interno.
           */

          if (
            attrs &&
            Object.keys(attrs).length === 0
          ) {
            return (
              "<" +
              tag +
              ">" +
              escapeHTML(
                item.label || ""
              ) +
              "</" +
              tag +
              ">"
            );
          }

          return (
            "<" +
            tag +
            (
              attributes
                ? " " + attributes
                : ""
            ) +
            "></" +
            tag +
            ">"
          );
        })
        .join("\n");
    }

    /**
     * Envuelve entradas usando una plantilla.
     *
     * Compatible con:
     *
     * - Repetidores
     * - Checkboxes
     * - Select multiple
     *
     * Ejemplo:
     *
     * {{campo|wrap:<li>{label}</li>}}
     */
    function renderWrap(
      items,
      wrapper
    ) {
      return items
        .map(function (item) {
          return wrapper.replace(
            /\{(label|value|cantidad|text|extra)\}/g,
            function (_, key) {
              return escapeHTML(
                item[key] || ""
              );
            }
          );
        })
        .join("\n");
    }

    /**
     * Genera el mensaje final.
     */
    function renderTemplate() {
      return getTemplateValue(template)
        .replace(
          /\{\{(.*?)\}\}/g,
          function (_, rawTag) {
            const parsedTag =
              parseTag(rawTag);

            if (!parsedTag.id) {
              return "";
            }

            const useLabel =
              parsedTag.filters.includes(
                "label"
              );

            let value =
              getFieldData(
                parsedTag.id,
                useLabel
              );

            /*
             * Arrays de objetos.
             *
             * Incluye:
             *
             * - Repetidores
             * - Checkboxes
             * - Select multiple
             */

            if (
              Array.isArray(value) &&
              value.length &&
              typeof value[0] === "object"
            ) {
              /*
               * Generar componentes.
               */

              if (
                parsedTag.component
              ) {
                return renderComponent(
                  value,
                  parsedTag.component,
                  parsedTag.attrs
                );
              }

              /*
               * Aplicar wrap: a cada elemento.
               */

              if (parsedTag.wrap) {
                return renderWrap(
                  value,
                  parsedTag.wrap
                );
              }

              /*
               * Convertir el array de objetos
               * en un array de textos para los
               * filtros normales.
               */

              value = value.map(
                function (item) {
                  return useLabel
                    ? (
                        item.label ||
                        item.value ||
                        ""
                      )
                    : (
                        item.value ||
                        item.label ||
                        ""
                      );
                }
              );
            }

            return applyFilters(
              value,
              parsedTag.filters
            );
          }
        )
        .trim();
    }

    /**
     * Crea una entrada repetible.
     */
    function createEntry(repeat) {
      const entryTemplate =
        repeat.querySelector(
          "template.fa-entry-template"
        );

      if (!entryTemplate) {
        return null;
      }

      const fragment =
        entryTemplate.content.cloneNode(
          true
        );

      if (
        fragment.children.length === 1
      ) {
        return fragment.firstElementChild;
      }

      const wrapper =
        document.createElement("div");

      wrapper.append(fragment);

      return wrapper;
    }

    /**
     * Vacía una entrada si es la última.
     */
    function resetEntry(entry) {
      entry
        .querySelectorAll(
          "input, textarea, select"
        )
        .forEach(function (control) {
          const type = String(
            control.type || ""
          ).toLowerCase();

          if (
            type === "checkbox" ||
            type === "radio"
          ) {
            control.checked = false;
            return;
          }

          if (
            control instanceof
            HTMLSelectElement
          ) {
            control.selectedIndex = 0;
            return;
          }

          control.value = "";
        });
    }

    /**
     * Inicializa los repetidores.
     */
    function bindRepeaters() {
      form.addEventListener(
        "click",
        function (event) {
          /*
           * Añadir entrada.
           */

          const addButton =
            event.target.closest(
              ".fa-add-entry"
            );

          if (
            addButton &&
            form.contains(addButton)
          ) {
            event.preventDefault();

            const target = String(
              addButton.dataset.target || ""
            ).trim();

            if (!target) {
              return;
            }

            const repeat = toArray(
              form.querySelectorAll(
                ".fa-repeat"
              )
            ).find(function (element) {
              return (
                element.dataset.repeat ===
                target
              );
            });

            const list =
              repeat?.querySelector(
                ".fa-repeat-list"
              );

            const newEntry =
              repeat
                ? createEntry(repeat)
                : null;

            if (
              !repeat ||
              !list ||
              !newEntry
            ) {
              console.warn(
                "[PixieFormCore] No se pudo crear la entrada:",
                target
              );

              return;
            }

            list.append(newEntry);

            if (
              typeof settings.Pixie
                ?.icons === "function"
            ) {
              settings.Pixie.icons();
            }

            document.dispatchEvent(
              new CustomEvent(
                "pixie:content-added",
                {
                  detail: {
                    element: newEntry
                  }
                }
              )
            );

            return;
          }

          /*
           * Eliminar entrada.
           */

          const removeButton =
            event.target.closest(
              ".fa-remove-entry"
            );

          if (
            !removeButton ||
            !form.contains(removeButton)
          ) {
            return;
          }

          event.preventDefault();

          const entry =
            removeButton.closest(
              ".fa-entry"
            );

          const repeat =
            removeButton.closest(
              ".fa-repeat"
            );

          if (!entry || !repeat) {
            return;
          }

          const entries =
            repeat.querySelectorAll(
              ".fa-entry"
            );

          if (entries.length > 1) {
            entry.remove();
            return;
          }

          resetEntry(entry);
        }
      );
    }

    bindRepeaters();

    return {
      form,
      formId,
      template,

      renderTemplate,

      getById: function (id) {
        return getById(form, id);
      },

      setSendingState:
        function (isSending) {
          form.classList.toggle(
            "is-sending",
            isSending
          );

          form
            .querySelectorAll(
              '[type="submit"]'
            )
            .forEach(function (button) {
              button.disabled =
                isSending;

              button.setAttribute(
                "aria-disabled",
                String(isSending)
              );
            });
        }
    };
  }

  window.PixieFormCore =
    PixieFormCore;
})(window, document);
