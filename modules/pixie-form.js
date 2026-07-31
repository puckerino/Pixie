/*!
 * PixieForm.js
 * Generador de temas para ForoActivo
 * Requiere: PixieKit y jQuery
 * Autor: Puck
 * Versión: 1.1.0
 */

(function (window, document, $) {
  "use strict";

  const MODULE_NAME = "PixieForm";
  const FORM_SELECTOR = ".fa-generated-form";
  const READY_ATTRIBUTE = "data-pixie-form-ready";

  /*
   * Dependencias
   */

  if (typeof window.PixieKit !== "function") {
    console.error(
      "[PixieForm] PixieKit no está disponible. " +
      "Comprueba que pixiekit.js se carga antes que pixie-form.js."
    );

    return;
  }

  if (!$) {
    console.error(
      "[PixieForm] jQuery no está disponible."
    );

    return;
  }

  /*
   * Registro del módulo
   */

  window.PixieForm = window.PixieKit(
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

      function parseHTML(html) {
        return new DOMParser().parseFromString(
          String(html || ""),
          "text/html"
        );
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
       * Escapa contenido insertado dentro
       * de atributos HTML generados.
       */

      function escapeAttr(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      }

      /*
       * Escapa un identificador utilizado
       * dentro de un selector CSS.
       */

      function escapeCssIdentifier(value) {
        const stringValue = String(value || "");

        if ($.escapeSelector) {
          return $.escapeSelector(
            stringValue
          );
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
         * también debe inicializarse.
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
         * Evita registrar los eventos
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
         * Solo se marca cuando el formulario
         * es válido y tiene plantilla.
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
               * attrs: vacío introduce el label
               * como contenido.
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
                 * Repetidores o grupos de checkbox.
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
         * Título
         */

        function getSubject() {
          const subjectField =
            String(
              $form.data(
                "subject-field"
              ) || ""
            ).trim();

          if (subjectField) {
            const $subjectInput =
              getFieldById(
                $form,
                subjectField
              );

            const subjectValue =
              String(
                $subjectInput.val() || ""
              ).trim();

            if (subjectValue) {
              return subjectValue;
            }
          }

          return (
            String(
              $form.data("titulo") || ""
            ).trim() ||
            "Nuevo tema"
          );
        }

        /*
         * ID del foro
         */

        function getForumId() {
          const forumField =
            String(
              $form.data(
                "forum-field"
              ) || ""
            ).trim();

          /*
           * Permite obtener el ID desde
           * un campo rellenable.
           */

          if (forumField) {
            const $forumInput =
              getFieldById(
                $form,
                forumField
              );

            const forumValue =
              String(
                $forumInput.val() || ""
              ).trim();

            if (forumValue) {
              return (
                parseInt(
                  forumValue,
                  10
                ) || 0
              );
            }
          }

          /*
           * Si no hay campo, utiliza data-foro.
           */

          return (
            parseInt(
              $form.data("foro"),
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

        function getOfficialTopicForm(
          forumId
        ) {
          return $.ajax({
            url: "/post",
            method: "GET",

            data: {
              f: forumId,
              mode: "newtopic"
            }
          }).then(function (html) {
            const parsedDocument =
              parseHTML(html);

            const officialForm =
              parsedDocument.querySelector(
                [
                  'form[name="post"]',
                  'form[action*="/post"]'
                ].join(",")
              );

            if (!officialForm) {
              const forumError =
                getForumError(html);

              throw new Error(
                forumError ||
                "No se ha encontrado el formulario oficial para crear el tema."
              );
            }

            return officialForm;
          });
        }

        /*
         * Prepara los campos oficiales
         * para la publicación.
         */

        function getOfficialFormData(
          officialForm,
          forumId,
          subject,
          message
        ) {
          const formData =
            $(officialForm)
              .serializeArray();

          /*
           * Se eliminan los valores que
           * sustituiremos manualmente.
           */

          const filteredData =
            formData.filter(
              function (field) {
                return ![
                  "f",
                  "subject",
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
              name: "f",
              value: String(forumId)
            },
            {
              name: "subject",
              value: subject
            },
            {
              name: "message",
              value: message
            },
            {
              name: "mode",
              value: "newtopic"
            },
            {
              name: "post",
              value: "1"
            }
          );

          return filteredData;
        }

        /*
         * Extrae posibles mensajes de error
         * devueltos por Foroactivo.
         */

        function getForumError(html) {
          const parsedDocument =
            parseHTML(html);

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
         * Obtiene la URL del tema creado.
         */

        function getCreatedTopicUrl(
          xhr,
          html
        ) {
          const responseUrl =
            String(
              xhr.responseURL || ""
            );

          /*
           * La propia petición terminó
           * en el nuevo tema.
           */

          if (
            /\/t\d+(?:-|\/|$)/i.test(
              responseUrl
            )
          ) {
            return responseUrl;
          }

          const parsedDocument =
            parseHTML(html);

          /*
           * URL canónica del tema.
           */

          const canonicalElement =
            parsedDocument.querySelector(
              'link[rel="canonical"]'
            );

          const canonicalUrl =
            canonicalElement
              ? String(
                  canonicalElement.getAttribute(
                    "href"
                  ) ||
                  canonicalElement.href ||
                  ""
                )
              : "";

          if (
            /\/t\d+(?:-|\/|$)/i.test(
              canonicalUrl
            )
          ) {
            return canonicalUrl;
          }

          /*
           * Redirección mediante meta refresh.
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

          const refreshMatch =
            refreshContent.match(
              /(?:url\s*=\s*)?([^;]*\/t\d+(?:-[^"'\s]*)?)/i
            );

          if (refreshMatch) {
            return refreshMatch[1]
              .trim()
              .replace(/^['"]|['"]$/g, "");
          }

          /*
           * Busca enlaces que parezcan apuntar
           * a un tema.
           */

          const topicLinks =
            parsedDocument.querySelectorAll(
              'a[href*="/t"]'
            );

          for (
            let index = 0;
            index <
            topicLinks.length;
            index += 1
          ) {
            const href = String(
              topicLinks[index].getAttribute(
                "href"
              ) || ""
            );

            if (
              /\/t\d+(?:-|\/|$)/i.test(
                href
              )
            ) {
              return href;
            }
          }

          return "";
        }

        /*
         * Comprueba si Foroactivo parece
         * haber aceptado la publicación.
         */

        function isSuccessfulTopicCreation(
          xhr,
          html
        ) {
          const createdTopicUrl =
            getCreatedTopicUrl(
              xhr,
              html
            );

          if (createdTopicUrl) {
            return true;
          }

          const parsedDocument =
            parseHTML(html);

          /*
           * Si el formulario de creación sigue
           * presente, normalmente hubo un error.
           */

          const topicForm =
            parsedDocument.querySelector(
              [
                'form[name="post"]',
                'form[action*="/post"]'
              ].join(",")
            );

          if (topicForm) {
            return false;
          }

          return false;
        }

        /*
         * Publicación utilizando
         * el formulario oficial.
         */

        async function publishTopic(
          forumId,
          subject,
          message
        ) {
          const officialForm =
            await getOfficialTopicForm(
              forumId
            );

          const requestData =
            getOfficialFormData(
              officialForm,
              forumId,
              subject,
              message
            );

          const action =
            officialForm.getAttribute(
              "action"
            ) || "/post";

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
         * Redirección
         */

        function redirectAfterPublish(
          forumId,
          createdTopicUrl
        ) {
          const redirectUrl =
            String(
              $form.data(
                "redirect"
              ) || ""
            ).trim();

          /*
           * Si está dentro de un iframe,
           * recarga la ventana principal.
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
           * Si Foroactivo devolvió la URL
           * del tema, se utiliza.
           */

          if (createdTopicUrl) {
            window.location.href =
              createdTopicUrl;

            return;
          }

          /*
           * Último recurso: vuelve al foro.
           */

          window.location.href =
            "/f" + forumId + "-";
        }

        /*
         * Añadir entrada repetible
         */

        $form.on(
          "click.PixieForm",
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
             * Actualiza posibles iconos Lucide.
             */

            if (
              typeof Pixie.icons ===
              "function"
            ) {
              Pixie.icons();
            }

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
          "click.PixieForm",
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
          "submit.PixieForm",
          async function (event) {
            event.preventDefault();

            if (enviando) {
              return;
            }

            const message =
              renderTemplate();

            const subject =
              getSubject();

            const forumId =
              getForumId();

            if (!message) {
              window.alert(
                "El mensaje está vacío."
              );

              return;
            }

            if (!subject) {
              window.alert(
                "El título está vacío."
              );

              return;
            }

            if (!forumId) {
              window.alert(
                "Falta el ID del foro."
              );

              return;
            }

            setSendingState(true);

            try {
              /*
               * Recupera el formulario oficial,
               * copia sus tokens y publica.
               */

              const result =
                await publishTopic(
                  forumId,
                  subject,
                  message
                );

              /*
               * Un estado HTTP 200 no confirma
               * por sí solo que el tema se creara.
               */

              if (
                !isSuccessfulTopicCreation(
                  result.xhr,
                  result.html
                )
              ) {
                const forumError =
                  getForumError(
                    result.html
                  );

                throw new Error(
                  forumError ||
                  "Foroactivo no ha confirmado la creación del tema."
                );
              }

              const createdTopicUrl =
                getCreatedTopicUrl(
                  result.xhr,
                  result.html
                );

              window.alert(
                "Tema publicado."
              );

              redirectAfterPublish(
                forumId,
                createdTopicUrl
              );
            } catch (error) {
              setSendingState(false);

              warn(
                "No se ha podido publicar el tema.",
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
                "No se ha podido publicar el tema."
              );
            }
          }
        );

        /*
         * Evento al completar la inicialización
         */

        $form.trigger(
          "pixie:form-ready",
          [module]
        );

        log(
          "Formulario inicializado.",
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
