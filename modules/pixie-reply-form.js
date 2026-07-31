/*!
 * PixieReplyForm.js
 * Publicación de respuestas mediante el formulario oficial de Foroactivo.
 *
 * Requiere:
 * - PixieKit
 * - PixieFormCore
 *
 * Versión: 2.0.0
 */

(function (window, document) {
  "use strict";

  const MODULE_NAME =
    "PixieReplyForm";

  const FORM_SELECTOR =
    ".fa-generated-reply-form";

  const READY_ATTRIBUTE =
    "data-pixie-reply-form-ready";

  if (
    typeof window.PixieKit !==
    "function"
  ) {
    console.error(
      "[PixieReplyForm] PixieKit no está disponible."
    );

    return;
  }

  if (!window.PixieFormCore) {
    console.error(
      "[PixieReplyForm] PixieFormCore no está disponible."
    );

    return;
  }

  window.PixieReplyForm =
    window.PixieKit(
      MODULE_NAME,
      function (Pixie) {
        const Core =
          window.PixieFormCore;

        const module = {
          init,
          refresh: init,
          initForm
        };

        function log(
          message,
          data
        ) {
          if (
            typeof Pixie.log ===
            "function"
          ) {
            Pixie.log(
              message,
              data
            );

            return;
          }

          if (data !== undefined) {
            console.log(
              `[${MODULE_NAME}] ${message}`,
              data
            );
          } else {
            console.log(
              `[${MODULE_NAME}] ${message}`
            );
          }
        }

        function warn(
          message,
          data
        ) {
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

        /**
         * Inicializa todos los formularios.
         */
        function init(
          context = document
        ) {
          const forms = [];

          if (
            context instanceof Element &&
            context.matches(
              FORM_SELECTOR
            )
          ) {
            forms.push(context);
          }

          if (
            context === document ||
            context instanceof Element ||
            context instanceof
              DocumentFragment
          ) {
            context
              .querySelectorAll(
                FORM_SELECTOR
              )
              .forEach(
                function (form) {
                  if (
                    !forms.includes(form)
                  ) {
                    forms.push(form);
                  }
                }
              );
          }

          forms.forEach(initForm);

          return module;
        }

        /**
         * Inicializa un formulario.
         */
        function initForm(form) {
          if (
            !(
              form instanceof
              HTMLFormElement
            )
          ) {
            return;
          }

          if (
            form.getAttribute(
              READY_ATTRIBUTE
            ) === "true"
          ) {
            return;
          }

          let controller;

          try {
            controller =
              Core.initGeneratedForm(
                form,
                {
                  Pixie,
                  readyAttribute:
                    READY_ATTRIBUTE
                }
              );
          } catch (error) {
            warn(
              error instanceof Error
                ? error.message
                : "No se pudo inicializar el formulario.",
              form
            );

            return;
          }

          if (!controller) {
            return;
          }

          let sending = false;

          /**
           * Obtiene el ID del tema.
           */
          function getTopicId() {
            const topicField =
              String(
                form.dataset
                  .topicField || ""
              ).trim();

            if (topicField) {
              const input =
                controller.getById(
                  topicField
                );

              const value =
                String(
                  input?.value || ""
                ).trim();

              if (value) {
                return (
                  Number.parseInt(
                    value,
                    10
                  ) || 0
                );
              }
            }

            return (
              Number.parseInt(
                form.dataset.topic,
                10
              ) || 0
            );
          }

          /**
           * Publica la respuesta.
           */
          async function publishReply(
            topicId,
            message
          ) {
            const officialForm =
              await Core.getOfficialForm(
                {
                  t: topicId,
                  mode: "reply"
                }
              );

            const formData =
              Core.buildOfficialFormData(
                officialForm,
                {
                  t: topicId,
                  message,
                  mode: "reply",
                  post: 1
                },
                [
                  "preview"
                ]
              );

            const action =
              new URL(
                officialForm
                  .getAttribute(
                    "action"
                  ) ||
                "/post",
                window.location.origin
              );

            return Core.fetchHTML(
              action.href,
              {
                method: "POST",
                body: formData,
                redirect: "follow"
              }
            );
          }

          /**
           * Redirige después de publicar.
           */
          function redirectAfterPublish(
            topicId,
            topicUrl
          ) {
            const redirectUrl =
              String(
                form.dataset
                  .redirect || ""
              ).trim();

            if (
              window.self !==
              window.top
            ) {
              window.parent
                .location
                .reload();

              return;
            }

            if (redirectUrl) {
              window.location.href =
                redirectUrl;

              return;
            }

            if (topicUrl) {
              window.location.href =
                topicUrl;

              return;
            }

            window.location.href =
              new URL(
                "/t" +
                topicId +
                "-",
                window.location.origin
              ).href;
          }

          form.addEventListener(
            "submit",
            async function (event) {
              event.preventDefault();

              if (sending) {
                return;
              }

              const message =
                controller
                  .renderTemplate();

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

              sending = true;

              controller
                .setSendingState(true);

              try {
                const result =
                  await publishReply(
                    topicId,
                    message
                  );

                const topicUrl =
                  Core.getTopicUrl(
                    result.response,
                    result.html,
                    topicId
                  );

                const parsedDocument =
                  Core.parseHTML(
                    result.html
                  );

                const officialFormStillPresent =
                  parsedDocument
                    .querySelector(
                      [
                        'form[name="post"]',
                        'form[action*="/post"]'
                      ].join(",")
                    );

                if (
                  !topicUrl &&
                  officialFormStillPresent
                ) {
                  throw new Error(
                    Core.getForumError(
                      result.html
                    ) ||
                    "Foroactivo no ha confirmado la publicación."
                  );
                }

                form.dispatchEvent(
                  new CustomEvent(
                    "pixie:reply-form-success",
                    {
                      detail: {
                        topicId,
                        message,
                        topicUrl
                      }
                    }
                  )
                );

                window.alert(
                  "Respuesta publicada."
                );

                redirectAfterPublish(
                  topicId,
                  topicUrl
                );
              } catch (error) {
                sending = false;

                controller
                  .setSendingState(
                    false
                  );

                warn(
                  "No se ha podido publicar la respuesta.",
                  error
                );

                form.dispatchEvent(
                  new CustomEvent(
                    "pixie:reply-form-error",
                    {
                      detail: {
                        error
                      }
                    }
                  )
                );

                window.alert(
                  error instanceof Error
                    ? error.message
                    : "No se ha podido publicar la respuesta."
                );
              }
            }
          );

          form.dispatchEvent(
            new CustomEvent(
              "pixie:reply-form-ready",
              {
                detail: {
                  module
                }
              }
            )
          );

          log(
            "Formulario de respuesta inicializado.",
            controller.formId
          );
        }

        Pixie.ready(
          function () {
            module.init();
          }
        );

        return module;
      }
    );
})(window, document);
