/*!
 * PixiePostReader.js
 * Lector genérico y configurable de posts para Foroactivo.
 */

(function () {
  "use strict";

  /*
   * =========================================================
   * CONFIGURACIÓN BASE
   * =========================================================
   */

  const CONFIG = {
    post: {
      rootSelector: "article.post",
      idPrefix: "p",
      permalinkSelector: ".permalink[id]"
    },

    content: {
      codeSelector: ".content.message dl.codebox code"
    },

    profile: {
      linkSelectors: [
        'a[href^="/u"]'
      ],

      pattern: /\/u\d+/i
    }
  };


  /*
   * Readers disponibles.
   */
  const readers = new Map();


  /*
   * =========================================================
   * UTILIDADES
   * =========================================================
   */

  function isPlainObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }


  function mergeConfig(target, source) {
    Object.entries(source || {}).forEach(
      ([key, value]) => {
        if (
          isPlainObject(value) &&
          isPlainObject(target[key])
        ) {
          mergeConfig(
            target[key],
            value
          );

          return;
        }

        target[key] = value;
      }
    );

    return target;
  }


  function configure(options = {}) {
    mergeConfig(
      CONFIG,
      options
    );

    return CONFIG;
  }


  function getConfig() {
    return CONFIG;
  }


  function isFullURL(value) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }


  function buildPostURL(value) {
    value =
      String(value || "").trim();

    if (!value) {
      return null;
    }

    /*
     * URL absoluta.
     */
    if (isFullURL(value)) {
      return value;
    }

    /*
     * Número de post.
     *
     * 69
     *
     * →
     *
     * /viewtopic?p=69
     */
    if (/^\d+$/.test(value)) {
      return `/viewtopic?p=${encodeURIComponent(value)}`;
    }

    /*
     * URL/ruta de tema.
     */
    if (
      /^\/?t\d+/i.test(value) ||
      value.includes("#")
    ) {
      return value.startsWith("/")
        ? value
        : `/${value}`;
    }

    /*
     * Último fallback.
     */
    return `/viewtopic?p=${encodeURIComponent(value)}`;
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


  function decodeHTML(value) {
    const textarea =
      document.createElement("textarea");

    textarea.innerHTML =
      String(value || "");

    return textarea.value;
  }


  function escapedToDOM(value) {
    const container =
      document.createElement("div");

    container.innerHTML =
      decodeHTML(value);

    return container;
  }


  /*
   * =========================================================
   * IDENTIFICACIÓN DEL POST
   * =========================================================
   */

  function getRequestedPostId(
    raw,
    url
  ) {
    try {
      const resolved =
        new URL(
          url,
          location.href
        );

      /*
       * #69
       * #p69
       */
      const hash =
        resolved.hash
          .replace(/^#p?/i, "")
          .trim();

      if (/^\d+$/.test(hash)) {
        return hash;
      }

      /*
       * /viewtopic?p=69
       */
      const postParam =
        resolved.searchParams.get("p");

      if (
        /^\d+$/.test(
          postParam || ""
        )
      ) {
        return postParam;
      }

    } catch {
      // continuamos
    }


    if (/^\d+$/.test(raw)) {
      return raw;
    }

    return "";
  }


  function findPost(
    doc,
    id
  ) {
    const postConfig =
      CONFIG.post || {};


    /*
     * Opción principal:
     *
     * #p69
     */
    if (
      id &&
      postConfig.idPrefix
    ) {
      const byId =
        doc.getElementById(
          postConfig.idPrefix + id
        );

      if (byId) {
        return (
          byId.matches?.(
            postConfig.rootSelector
          )
            ? byId
            : (
                byId.closest(
                  postConfig.rootSelector
                ) ||
                byId
              )
        );
      }
    }


    /*
     * Segundo sistema:
     * permalink con ID.
     */
    if (
      id &&
      postConfig.permalinkSelector
    ) {
      const selector =
        `${postConfig.permalinkSelector}#${CSS.escape(id)}`;

      const permalink =
        doc.querySelector(
          selector
        );

      if (permalink) {
        return (
          permalink.closest(
            postConfig.rootSelector
          ) ||
          permalink
        );
      }
    }


    /*
     * Fallback.
     */
    if (
      postConfig.rootSelector
    ) {
      return doc.querySelector(
        postConfig.rootSelector
      );
    }

    return null;
  }


  /*
   * =========================================================
   * PERFIL DEL AUTOR
   * =========================================================
   */

  function extractProfile(post) {
    if (!post) {
      return "";
    }

    const profileConfig =
      CONFIG.profile || {};

    const selectors =
      Array.isArray(
        profileConfig.linkSelectors
      )
        ? profileConfig.linkSelectors
        : [];

    const pattern =
      profileConfig.pattern ||
      /\/u\d+/i;


    for (
      const selector
      of selectors
    ) {
      const anchor =
        post.querySelector(
          selector
        );

      const href =
        anchor?.getAttribute(
          "href"
        );

      if (!href) {
        continue;
      }

      try {
        const url =
          new URL(
            href,
            location.href
          );

        const match =
          url.pathname.match(
            pattern
          );

        if (match) {
          return match[0];
        }

      } catch {
        // probamos siguiente selector
      }
    }

    return "";
  }


  /*
   * =========================================================
   * CONTENIDO DEL POST
   * =========================================================
   */

  function collectCodeboxes(post) {
    const container =
      document.createElement("div");

    if (!post) {
      return container;
    }

    const selector =
      CONFIG.content?.codeSelector;

    if (!selector) {
      return container;
    }

    const codes =
      Array.from(
        post.querySelectorAll(
          selector
        )
      );


    codes.forEach(code => {
      const source =
        code.innerHTML ||
        code.textContent ||
        "";

      const fragment =
        escapedToDOM(source);

      while (
        fragment.firstChild
      ) {
        container.appendChild(
          fragment.firstChild
        );
      }
    });

    return container;
  }


  /*
   * =========================================================
   * CARGAR POST
   * =========================================================
   */

  async function load(value) {
    const raw =
      String(value || "").trim();

    const url =
      buildPostURL(raw);

    if (!url) {
      throw new Error(
        "Introduce un ID o URL de post."
      );
    }


    const html =
      await fetchHTML(url);


    const doc =
      new DOMParser()
        .parseFromString(
          html,
          "text/html"
        );


    const id =
      getRequestedPostId(
        raw,
        url
      );


    const post =
      findPost(
        doc,
        id
      );


    if (!post) {
      throw new Error(
        "No se encontró el post."
      );
    }


    const profile =
      extractProfile(post);


    const content =
      collectCodeboxes(post);


    return {
      raw,
      url,
      id,
      document: doc,
      post,
      profile,
      content
    };
  }


  /*
   * =========================================================
   * SISTEMA DE READERS
   * =========================================================
   */

  function registerReader(
    name,
    callback
  ) {
    if (!name) {
      throw new Error(
        "El reader necesita un nombre."
      );
    }

    if (
      typeof callback !==
      "function"
    ) {
      throw new Error(
        `Reader "${name}" inválido.`
      );
    }

    readers.set(
      name,
      callback
    );
  }


  function read(
    name,
    context,
    options = {}
  ) {
    const reader =
      readers.get(name);

    if (!reader) {
      throw new Error(
        `No existe el reader "${name}".`
      );
    }

    const result =
      reader(
        context,
        options
      );

    return Array.isArray(result)
      ? result
      : [];
  }


  /*
   * =========================================================
   * READER: FIELDS
   * =========================================================
   */

  registerReader(
    "fields",
    (
      { content },
      options = {}
    ) => {
      const selector =
        options.selector ||
        "x-profile";

      const attributes = {
        field:
          options.attributes?.field ||
          "field",

        operation:
          options.attributes?.operation ||
          "operation",

        value:
          options.attributes?.value ||
          "value"
      };


      const aliases = {
        sumar: "add",
        restar: "subtract",
        sobreescribir:
          "overwrite",

        ...(options.operationAliases || {})
      };


      return Array.from(
        content.querySelectorAll(
          selector
        )
      )
        .map(node => {
          const key =
            (
              node.getAttribute(
                attributes.field
              ) ||
              ""
            ).trim();


          let operation =
            (
              node.getAttribute(
                attributes.operation
              ) ||
              options.defaultOperation ||
              "overwrite"
            )
              .trim()
              .toLowerCase();


          operation =
            aliases[operation] ||
            operation;


          const attrValue =
            node.getAttribute(
              attributes.value
            );


          const value =
            attrValue !== null
              ? attrValue
              : node.textContent.trim();


          return {
            key,
            operation,
            value,
            node
          };
        })
        .filter(
          directive =>
            directive.key
        );
    }
  );


  /*
   * =========================================================
   * READER: ITEMS
   * =========================================================
   *
   * Reader genérico para listas de objetos.
   *
   * El reader puede:
   *
   * - emitir una directiva por cada item
   * - utilizar los items solamente para calcular totales
   *
   * Para esto último:
   *
   * emit: false
   */

  registerReader(
    "items",
    (
      { content },
      options = {}
    ) => {
      const itemSelector =
        options.itemSelector;


      const groups =
        Array.isArray(
          options.groups
        )
          ? options.groups
          : [];


      const attributes =
        options.attributes ||
        {};


      if (!itemSelector) {
        throw new Error(
          'El reader "items" necesita options.itemSelector.'
        );
      }


      /*
       * Nombres reales de atributos
       * utilizados en el HTML.
       */

      const itemAttribute =
        attributes.item ||
        "item";


      const quantityAttribute =
        attributes.quantity ||
        "cantidad";


      const priceAttribute =
        attributes.price ||
        null;


      /*
       * Nombres internos normalizados.
       */

      const outputNames = {
        item:
          options.output?.item ||
          "item",

        quantity:
          options.output?.quantity ||
          "cantidad",

        price:
          options.output?.price ||
          "precio"
      };


      /*
       * Atributos extra.
       */

      const extra =
        attributes.extra ||
        [];


      const changes = [];


      /*
       * Guardamos los items de cada grupo
       * aunque group.emit sea false.
       *
       * Esto permite calcular totales después.
       */

      const parsedGroups =
        new Map();


      function readExtraAttributes(
        node,
        value
      ) {
        /*
         * Ejemplo:
         *
         * extra: [
         *   "bonus",
         *   "descripcion"
         * ]
         */

        if (Array.isArray(extra)) {
          extra.forEach(
            attribute => {
              value[attribute] =
                (
                  node.getAttribute(
                    attribute
                  ) ||
                  ""
                ).trim();
            }
          );

          return;
        }


        /*
         * También puede ser:
         *
         * extra: {
         *   effect: "bonus",
         *   description: "descripcion"
         * }
         */

        if (isPlainObject(extra)) {
          Object.entries(
            extra
          ).forEach(
            ([output, attribute]) => {
              value[output] =
                (
                  node.getAttribute(
                    attribute
                  ) ||
                  ""
                ).trim();
            }
          );
        }
      }


      groups.forEach(group => {
        if (
          !group.selector ||
          !group.field ||
          !group.operation
        ) {
          return;
        }


        /*
         * Puede haber varios contenedores
         * con el mismo selector.
         */

        const roots =
          Array.from(
            content.querySelectorAll(
              group.selector
            )
          );


        const items = [];


        roots.forEach(root => {
          Array.from(
            root.querySelectorAll(
              itemSelector
            )
          ).forEach(node => {
            const item =
              (
                node.getAttribute(
                  itemAttribute
                ) ||
                ""
              ).trim();


            const quantity =
              parseFloat(
                node.getAttribute(
                  quantityAttribute
                ) || "0"
              ) || 0;


            if (
              !item ||
              quantity <= 0
            ) {
              return;
            }


            const value = {
              [outputNames.item]:
                item,

              [outputNames.quantity]:
                quantity
            };


            /*
             * Precio opcional.
             */

            if (priceAttribute) {
              value[
                outputNames.price
              ] =
                parseFloat(
                  node.getAttribute(
                    priceAttribute
                  ) || "0"
                ) || 0;
            }


            readExtraAttributes(
              node,
              value
            );


            const entry = {
              node,
              value,
              group
            };


            items.push(
              entry
            );


            /*
             * =================================================
             * EMIT
             * =================================================
             *
             * Por defecto emitimos una directiva por item.
             *
             * Si:
             *
             * emit: false
             *
             * el item solo se conserva en parsedGroups
             * para cálculos posteriores.
             */

            if (
              group.emit !== false
            ) {
              changes.push({
                key:
                  group.field,

                operation:
                  group.operation,

                value,

                node
              });
            }
          });
        });


        parsedGroups.set(
          group.selector,
          items
        );
      });


      /*
       * =====================================================
       * TOTALES
       * =====================================================
       *
       * Puede configurarse:
       *
       * total: {...}
       *
       * o:
       *
       * totals: [
       *   {...},
       *   {...}
       * ]
       */

      let totals = [];


      if (
        Array.isArray(
          options.totals
        )
      ) {
        totals =
          options.totals;

      } else if (
        options.total
      ) {
        totals = [
          options.total
        ];
      }


      totals.forEach(total => {
        if (
          !total?.field ||
          !total?.from
        ) {
          return;
        }


        const entries =
          parsedGroups.get(
            total.from
          ) || [];


        /*
         * Por defecto:
         *
         * cantidad × precio
         */

        let value = 0;


        if (
          typeof total.calculate ===
          "function"
        ) {
          value =
            total.calculate({
              entries,
              options
            });

        } else {
          value =
            entries.reduce(
              (sum, entry) => {
                const quantity =
                  Number(
                    entry.value[
                      outputNames.quantity
                    ]
                  ) || 0;


                const price =
                  Number(
                    entry.value[
                      outputNames.price
                    ]
                  ) || 0;


                return (
                  sum +
                  quantity * price
                );
              },
              0
            );
        }


        /*
         * Por defecto ignoramos totales 0.
         *
         * Para permitirlos:
         *
         * includeZero: true
         */

        if (
          value === 0 &&
          !total.includeZero
        ) {
          return;
        }


        /*
         * Esta es la única directiva que se genera
         * para un grupo con emit: false.
         */

        changes.push({
          key:
            total.field,

          operation:
            total.operation ||
            "add",

          value
        });
      });


      return changes;
    }
  );


  /*
   * =========================================================
   * API PÚBLICA
   * =========================================================
   */

  window.PixiePostReader = {
    configure,
    getConfig,

    load,
    read,

    registerReader,

    buildPostURL,

    readers
  };

})();
