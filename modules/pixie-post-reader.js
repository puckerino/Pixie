/*!
 * PixiePostReader.js
 * Carga posts de Foroactivo y extrae instrucciones.
 */

(function () {
  "use strict";

  const CONFIG = {
    /*
     * POST
     *
     * Ejemplo:
     * <article id="p69" class="post">
     */
    postRootSelector: "article.post",
    postIdPrefix: "p",

    /*
     * Fallback para localizar el post mediante
     * el permalink interno.
     *
     * Ejemplo:
     * <a class="permalink" id="69">
     */
    postPermalinkSelector: ".permalink[id]",

    /*
     * CODEBOX
     *
     * En Spectra:
     *
     * <article class="content message">
     *   <dl class="codebox">
     *     <code>...</code>
     *   </dl>
     * </article>
     */
    postCodeSelector:
      ".content.message dl.codebox code",

    /*
     * PERFIL DEL AUTOR
     *
     * Todos estos selectores se buscan
     * dentro del post concreto.
     */
    profileLinkSelectors: [
      'aside.profile .username a[href^="/u"]',
      'aside.profile .avatar-post a[href^="/u"]',
      'aside.profile .avatar-post-mobile a[href^="/u"]',
      'aside.profile .contact a[href^="/u"]',
      'aside.profile a[href^="/u"]'
    ],

    profilePattern: /\/u\d+/i
  };

  /*
   * Readers registrados.
   *
   * Esto permite que distintos paneles
   * interpreten el contenido del post
   * de formas diferentes.
   */
  const readers = new Map();


  /*
   * =========================================================
   * UTILIDADES
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


  /*
   * Convierte:
   *
   * 69
   *
   * en:
   *
   * /viewtopic?p=69
   *
   * También acepta URLs completas o URLs de tema.
   */
  function buildPostURL(value) {
    value = String(value || "").trim();

    if (!value) {
      return null;
    }

    if (isFullURL(value)) {
      return value;
    }

    /*
     * Solo número.
     */
    if (/^\d+$/.test(value)) {
      return `/viewtopic?p=${encodeURIComponent(value)}`;
    }

    /*
     * Ruta de tema o URL con hash.
     *
     * Ejemplos:
     *
     * /t23-test#69
     * t23-test#69
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
     * Último fallback:
     * intentamos tratarlo como ID de post.
     */
    return `/viewtopic?p=${encodeURIComponent(value)}`;
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


  /*
   * Convierte HTML escapado:
   *
   * &lt;div&gt;
   *
   * en:
   *
   * <div>
   */
  function decodeHTML(value) {
    const textarea =
      document.createElement("textarea");

    textarea.innerHTML =
      String(value || "");

    return textarea.value;
  }


  /*
   * Convierte el contenido escapado de un
   * codebox en nodos DOM reales.
   */
  function escapedToDOM(value) {
    const container =
      document.createElement("div");

    container.innerHTML =
      decodeHTML(value);

    return container;
  }


  /*
   * =========================================================
   * IDENTIFICAR EL POST SOLICITADO
   * =========================================================
   */

  function getRequestedPostId(raw, url) {
    /*
     * Intentamos obtener primero el ID
     * desde la URL resuelta.
     */
    try {
      const resolved =
        new URL(url, location.href);

      /*
       * Ejemplos:
       *
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
      // seguimos con los fallbacks
    }

    /*
     * Si el usuario escribió directamente:
     *
     * 69
     */
    if (/^\d+$/.test(raw)) {
      return raw;
    }

    return "";
  }


  /*
   * Busca el post exacto dentro del documento.
   */
  function findPost(doc, id) {
    if (id) {
      /*
       * Opción principal:
       *
       * <article id="p69" class="post">
       */
      const byPostId =
        doc.getElementById(
          CONFIG.postIdPrefix + id
        );

      if (byPostId) {
        return (
          byPostId.closest(
            CONFIG.postRootSelector
          ) ||
          byPostId
        );
      }

      /*
       * Fallback Spectra:
       *
       * <a class="permalink" id="69">
       */
      const byPermalink =
        doc.querySelector(
          `${CONFIG.postPermalinkSelector}#${CSS.escape(id)}`
        );

      if (byPermalink) {
        return (
          byPermalink.closest(
            CONFIG.postRootSelector
          ) ||
          byPermalink
        );
      }
    }

    /*
     * Último fallback.
     *
     * Esto solo debería utilizarse si no hemos
     * podido determinar el ID solicitado.
     */
    return doc.querySelector(
      CONFIG.postRootSelector
    );
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

    for (
      const selector
      of CONFIG.profileLinkSelectors
    ) {
      const anchor =
        post.querySelector(selector);

      const href =
        anchor?.getAttribute("href");

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
            CONFIG.profilePattern
          );

        if (match) {
          return match[0];
        }
      } catch {
        // probamos el siguiente selector
      }
    }

    return "";
  }


  /*
   * =========================================================
   * CODEBOX
   * =========================================================
   */

  /*
   * Reúne todos los codebox del post en
   * un único contenedor DOM.
   *
   * Esto mantiene el comportamiento del panel
   * antiguo: si hay varios bloques de código,
   * todos se interpretan juntos.
   */
  function collectCodeboxes(post) {
    const container =
      document.createElement("div");

    if (!post) {
      return container;
    }

    const codes =
      Array.from(
        post.querySelectorAll(
          CONFIG.postCodeSelector
        )
      );

    codes.forEach(code => {
      /*
       * Usamos innerHTML porque Foroactivo
       * suele devolver las etiquetas escapadas
       * dentro del <code>.
       */
      const source =
        code.innerHTML ||
        code.textContent ||
        "";

      const fragment =
        escapedToDOM(source);

      while (fragment.firstChild) {
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

  function registerReader(name, callback) {
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
   * READER GENÉRICO DE CAMPOS
   * =========================================================
   *
   * Permite usar en un codebox:
   *
   * <x-profile
   *   field="dinero"
   *   operation="add"
   *   value="100">
   * </x-profile>
   *
   *
   * También acepta versión en español:
   *
   * <x-profile
   *   campo="dinero"
   *   operacion="sumar"
   *   cantidad="100">
   * </x-profile>
   *
   *
   * Operaciones admitidas:
   *
   * add / sumar
   * subtract / restar
   * overwrite / sobreescribir
   */

  registerReader(
    "fields",
    ({ content }) => {
      return Array.from(
        content.querySelectorAll(
          "x-profile"
        )
      )
        .map(node => {
          const key =
            (
              node.getAttribute("field") ||
              node.getAttribute("campo") ||
              ""
            ).trim();

          let operation =
            (
              node.getAttribute(
                "operation"
              ) ||
              node.getAttribute(
                "operacion"
              ) ||
              "overwrite"
            )
              .trim()
              .toLowerCase();

          /*
           * Alias en español.
           */
          const aliases = {
            sumar: "add",
            restar: "subtract",
            sobreescribir:
              "overwrite"
          };

          operation =
            aliases[operation] ||
            operation;

          /*
           * El valor puede venir de:
           *
           * value=""
           * valor=""
           * cantidad=""
           * contenido del nodo
           */
          const value =
            node.getAttribute("value") ??
            node.getAttribute("valor") ??
            node.getAttribute("cantidad") ??
            node.textContent.trim();

          return {
            key,
            operation,
            value,
            node
          };
        })
        .filter(
          change =>
            change.key
        );
    }
  );


  /*
   * =========================================================
   * READER DE INVENTARIO
   * =========================================================
   *
   * NOTA:
   *
   * Este reader todavía conserva el formato
   * legacy del panel antiguo:
   *
   * .comprado
   * .usado
   * <x-inv>
   *
   * Lo adaptaremos después al formato actual
   * de las Shops de Spectra:
   *
   * .compras
   * .retiradas
   * <s-item>
   *
   * El motor base no depende de ese cambio.
   */


  function parseInventoryNodes(root) {
    if (!root) {
      return [];
    }

    return Array.from(
      root.querySelectorAll(
        "x-inv"
      )
    )
      .map(node => ({
        item:
          (
            node.getAttribute("item") ||
            ""
          ).trim(),

        cantidad:
          parseInt(
            node.getAttribute(
              "cantidad"
            ) || "0",
            10
          ) || 0,

        precio:
          parseInt(
            node.getAttribute(
              "precio"
            ) || "0",
            10
          ) || 0,

        descripcion:
          (
            node.getAttribute(
              "descripcion"
            ) || ""
          ).trim()
      }))
      .filter(
        item =>
          item.item &&
          item.cantidad
      );
  }


  registerReader(
    "inventory",
    (
      { content },
      options = {}
    ) => {
      const inventoryKey =
        options.inventoryKey ||
        "inventory";

      const spentKey =
        options.spentKey ||
        "spent";

      const bought =
        parseInventoryNodes(
          content.querySelector(
            options.boughtSelector ||
            ".comprado"
          )
        );

      const used =
        parseInventoryNodes(
          content.querySelector(
            options.usedSelector ||
            ".usado"
          )
        );

      const changes = [];

      /*
       * Compras → sumar inventario.
       */
      bought.forEach(item => {
        changes.push({
          key: inventoryKey,
          operation: "add",
          value: item
        });
      });

      /*
       * Usados/retirados → restar inventario.
       */
      used.forEach(item => {
        changes.push({
          key: inventoryKey,
          operation: "subtract",
          value: item
        });
      });

      /*
       * Total gastado.
       */
      const total =
        bought.reduce(
          (sum, item) =>
            sum +
            (
              item.cantidad *
              item.precio
            ),
          0
        );

      if (
        spentKey &&
        total
      ) {
        changes.push({
          key: spentKey,
          operation: "add",
          value: total
        });
      }

      return changes;
    }
  );


  /*
   * =========================================================
   * API PÚBLICA
   * =========================================================
   */

  window.PixiePostReader = {
    load,
    read,
    registerReader,
    buildPostURL,
    readers
  };
})();
