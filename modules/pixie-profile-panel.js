/*!
 * PixieProfilePanel.js
 * Motor genérico de paneles para aplicar cambios
 * desde posts a campos de perfil.
 */

(function () {
  "use strict";

  const registry = new Map();
  const instances = new WeakMap();

  const OPERATION_LABELS = {
    add: "Sumar",
    subtract: "Restar",
    overwrite: "Sobreescribir"
  };


  /*
   * =========================================================
   * UTILIDADES
   * =========================================================
   */

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function cloneValue(value) {
    /*
     * Map
     */
    if (value instanceof Map) {
      return new Map(
        Array.from(
          value.entries()
        ).map(
          ([key, item]) => [
            key,
            cloneValue(item)
          ]
        )
      );
    }

    /*
     * Array
     */
    if (Array.isArray(value)) {
      return value.map(
        cloneValue
      );
    }

    /*
     * Objeto normal
     */
    if (
      value !== null &&
      typeof value === "object"
    ) {
      return Object.fromEntries(
        Object.entries(value)
          .map(
            ([key, item]) => [
              key,
              cloneValue(item)
            ]
          )
      );
    }

    return value;
  }


  function clampNumber(
    value,
    field
  ) {
    let result = value;

    if (
      typeof field.min === "number"
    ) {
      result =
        Math.max(
          field.min,
          result
        );
    }

    if (
      typeof field.max === "number"
    ) {
      result =
        Math.min(
          field.max,
          result
        );
    }

    return result;
  }


  /*
   * =========================================================
   * OPERACIONES GENÉRICAS
   * =========================================================
   */

  function defaultApply({
    current,
    operation,
    value,
    field
  }) {
    /*
     * NUMBER
     */
    if (
      field.type === "number"
    ) {
      const currentNumber =
        Number(current) || 0;

      const inputNumber =
        Number(value) || 0;

      switch (operation) {
        case "add":
          return clampNumber(
            currentNumber +
            inputNumber,
            field
          );

        case "subtract":
          return clampNumber(
            currentNumber -
            inputNumber,
            field
          );

        case "overwrite":
          return clampNumber(
            inputNumber,
            field
          );

        default:
          return currentNumber;
      }
    }


    /*
     * TEXT / HTML / OTROS
     *
     * Por defecto solo soportan overwrite.
     */
    if (
      operation === "overwrite"
    ) {
      return value;
    }

    return current;
  }


  function applyDirective({
    current,
    directive,
    field,
    panel
  }) {
    /*
     * Un campo puede definir su propia lógica.
     *
     * Ejemplo:
     *
     * apply({
     *   current,
     *   operation,
     *   value
     * }) { ... }
     */
    if (
      typeof field.apply ===
      "function"
    ) {
      return field.apply({
        current,

        operation:
          directive.operation,

        value:
          directive.value,

        directive,
        field,
        panel
      });
    }

    return defaultApply({
      current,

      operation:
        directive.operation,

      value:
        directive.value,

      field
    });
  }


  /*
   * =========================================================
   * CLASE PANEL
   * =========================================================
   */

  class ProfilePanel {
    constructor(
      root,
      config
    ) {
      this.root = root;
      this.config = config;

      this.postData = null;
      this.profile = "";
      this.profileData = null;

      this.directives = [];
      this.results = {};

      this.render();
      this.bind();
    }


    /*
     * =====================================================
     * RENDER BASE
     * =====================================================
     */

    render() {
      const title =
        this.config.title ||
        "Panel de perfil";

      const description =
        this.config.description ||
        "";

      this.root.classList.add(
        "pixie-profile-panel"
      );

      this.root.innerHTML = `
        <header class="pixie-profile-panel__header">

          <h2>
            ${escapeHTML(title)}
          </h2>

          ${
            description
              ? `
                <p>
                  ${escapeHTML(description)}
                </p>
              `
              : ""
          }

        </header>


        <section class="pixie-profile-panel__source">

          <label>
            ID o URL del post
          </label>

          <div class="pixie-profile-panel__source-actions">

            <input
              type="text"
              data-pixie-post
              placeholder="Ej: 69 o URL del post"
            >

            <button
              type="button"
              data-pixie-load
            >
              Cargar post
            </button>

          </div>

          <span
            class="pixie-profile-panel__status"
            data-pixie-source-status
          ></span>

        </section>


        <section
          class="pixie-profile-panel__summary"
          data-pixie-summary
          hidden
        >

          <h3>
            Cambios detectados
          </h3>

          <div
            class="pixie-profile-panel__profile"
            data-pixie-profile-info
          ></div>

          <div
            class="pixie-profile-panel__changes"
            data-pixie-changes
          ></div>

        </section>


        <section
          class="pixie-profile-panel__results"
          data-pixie-results
          hidden
        >

          <h3>
            Resultado
          </h3>

          <div
            data-pixie-result-fields
          ></div>

        </section>


        <footer class="pixie-profile-panel__footer">

          <button
            type="button"
            data-pixie-save
            disabled
          >
            Aplicar cambios
          </button>

          <span
            class="pixie-profile-panel__status"
            data-pixie-save-status
          ></span>

        </footer>
      `;
    }


    /*
     * =====================================================
     * EVENTOS
     * =====================================================
     */

    bind() {
      this.postInput =
        this.root.querySelector(
          "[data-pixie-post]"
        );

      this.loadButton =
        this.root.querySelector(
          "[data-pixie-load]"
        );

      this.saveButton =
        this.root.querySelector(
          "[data-pixie-save]"
        );

      this.sourceStatus =
        this.root.querySelector(
          "[data-pixie-source-status]"
        );

      this.saveStatus =
        this.root.querySelector(
          "[data-pixie-save-status]"
        );

      this.summary =
        this.root.querySelector(
          "[data-pixie-summary]"
        );

      this.resultsSection =
        this.root.querySelector(
          "[data-pixie-results]"
        );

      this.profileInfo =
        this.root.querySelector(
          "[data-pixie-profile-info]"
        );

      this.changesBox =
        this.root.querySelector(
          "[data-pixie-changes]"
        );

      this.resultFields =
        this.root.querySelector(
          "[data-pixie-result-fields]"
        );


      this.loadButton.addEventListener(
        "click",
        () => this.load()
      );


      this.saveButton.addEventListener(
        "click",
        () => this.save()
      );


      this.postInput.addEventListener(
        "keydown",
        event => {
          if (
            event.key !==
            "Enter"
          ) {
            return;
          }

          event.preventDefault();

          this.load();
        }
      );
    }


    /*
     * =====================================================
     * CAMPOS
     * =====================================================
     */

    getField(key) {
      return this.config.fields.find(
        field =>
          field.key === key
      );
    }


    /*
     * =====================================================
     * FORMATEO
     * =====================================================
     */

    formatValue(
      value,
      field
    ) {
      if (
        typeof field.format ===
        "function"
      ) {
        return field.format(
          value,
          field
        );
      }

      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return "—";
      }

      if (
        value instanceof Map
      ) {
        return Array.from(
          value.entries()
        )
          .map(
            ([key, item]) =>
              `${key}: ${
                typeof item ===
                "object"
                  ? JSON.stringify(item)
                  : item
              }`
          )
          .join("\n");
      }

      if (
        typeof value ===
        "object"
      ) {
        return JSON.stringify(
          value,
          null,
          2
        );
      }

      return String(value);
    }


    /*
     * Formatea una directiva individual.
     *
     * Esto evita mostrar [object Object]
     * cuando el reader devuelve objetos.
     */
    formatDirectiveValue(
      directive,
      field
    ) {
      if (
        typeof field.formatDirective ===
        "function"
      ) {
        return field.formatDirective({
          directive,
          field,
          panel: this
        });
      }

      const value =
        directive.value;

      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return "—";
      }

      if (
        typeof value ===
        "object"
      ) {
        /*
         * Convención habitual para items.
         */
        if (
          value.item !== undefined
        ) {
          const quantity =
            value.cantidad !== undefined
              ? `${value.cantidad} × `
              : "";

          return (
            quantity +
            value.item
          );
        }

        return JSON.stringify(
          value
        );
      }

      return String(value);
    }


    /*
     * =====================================================
     * VALIDACIÓN DE DIRECTIVAS
     * =====================================================
     */

    validateDirectives(
      directives
    ) {
      return directives.filter(
        directive => {
          const field =
            this.getField(
              directive.key
            );

          if (!field) {
            console.warn(
              `[PixieProfilePanel] Campo "${directive.key}" no configurado.`,
              directive
            );

            return false;
          }


          /*
           * Operaciones permitidas.
           *
           * Primero miramos las del campo.
           * Después las generales del panel.
           */
          const allowed =
            field.operations ||
            this.config.operations ||
            [
              "add",
              "subtract",
              "overwrite"
            ];


          if (
            !allowed.includes(
              directive.operation
            )
          ) {
            console.warn(
              `[PixieProfilePanel] Operación "${directive.operation}" no permitida en "${directive.key}".`,
              directive
            );

            return false;
          }

          return true;
        }
      );
    }


    /*
     * =====================================================
     * CÁLCULO DE RESULTADOS
     * =====================================================
     */

    calculateResults() {
      this.results = {};

      this.config.fields.forEach(
        field => {
          const profileValue =
            this.profileData
              ?.values
              ?.[field.key];

          if (!profileValue?.found) {
            return;
          }


          /*
           * Todas las directivas de este campo.
           */
          const directives =
            this.directives.filter(
              directive =>
                directive.key ===
                field.key
            );


          if (
            !directives.length
          ) {
            return;
          }


          let result =
            cloneValue(
              profileValue.value
            );


          /*
           * Se aplican en orden.
           *
           * Ejemplo:
           *
           * +2 pociones
           * -1 poción
           *
           * resultado = +1
           */
          directives.forEach(
            directive => {
              result =
                applyDirective({
                  current: result,
                  directive,
                  field,
                  panel: this
                });
            }
          );


          this.results[
            field.key
          ] = {
            field,

            current:
              profileValue.value,

            result,

            directives
          };
        }
      );
    }


    /*
     * =====================================================
     * RENDER DIRECTIVAS
     * =====================================================
     */

    renderChanges() {
      if (
        !this.directives.length
      ) {
        this.changesBox.innerHTML = `
          <p>
            No se detectaron cambios.
          </p>
        `;

        return;
      }


      this.changesBox.innerHTML =
        this.directives
          .map(
            directive => {
              const field =
                this.getField(
                  directive.key
                );

              const label =
                field?.label ||
                directive.key;

              const operation =
                OPERATION_LABELS[
                  directive.operation
                ] ||
                directive.operation;

              const value =
                this.formatDirectiveValue(
                  directive,
                  field || {}
                );

              return `
                <article class="pixie-profile-change">

                  <strong class="pixie-profile-change__field">
                    ${escapeHTML(label)}
                  </strong>

                  <span class="pixie-profile-change__operation">
                    ${escapeHTML(operation)}
                  </span>

                  <span class="pixie-profile-change__value">
                    ${escapeHTML(value)}
                  </span>

                </article>
              `;
            }
          )
          .join("");
    }


    /*
     * =====================================================
     * RENDER RESULTADOS
     * =====================================================
     */

    renderResults() {
      const entries =
        Object.values(
          this.results
        );


      if (!entries.length) {
        this.resultFields.innerHTML = `
          <p>
            No hay campos que actualizar.
          </p>
        `;

        return;
      }


      this.resultFields.innerHTML =
        entries
          .map(
            entry => {
              const current =
                this.formatValue(
                  entry.current,
                  entry.field
                );

              const result =
                this.formatValue(
                  entry.result,
                  entry.field
                );

              return `
                <article class="pixie-profile-result">

                  <h4 class="pixie-profile-result__title">
                    ${escapeHTML(
                      entry.field.label ||
                      entry.field.key
                    )}
                  </h4>


                  <div class="pixie-profile-result__values">

                    <div class="pixie-profile-result__current">

                      <small>
                        Actual
                      </small>

                      <pre>${escapeHTML(current)}</pre>

                    </div>


                    <div class="pixie-profile-result__new">

                      <small>
                        Resultado
                      </small>

                      <pre>${escapeHTML(result)}</pre>

                    </div>

                  </div>

                </article>
              `;
            }
          )
          .join("");
    }


    /*
     * =====================================================
     * CARGAR POST + PERFIL
     * =====================================================
     */

    async load() {
      const source =
        this.postInput.value.trim();

      if (!source) {
        this.sourceStatus.textContent =
          "Introduce un ID o URL de post.";

        return;
      }


      if (
        !window.PixiePostReader
      ) {
        this.sourceStatus.textContent =
          "PixiePostReader no está cargado.";

        return;
      }


      if (
        !window.PixieProfile
      ) {
        this.sourceStatus.textContent =
          "PixieProfile no está cargado.";

        return;
      }


      this.loadButton.disabled =
        true;

      this.saveButton.disabled =
        true;

      this.sourceStatus.textContent =
        "Cargando post…";

      this.saveStatus.textContent =
        "";

      this.summary.hidden =
        true;

      this.resultsSection.hidden =
        true;


      try {
        /*
         * ===============================================
         * 1. CARGAR POST
         * ===============================================
         */

        this.postData =
          await PixiePostReader.load(
            source
          );


        /*
         * ===============================================
         * 2. PERFIL DEL AUTOR
         * ===============================================
         */

        if (
          !this.postData.profile
        ) {
          throw new Error(
            "No se pudo detectar el perfil del autor."
          );
        }


        this.profile =
          this.postData.profile;


        /*
         * ===============================================
         * 3. LEER DIRECTIVAS
         * ===============================================
         */

        const sourceConfig =
          this.config.source ||
          {};

        const reader =
          sourceConfig.reader ||
          "fields";


        this.directives =
          PixiePostReader.read(
            reader,
            this.postData,
            sourceConfig.options ||
              {}
          );


        /*
         * ===============================================
         * 4. VALIDAR DIRECTIVAS
         * ===============================================
         */

        this.directives =
          this.validateDirectives(
            this.directives
          );


        if (
          !this.directives.length
        ) {
          throw new Error(
            "El post no contiene cambios válidos para este panel."
          );
        }


        /*
         * ===============================================
         * 5. CARGAR PERFIL
         * ===============================================
         */

        this.sourceStatus.textContent =
          "Cargando perfil…";


        this.profileData =
          await PixieProfile.loadProfile(
            this.profile,
            this.config.fields
          );


        /*
         * ===============================================
         * 6. CALCULAR RESULTADOS
         * ===============================================
         */

        this.calculateResults();


        /*
         * ===============================================
         * 7. RENDER
         * ===============================================
         */

        this.profileInfo.innerHTML = `
          <p>
            Perfil detectado:
            <strong>
              ${escapeHTML(
                this.profile
              )}
            </strong>
          </p>
        `;


        this.renderChanges();
        this.renderResults();


        this.summary.hidden =
          false;

        this.resultsSection.hidden =
          false;


        /*
         * Solo permitimos guardar si realmente
         * hay campos calculados.
         */
        this.saveButton.disabled =
          !Object.keys(
            this.results
          ).length;


        this.sourceStatus.textContent =
          "Post y perfil cargados ✓";


        /*
         * Hook opcional.
         */
        if (
          typeof this.config.onLoad ===
          "function"
        ) {
          this.config.onLoad({
            panel: this,

            post:
              this.postData,

            directives:
              this.directives,

            profile:
              this.profileData,

            results:
              this.results
          });
        }

      } catch (error) {
        console.error(
          "[PixieProfilePanel]",
          error
        );

        this.postData = null;
        this.profile = "";
        this.profileData = null;
        this.directives = [];
        this.results = {};

        this.sourceStatus.textContent =
          `Error: ${error.message}`;

        this.saveButton.disabled =
          true;

      } finally {
        this.loadButton.disabled =
          false;
      }
    }


    /*
     * =====================================================
     * GUARDAR
     * =====================================================
     */

    async save() {
      const entries =
        Object.values(
          this.results
        );


      if (
        !this.profile ||
        !entries.length
      ) {
        this.saveStatus.textContent =
          "No hay cambios que guardar.";

        return;
      }


      /*
       * PixieProfile espera:
       *
       * {
       *   field,
       *   value
       * }
       */
      const changes =
        entries.map(
          entry => ({
            field:
              entry.field,

            value:
              entry.result
          })
        );


      /*
       * Hook opcional previo.
       *
       * Si devuelve false,
       * cancelamos el guardado.
       */
      if (
        typeof this.config.beforeSave ===
        "function"
      ) {
        const proceed =
          await this.config.beforeSave({
            panel: this,
            changes,
            results:
              this.results
          });


        if (
          proceed === false
        ) {
          return;
        }
      }


      this.saveButton.disabled =
        true;

      this.loadButton.disabled =
        true;

      this.saveStatus.textContent =
        "Guardando cambios…";


      try {
        const response =
          await PixieProfile.updateProfile(
            this.profile,
            changes
          );


        const successful =
          response.results.filter(
            result =>
              result.ok
          );


        const failed =
          response.results.filter(
            result =>
              !result.ok
          );


        /*
         * Mostramos todos los mensajes si
         * hubo algún error.
         */
        if (
          failed.length
        ) {
          this.saveStatus.textContent =
            response.results
              .map(
                result =>
                  result.message
              )
              .join(" · ");
        } else {
          this.saveStatus.textContent =
            `${successful.length} campo${
              successful.length === 1
                ? ""
                : "s"
            } guardado${
              successful.length === 1
                ? ""
                : "s"
            } ✓`;
        }


        /*
         * Hook posterior.
         */
        if (
          typeof this.config.onSave ===
          "function"
        ) {
          this.config.onSave({
            panel: this,
            response,
            changes
          });
        }


        /*
         * Si todo salió bien,
         * volvemos a cargar el post/perfil
         * para comprobar los valores reales.
         */
        if (
          !failed.length
        ) {
          await this.load();
        }

      } catch (error) {
        console.error(
          "[PixieProfilePanel]",
          error
        );

        this.saveStatus.textContent =
          `Error: ${error.message}`;

      } finally {
        this.saveButton.disabled =
          false;

        this.loadButton.disabled =
          false;
      }
    }
  }


  /*
   * =========================================================
   * REGISTRO
   * =========================================================
   */

  function register(
    name,
    config
  ) {
    if (!name) {
      throw new Error(
        "PixieProfilePanel.register necesita un nombre."
      );
    }


    if (
      !config ||
      !Array.isArray(
        config.fields
      ) ||
      !config.fields.length
    ) {
      throw new Error(
        `El panel "${name}" no contiene campos.`
      );
    }


    registry.set(
      name,
      config
    );


    /*
     * Si el DOM ya existe,
     * intentamos montar inmediatamente
     * cualquier panel con ese nombre.
     */
    if (
      document.readyState !==
      "loading"
    ) {
      mountAll(name);
    }
  }


  /*
   * =========================================================
   * MONTAJE
   * =========================================================
   */

  function mount(root) {
    if (
      instances.has(root)
    ) {
      return instances.get(
        root
      );
    }


    const name =
      root.dataset
        .pixieProfilePanel;


    if (!name) {
      return null;
    }


    const config =
      registry.get(name);


    if (!config) {
      /*
       * No lo tratamos como error fatal.
       *
       * Puede ocurrir que el HTML exista
       * antes de cargar el archivo específico
       * del panel.
       */
      return null;
    }


    const instance =
      new ProfilePanel(
        root,
        config
      );


    instances.set(
      root,
      instance
    );


    return instance;
  }


  function mountAll(
    name = null
  ) {
    const selector =
      name
        ? `[data-pixie-profile-panel="${CSS.escape(name)}"]`
        : "[data-pixie-profile-panel]";


    document
      .querySelectorAll(
        selector
      )
      .forEach(
        root => {
          mount(root);
        }
      );
  }


  /*
   * =========================================================
   * API PÚBLICA
   * =========================================================
   */

  window.PixieProfilePanel = {
    register,
    mount,
    mountAll,

    registry,

    operations:
      OPERATION_LABELS
  };


  /*
   * =========================================================
   * AUTO-MOUNT
   * =========================================================
   */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        mountAll();
      }
    );
  } else {
    mountAll();
  }
})();
