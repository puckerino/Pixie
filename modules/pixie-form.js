/*!
 * PixieForm.js
 * Creación de temas mediante el formulario oficial de Foroactivo.
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
    "PixieForm";

  const FORM_SELECTOR =
    ".fa-generated-form";

  const READY_ATTRIBUTE =
    "data-pixie-form-ready";

  if (
    typeof window.PixieKit !==
    "function"
  ) {
    console.error(
      "[PixieForm] PixieKit no está disponible."
    );

    return;
  }

  if (!window.PixieFormCore) {
    console.error(
      "[PixieForm] PixieFormCore no está disponible."
    );

    return;
  }

  window.PixieForm =
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
           * Obtiene el título del tema.
           */
          function getSubject() {
            const subjectField =
              String(
                form.dataset
                  .subjectField || ""
              ).trim();

            if (subjectField) {
              const input =
                controller.getById(
                  subjectField
                );

              const value =
                String(
                  input?.value || ""
                ).trim();

              if (value) {
                return value;
              }
            }

            return String(
              form.dataset.titulo ||
              "Nuevo tema"
            ).trim();
          }

          /**
           * Obtiene el ID del foro.
           */
          function getForumId() {
            const forumField =
              String(
                form.dataset
                  .forumField || ""
              ).trim();

            if (forumField) {
              const input =
                controller.getById(
                  forumField
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
                form.dataset.foro,
                10
              ) || 0
            );
          }

          /**
           * Publica el tema.
           */
          async function publishTopic(
            forumId,
            subject,
            message
          ) {
            const officialForm =
              await Core.getOfficialForm(
                {
                  f: forumId,
                  mode: "newtopic"
                }
              );

            const formData =
              Core.buildOfficialFormData(
                officialForm,
                {
                  f: forumId,
                  subject,
                  message,
                  mode: "newtopic",
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
            forumId,
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
                "/f" +
                forumId +
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

              sending = true;

              controller
                .setSendingState(true);

              try {
                const result =
                  await publishTopic(
                    forumId,
                    subject,
                    message
                  );

                const topicUrl =
                  Core.getTopicUrl(
                    result.response,
                    result.html
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
                    "Foroactivo no ha confirmado la creación del tema."
                  );
                }

                form.dispatchEvent(
                  new CustomEvent(
                    "pixie:form-success",
                    {
                      detail: {
                        forumId,
                        subject,
                        message,
                        topicUrl
                      }
                    }
                  )
                );

                window.alert(
                  "Tema publicado."
                );

                redirectAfterPublish(
                  forumId,
                  topicUrl
                );
              } catch (error) {
                sending = false;

                controller
                  .setSendingState(
                    false
                  );

                warn(
                  "No se ha podido publicar el tema.",
                  error
                );

                form.dispatchEvent(
                  new CustomEvent(
                    "pixie:form-error",
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
                    : "No se ha podido publicar el tema."
                );
              }
            }
          );

          form.dispatchEvent(
            new CustomEvent(
              "pixie:form-ready",
              {
                detail: {
                  module
                }
              }
            )
          );

          log(
            "Formulario inicializado.",
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
