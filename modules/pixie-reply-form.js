/*!
 * PixieReplyForm.js
 * Generador de respuestas para temas de ForoActivo
 * Requiere: PixieKit y jQuery
 * Autor: Puck
 * Versión: 1.1.0
 */

(function (window, document, $) {
  "use strict";

  const MODULE_NAME = "PixieReplyForm";
  const FORM_SELECTOR = ".fa-generated-reply-form";
  const READY_ATTRIBUTE = "data-pixie-reply-form-ready";

  /*
   * Dependencias
   */

  if (typeof window.PixieKit !== "function") {
    console.error(
      "[PixieReplyForm] PixieKit no está disponible. " +
      "Comprueba que pixiekit.js se carga antes que pixie-reply-form.js."
    );

    return;
  }

  if (!$) {
    console.error(
      "[PixieReplyForm] jQuery no está disponible."
    );

    return;
  }

  /*
   * Registro del módulo
   */

  window.PixieReplyForm = window.PixieKit(
    MODULE_NAME,
    function (Pixie) {
      const module = {
        init,
        refresh: init,
        initForm
      };

      /*
       * Utilidades generales
       */

      function log(message, data) {
        Pixie.log(message, data);
      }

      function warn(message, data) {
        if (data !== undefined) {
          console.warn(
            `[${MODULE_NAME}] ${message}`,
            data
          );
        } else {
          console.warn(
            `[${MODULE_NAME}] ${message}`
          );
        }
      }

      function capitalizeWords(value) {
        return String(value || "")
          .toLowerCase()
          .replace(
            /\b([a-záéíóúñü])/gi,
            function (match) {
              return match.toUpperCase();
            }
          );
      }

      /*
       * Escapa texto que se insertará
       * dentro de un atributo HTML.
       */

      function escapeAttr(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      }

      /*
       * Escapa identificadores CSS.
       */

      function escapeCssIdentifier(value) {
        const stringValue = String(value || "");

        if ($.escapeSelector) {
          return $.escapeSelector(stringValue);
        }

        return stringValue.replace(
          /([ !"#$%&'()*+,./:;<=>?@[\]\\^`{|}~])/g,
          "\\$1"
        );
      }

      /*
       * Escapa valores utilizados dentro
       * de selectores de atributo.
       */

      function escapeCssString(value) {
        return String(value || "")
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"');
      }

      /*
       * Obtiene un campo por ID
       * dentro del formulario.
       */

      function getFieldById($form, id) {
        return $form.find(
          "#" + escapeCssIdentifier(id)
        );
      }

      /*
       * Inicialización
       */

      function init(context) {
        const root = context || document;
        const forms = [];

        /*
         * Si el contexto es el propio formulario,
         * también se inicializa.
         */

        if (
          root.nodeType === 1 &&
          typeof root.matches === "function" &&
          root.matches(FORM_SELECTOR)
        ) {
          forms.push(root);
        }

        Pixie.getAll(
          FORM_SELECTOR,
          root
        ).forEach(function (form) {
          if (!forms.includes(form)) {
            forms.push(form);
          }
        });

        forms.forEach(initForm);

        return module;
      }

      /*
       * Inicialización de un formulario
       */

      function initForm(formElement) {
        if (!formElement) {
          return;
        }

        const $form = $(formElement);

        /*
         * Evita inicializar el mismo formulario
         * más de una vez.
         */

        if (
          $form.attr(READY_ATTRIBUTE) === "true"
        ) {
          return;
        }

        const formId = String(
          $form.data("id") || ""
        ).trim();

        if (!formId) {
          warn(
            "Se ha encontrado un formulario sin data-id.",
            formElement
          );

          return;
        }

        const templateSelector =
          "#fa-template-" +
          escapeCssIdentifier(formId);

        const $template = $(templateSelector);

        if (!$template.length) {
          warn(
            "Plantilla no encontrada.",
            formId
          );

          return;
        }

        /*
         * El formulario solo se marca cuando
         * todas las comprobaciones han pasado.
         */

        $form.attr(
          READY_ATTRIBUTE,
          "true"
        );

        let enviando = false;

        /*
         * Procesamiento de etiquetas
         */

        function parseAttrsFilter(value) {
          const output = {};

          String(value || "")
            .split(",")
            .map(function (part) {
              return $.trim(part);
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

        function parseTag(tag) {
          const parts = String(tag || "")
            .split("|")
            .map(function (part) {
              return $.trim(part);
            })
            .filter(Boolean);

          const id = parts.shift() || "";

          let component = "";
          let attrs = null;
          let wrap = "";

          const filters = [];

          parts.forEach(function (part) {
            if (
              part.indexOf("component:") === 0
            ) {
              component = part
                .slice(10)
                .trim();

              return;
            }

            if (
              part.indexOf("attrs:") === 0
            ) {
              attrs = parseAttrsFilter(
                part.slice(6)
              );

              return;
            }

            if (
              part.indexOf("wrap:") === 0
            ) {
              wrap = part
                .slice(5)
                .trim();

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

        /*
         * Campos repetibles
         */

        function getRepeatEntries(id) {
          const selector =
            '.fa-repeat[data-repeat="' +
            escapeCssString(id) +
            '"]';

          const $repeat =
            $form.find(selector);

          if (!$repeat.length) {
            return null;
          }

          const entries = [];

          $repeat
            .find(".fa-entry")
            .each(function () {
              const $entry = $(this);

              const label = String(
                $entry
                  .find(".fa-label")
                  .val() || ""
              ).trim();

              const value = String(
                $entry
                  .find(".fa-value")
                  .val() || ""
              ).trim();

              const cantidad = String(
                $entry
                  .find(".fa-cantidad")
                  .val() || ""
              ).trim();

              const text = String(
                $entry
                  .find(".fa-text")
                  .val() || ""
              ).trim();

              const extra = String(
                $entry
                  .find(".fa-extra")
                  .val() || ""
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

        /*
         * Lectura de campos
         */

        function getFieldData(
          id,
          useLabel
        ) {
          const repeatEntries =
            getRepeatEntries(id);

          /*
           * Un repetidor vacío devuelve [].
           * Por eso se comprueba contra null.
           */

          if (repeatEntries !== null) {
            return repeatEntries;
          }

          const $field =
            getFieldById(
              $form,
              id
            );

          if (!$field.length) {
            return "";
          }

          const type = String(
            $field.attr("type") || ""
          ).toLowerCase();

          const tagName = String(
            $field.prop("tagName") || ""
          ).toLowerCase();

          /*
           * Radio
           */

          if (type === "radio") {
            const name = String(
              $field.attr("name") || ""
            );

            if (!name) {
              return "";
            }

            const $checked =
              $form.find(
                '[name="' +
                escapeCssString(name) +
                '"]:checked'
              );

            if (!$checked.length) {
              return "";
            }

            if (useLabel) {
              const checkedId =
                $checked.attr("id");

              if (!checkedId) {
                return "";
              }

              return $form
                .find(
                  'label[for="' +
                  escapeCssString(
                    checkedId
                  ) +
                  '"]'
                )
                .first()
                .text()
                .trim();
            }

            return $checked.val() || "";
          }

          /*
           * Checkbox
           */

          if (type === "checkbox") {
            const name = String(
              $field.attr("name") || ""
            );

            const $checked = name
              ? $form.find(
                  'input[name="' +
                  escapeCssString(name) +
                  '"]:checked'
                )
              : $field.filter(":checked");

            if (!$checked.length) {
              return [];
            }

            return $checked
              .map(function () {
                const inputId =
                  this.id || "";

                const label = inputId
                  ? $form
                      .find(
                        'label[for="' +
                        escapeCssString(
                          inputId
                        ) +
                        '"]'
                      )
                      .first()
                      .text()
                      .trim()
                  : "";

                return {
                  label,
                  value:
                    $(this).val() || ""
                };
              })
              .get();
          }

          /*
           * Select
           */

          if (tagName === "select") {
            if (useLabel) {
              return $field
                .find("option:selected")
                .text()
                .trim();
            }

            return $field.val() || "";
          }

          /*
           * Input o textarea
           */

          return $field.val() || "";
        }

        /*
         * Filtros
         */

        function applyFilters(
          value,
          filters
        ) {
          let result = value;

          filters.forEach(function (filter) {
            /*
             * label se procesa al leer el campo.
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

        /*
         * Componentes y wrappers
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
                escapeAttr(value) +
                '"'
              );
            })
            .filter(Boolean)
            .join(" ");
        }

        function renderComponent(
          items,
          tag,
          attrs
        ) {
          /*
           * Evita generar nombres
           * de etiqueta inválidos.
           */

          if (
            !/^[a-z][a-z0-9-]*$/i.test(tag)
          ) {
            warn(
              "Nombre de componente no válido.",
              tag
            );

            return "";
          }

          return items
            .map(function (item) {
              const attributes =
                buildAttrs(
                  item,
                  attrs
                );

              /*
               * attrs: vacío usa el label
               * como contenido del componente.
               */

              if (
                attrs &&
                Object.keys(attrs)
                  .length === 0
              ) {
                return (
                  "<" +
                  tag +
                  ">" +
                  escapeAttr(
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

        function renderWrap(
          items,
          wrapper
        ) {
          return items
            .map(function (item) {
              return wrapper.replace(
                /\{(label|value|cantidad|text|extra)\}/g,
                function (_, key) {
                  return escapeAttr(
                    item[key] || ""
                  );
                }
              );
            })
            .join("\n");
        }

        /*
         * Lectura de la plantilla
         */

        function getTemplateValue() {
          if (
            $template.is(
              "textarea, input"
            )
          ) {
            return String(
              $template.val() || ""
            );
          }

          if (
            $template.is("template")
          ) {
            return String(
              $template.html() || ""
            );
          }

          return String(
            $template.text() || ""
          );
        }

        /*
         * Renderizado final
         */

        function renderTemplate() {
          const templateValue =
            getTemplateValue();

          return templateValue
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
                 * Repetidores o checkboxes.
                 */

                if (
                  Array.isArray(value) &&
                  value.length &&
                  typeof value[0] ===
                    "object"
                ) {
                  if (
                    parsedTag.component
                  ) {
                    return renderComponent(
                      value,
                      parsedTag.component,
                      parsedTag.attrs
                    );
                  }

                  if (parsedTag.wrap) {
                    return renderWrap(
                      value,
                      parsedTag.wrap
                    );
                  }

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

        /*
         * ID del tema
         */

        function getTopicId() {
          const topicField =
            String(
              $form.data(
                "topic-field"
              ) || ""
            ).trim();

          /*
           * Permite obtener el ID
           * desde un campo del formulario.
           */

          if (topicField) {
            const $topicInput =
              getFieldById(
                $form,
                topicField
              );

            const topicValue =
              String(
                $topicInput.val() || ""
              ).trim();

            if (topicValue) {
              return (
                parseInt(
                  topicValue,
                  10
                ) || 0
              );
            }
          }

          /*
           * Si no hay campo, utiliza data-topic.
           */

          return (
            parseInt(
              $form.data("topic"),
              10
            ) || 0
          );
        }

        /*
         * Entradas repetibles
         */

        function createEntry($repeat) {
          const $entryTemplate =
            $repeat
              .find(
                "template.fa-entry-template"
              )
              .first();

          if (!$entryTemplate.length) {
            return null;
          }

          const template =
            $entryTemplate.html();

          if (!template) {
            return null;
          }

          return $(template.trim());
        }

        function resetEntry($entry) {
          $entry
            .find(
              "input, textarea, select"
            )
            .each(function () {
              const $control =
                $(this);

              const type = String(
                $control.attr(
                  "type"
                ) || ""
              ).toLowerCase();

              if (
                type === "checkbox" ||
                type === "radio"
              ) {
                $control.prop(
                  "checked",
                  false
                );

                return;
              }

              if (
                $control.is("select")
              ) {
                this.selectedIndex = 0;
                return;
              }

              $control.val("");
            });
        }

        /*
         * Estado de envío
         */

        function setSendingState(
          isSending
        ) {
          enviando = isSending;

          $form.toggleClass(
            "is-sending",
            isSending
          );

          $form
            .find(
              '[type="submit"]'
            )
            .prop(
              "disabled",
              isSending
            )
            .attr(
              "aria-disabled",
              String(isSending)
            );
        }

        /*
         * Formulario oficial de Foroactivo
         */

function getOfficialReplyForm(topicId) {
  return $.ajax({
    url: "/post",
    method: "GET",

    data: {
      t: topicId,
      mode: "reply"
    }
  }).then(function (html) {
    const parsedDocument =
      Pixie.parseHTML(html);

    const officialForm =
      parsedDocument.querySelector(
        [
          'form[name="post"]',
          'form[action*="/post"]'
        ].join(",")
      );

    if (!officialForm) {
      const error =
        getForumError(html);

      throw new Error(
        error ||
        "No se ha encontrado el formulario oficial de respuesta."
      );
    }

    /*
     * Se devuelve dentro de un objeto para evitar
     * que jQuery altere el valor al resolver la promesa.
     */

    return {
      form: officialForm,
      html: html
    };
  });
}

        /*
         * Prepara los campos oficiales para enviar.
         */

        function getOfficialFormData(
          officialForm,
          topicId,
          message
        ) {
          const formData =
            $(officialForm)
              .serializeArray();

          /*
           * Se eliminan los campos que
           * sustituiremos manualmente.
           */

          const filteredData =
            formData.filter(
              function (field) {
                return ![
                  "t",
                  "message",
                  "mode",
                  "post",
                  "preview"
                ].includes(
                  field.name
                );
              }
            );

          filteredData.push(
            {
              name: "t",
              value: String(topicId)
            },
            {
              name: "message",
              value: message
            },
            {
              name: "mode",
              value: "reply"
            },
            {
              name: "post",
              value: "1"
            }
          );

          return filteredData;
        }

        /*
         * Extrae posibles errores devueltos
         * por Foroactivo.
         */

        function getForumError(html) {
          const parsedDocument =
            Pixie.parseHTML(html);

          const errorSelectors = [
            ".message_die",
            ".block-error",
            ".panel.error",
            ".errorbox",
            ".error",
            ".main-content.error"
          ];

          for (
            let index = 0;
            index <
            errorSelectors.length;
            index += 1
          ) {
            const errorElement =
              parsedDocument.querySelector(
                errorSelectors[index]
              );

            if (!errorElement) {
              continue;
            }

            const errorText =
              String(
                errorElement.textContent ||
                ""
              )
                .replace(/\s+/g, " ")
                .trim();

            if (errorText) {
              return errorText;
            }
          }

          return "";
        }

        /*
         * Comprueba si la respuesta se publicó.
         */

        function isSuccessfulReply(
          xhr,
          html,
          topicId
        ) {
          const responseUrl = String(
            xhr.responseURL || ""
          );

          const topicPattern =
            new RegExp(
              "/t" +
              topicId +
              "(?:-|/|$)",
              "i"
            );

          /*
           * La petición terminó en la URL
           * del tema.
           */

          if (
            topicPattern.test(
              responseUrl
            )
          ) {
            return true;
          }

          const parsedDocument =
            Pixie.parseHTML(html);

          /*
           * Comprueba la URL canónica.
           */

          const canonicalElement =
            parsedDocument.querySelector(
              'link[rel="canonical"]'
            );

          const canonicalUrl =
            canonicalElement
              ? String(
                  canonicalElement.href ||
                  canonicalElement.getAttribute(
                    "href"
                  ) ||
                  ""
                )
              : "";

          if (
            topicPattern.test(
              canonicalUrl
            )
          ) {
            return true;
          }

          /*
           * Comprueba posibles redirecciones
           * introducidas en el HTML.
           */

          const refreshElement =
            parsedDocument.querySelector(
              'meta[http-equiv="refresh" i]'
            );

          const refreshContent =
            refreshElement
              ? String(
                  refreshElement.getAttribute(
                    "content"
                  ) || ""
                )
              : "";

          if (
            topicPattern.test(
              refreshContent
            )
          ) {
            return true;
          }

          /*
           * Comprueba si sigue mostrando
           * el formulario de respuesta.
           *
           * Si sigue presente, normalmente
           * la publicación no fue aceptada.
           */

          const replyForm =
            parsedDocument.querySelector(
              [
                'form[name="post"]',
                'form[action*="/post"]'
              ].join(",")
            );

          if (replyForm) {
            return false;
          }

          /*
           * Como última comprobación,
           * busca enlaces al tema.
           */

          const topicLink =
            parsedDocument.querySelector(
              [
                'a[href^="/t' +
                  topicId +
                  '-"]',
                'a[href^="/t' +
                  topicId +
                  '/"]',
                'a[href*="/t' +
                  topicId +
                  '-"]'
              ].join(",")
            );

          return Boolean(topicLink);
        }

        /*
         * Publica la respuesta utilizando
         * el formulario oficial.
         */

async function publishReply(
  topicId,
  message
) {
  const officialResult =
    await getOfficialReplyForm(
      topicId
    );

  const officialForm =
    officialResult.form;

  /*
   * Comprobación defensiva para asegurarnos
   * de que realmente hemos recibido un formulario.
   */

  if (
    !officialForm ||
    officialForm.nodeType !== 1 ||
    String(
      officialForm.tagName || ""
    ).toLowerCase() !== "form"
  ) {
    throw new Error(
      "El formulario oficial recibido no es válido."
    );
  }

  const requestData =
    getOfficialFormData(
      officialForm,
      topicId,
      message
    );

  /*
   * Se usa jQuery para leer action.
   * Es más resistente a posibles propiedades
   * internas del formulario que sobrescriban métodos.
   */

  const action =
    String(
      $(officialForm).attr("action") ||
      "/post"
    ).trim();

  return new Promise(
    function (
      resolve,
      reject
    ) {
      $.ajax({
        url: action,
        method: "POST",
        data: requestData
      })
        .done(function (
          html,
          textStatus,
          xhr
        ) {
          resolve({
            html,
            xhr
          });
        })
        .fail(function (xhr) {
          reject(xhr);
        });
    }
  );
}

        /*
         * Redirección después de publicar
         */

        function redirectAfterPublish(
          topicId
        ) {
          const redirectUrl =
            String(
              $form.data(
                "redirect"
              ) || ""
            ).trim();

          /*
           * Formulario dentro de iframe.
           */

          if (
            window.self !==
            window.top
          ) {
            window.parent.location.reload();
            return;
          }

          /*
           * Redirección personalizada.
           */

          if (redirectUrl) {
            window.location.href =
              redirectUrl;

            return;
          }

          /*
           * Tema publicado.
           */

          window.location.href =
            "/t" + topicId + "-";
        }

        /*
         * Añadir entrada repetible
         */

        $form.on(
          "click.PixieReplyForm",
          ".fa-add-entry",
          function (event) {
            event.preventDefault();

            const target = String(
              $(this).data(
                "target"
              ) || ""
            ).trim();

            if (!target) {
              return;
            }

            const selector =
              '.fa-repeat[data-repeat="' +
              escapeCssString(target) +
              '"]';

            const $repeat =
              $form.find(selector);

            if (!$repeat.length) {
              warn(
                "No se encontró el repetidor.",
                target
              );

              return;
            }

            const $newEntry =
              createEntry($repeat);

            if (
              !$newEntry ||
              !$newEntry.length
            ) {
              warn(
                "No se encontró la plantilla del repetidor.",
                target
              );

              return;
            }

            const $list =
              $repeat
                .find(
                  ".fa-repeat-list"
                )
                .first();

            if (!$list.length) {
              warn(
                "No se encontró .fa-repeat-list.",
                target
              );

              return;
            }

            $list.append(
              $newEntry
            );

            /*
             * Inicializa posibles iconos Lucide.
             */

            Pixie.icons();

            /*
             * Permite que otros módulos procesen
             * el contenido añadido.
             */

            $(document).trigger(
              "pixie:content-added",
              [$newEntry.get(0)]
            );
          }
        );

        /*
         * Eliminar entrada repetible
         */

        $form.on(
          "click.PixieReplyForm",
          ".fa-remove-entry",
          function (event) {
            event.preventDefault();

            const $button =
              $(this);

            const $entry =
              $button.closest(
                ".fa-entry"
              );

            const $repeat =
              $button.closest(
                ".fa-repeat"
              );

            if (
              !$entry.length ||
              !$repeat.length
            ) {
              return;
            }

            const $entries =
              $repeat.find(
                ".fa-entry"
              );

            if (
              $entries.length > 1
            ) {
              $entry.remove();
              return;
            }

            resetEntry($entry);
          }
        );

        /*
         * Envío
         */

        $form.on(
          "submit.PixieReplyForm",
          async function (event) {
            event.preventDefault();

            if (enviando) {
              return;
            }

            const message =
              renderTemplate();

            const topicId =
              getTopicId();

            if (!message) {
              window.alert(
                "El mensaje está vacío."
              );

              return;
            }

            if (!topicId) {
              window.alert(
                "Falta el ID del tema."
              );

              return;
            }

            setSendingState(true);

            try {
              /*
               * Recupera el formulario oficial,
               * obtiene sus tokens y publica.
               */

              const result =
                await publishReply(
                  topicId,
                  message
                );

              /*
               * Un estado HTTP 200 no confirma
               * por sí solo la publicación.
               */

              if (
                !isSuccessfulReply(
                  result.xhr,
                  result.html,
                  topicId
                )
              ) {
                const forumError =
                  getForumError(
                    result.html
                  );

                throw new Error(
                  forumError ||
                  "Foroactivo no ha confirmado la publicación."
                );
              }

              window.alert(
                "Respuesta publicada."
              );

              redirectAfterPublish(
                topicId
              );
            } catch (error) {
              setSendingState(false);

              warn(
                "No se ha podido publicar la respuesta.",
                error
              );

              /*
               * Una petición AJAX fallida puede
               * no ser un Error convencional.
               */

              const responseHtml =
                error &&
                error.responseText
                  ? error.responseText
                  : "";

              const forumError =
                responseHtml
                  ? getForumError(
                      responseHtml
                    )
                  : "";

              window.alert(
                forumError ||
                error?.message ||
                "No se ha podido publicar la respuesta."
              );
            }
          }
        );

        /*
         * Evento al terminar la inicialización
         */

        $form.trigger(
          "pixie:reply-form-ready",
          [module]
        );

        log(
          "Formulario de respuesta inicializado.",
          formId
        );
      }

      /*
       * Inicialización inicial
       */

      Pixie.ready(function () {
        module.init();
      });

      return module;
    }
  );

})(window, document, window.jQuery);
