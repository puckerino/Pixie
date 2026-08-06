/*!
 * PixieShopRenderers.js
 * Renderers reutilizables para PixieShop.
 *
 * @version 1.0.0
 *
 * Requiere:
 * - pixie-shop.js
 * - pixie-shop-fields.js
 *
 * Renderers disponibles:
 * - card
 * - group-card
 * - basic-cart
 * - compact-cart
 */

(function (window, document) {
  "use strict";

  const MODULE_NAME = "renderers";
  const VERSION = "1.0.0";

  if (!window.PixieShop) {
    console.warn(
      "[PixieShopRenderers] PixieShop no está disponible."
    );

    return;
  }

  const PixieShop = window.PixieShop;
  const { utils } = PixieShop;

  const DEFAULT_ITEM_SELECTORS = {
    media:
      "[data-shop-item-media], .shop-item-media",

    category:
      "[data-shop-item-category], .shop-item-category",

    title:
      "[data-shop-item-title], .shop-item-title",

    description:
      [
        "[data-shop-item-description]",
        ".shop-item-description"
      ].join(", "),

    effect:
      [
        "[data-shop-item-effect]",
        ".shop-item-effect",
        ".shop-item-bonus"
      ].join(", "),

    value:
      [
        "[data-shop-item-value]",
        ".shop-item-price-value"
      ].join(", "),

    currency:
      [
        "[data-shop-currency]",
        ".shop-item-currency"
      ].join(", "),

    tags:
      "[data-shop-item-tags], .shop-item-tags",

    children:
      [
        "[data-shop-item-children]",
        ".shop-item-skills"
      ].join(", "),

    quantity:
      [
        "[data-shop-quantity]",
        ".shop-item-quantity"
      ].join(", "),

    quantityLabel:
      [
        "[data-shop-quantity-label]",
        ".shop-item-quantity-label"
      ].join(", ")
  };

  const DEFAULT_CART_SELECTORS = {
    title:
      [
        "[data-cart-item-title]",
        "[data-cart-item-name]",
        ".cart-item-name"
      ].join(", "),

    value:
      [
        "[data-cart-item-value]",
        ".cart-item-price"
      ].join(", "),

    currency:
      [
        "[data-shop-currency]",
        ".cart-item-currency"
      ].join(", "),

    quantity:
      [
        "[data-cart-quantity]",
        ".cart-item-quantity"
      ].join(", "),

    quantityLabel:
      [
        "[data-cart-quantity-label]",
        ".cart-item-quantity-label"
      ].join(", "),

    fields:
      [
        "[data-cart-fields]",
        ".cart-item-extra-fields"
      ].join(", "),

    remove:
      [
        "[data-cart-action='remove']",
        ".cart-item-remove"
      ].join(", "),

    decrease:
      [
        "[data-cart-action='decrease']",
        ".cart-item-decrease"
      ].join(", "),

    increase:
      [
        "[data-cart-action='increase']",
        ".cart-item-increase"
      ].join(", ")
  };

  const DEFAULT_CARD = {
    selectors: DEFAULT_ITEM_SELECTORS,

    fields: {
      media: "mediaHTML",
      category: "categoria",
      title: "titulo",
      description: "descripcion",
      effect: "bonus",
      value: "coste",
      tags: "tags"
    },

    hideEmpty: true,

    trustedMediaHTML: true,

    afterRender: null
  };

  const DEFAULT_GROUP_CARD = {
    selectors: DEFAULT_ITEM_SELECTORS,

    fields: {
      media: "mediaHTML",
      category: "categoria",
      title: "titulo",
      description: "descripcion",
      effect: "bonus",
      value: "coste",
      tags: "tags"
    },

    meta: [],

    children: {
      field: "children",

      element: "article",

      className:
        "shop-item-child",

      fields: {
        title: "titulo",
        description: "descripcion",
        effect: "bonus",
        value: "coste"
      },

      labels: {
        value: ""
      },

      selectors: null,

      render: null
    },

    hideEmpty: true,

    trustedMediaHTML: true,

    afterRender: null
  };

  const DEFAULT_CART = {
    selectors: DEFAULT_CART_SELECTORS,

    fields: {
      title: "titulo",
      value: "coste"
    },

    showValue: true,

    showCurrency: true,

    showQuantity: true,

    renderFields: true,

    hideEmpty: true,

    afterRender: null
  };

  /*
   * Utilidades
   */

  function getRawItem(item) {
    return item?.raw || item || {};
  }

  function readPath(source, path) {
    if (
      source === undefined ||
      source === null ||
      path === undefined ||
      path === null ||
      path === ""
    ) {
      return undefined;
    }

    if (typeof path === "function") {
      return path(source);
    }

    return String(path)
      .split(".")
      .reduce((current, key) => {
        return current?.[key];
      }, source);
  }

  function resolveItemValue(
    item,
    source,
    context = {}
  ) {
    if (typeof source === "function") {
      return source({
        item,
        rawItem: getRawItem(item),
        ...context
      });
    }

    if (source === "$title") {
      return context.shop?.getTitle(item) ??
        item?.title;
    }

    if (
      typeof source === "string" &&
      source.startsWith("$item.")
    ) {
      return readPath(
        item,
        source.slice(6)
      );
    }

    if (
      typeof source === "string" &&
      source.startsWith("$raw.")
    ) {
      return readPath(
        getRawItem(item),
        source.slice(5)
      );
    }

    const rawValue = readPath(
      getRawItem(item),
      source
    );

    if (rawValue !== undefined) {
      return rawValue;
    }

    return readPath(item, source);
  }

  function queryAll(root, selector) {
    if (!root || !selector) {
      return [];
    }

    return Array.from(
      root.querySelectorAll(selector)
    );
  }

  function setText(
    root,
    selector,
    value,
    options = {}
  ) {
    const {
      hideEmpty = true
    } = options;

    const stringValue =
      value === undefined ||
      value === null
        ? ""
        : String(value);

    queryAll(root, selector).forEach(
      (element) => {
        element.textContent =
          stringValue;

        if (hideEmpty) {
          element.hidden =
            !stringValue.trim();
        }
      }
    );
  }

  function removeElements(
    root,
    selector
  ) {
    queryAll(root, selector).forEach(
      (element) => element.remove()
    );
  }

  function setCurrency(
    root,
    selector,
    currency,
    enabled = true
  ) {
    if (!enabled) {
      removeElements(root, selector);
      return;
    }

    queryAll(root, selector).forEach(
      (element) => {
        element.textContent =
          String(currency || "");
      }
    );
  }

  function applyMedia(
    root,
    selector,
    value,
    options = {}
  ) {
    const {
      trustedHTML = true,
      hideEmpty = true
    } = options;

    const elements =
      queryAll(root, selector);

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      if (hideEmpty) {
        elements.forEach(
          (element) => element.remove()
        );
      }

      return;
    }

    elements.forEach((element) => {
      if (value instanceof Node) {
        element.replaceChildren(
          value.cloneNode(true)
        );

        return;
      }

      if (trustedHTML) {
        element.innerHTML =
          String(value);
      } else {
        element.textContent =
          String(value);
      }
    });
  }

  function renderTags(
    root,
    selector,
    tags
  ) {
    const container =
      root.querySelector(selector);

    if (!container) return;

    const values =
      Array.isArray(tags)
        ? tags.filter(Boolean)
        : [];

    if (!values.length) {
      container.remove();
      return;
    }

    const fragment =
      document.createDocumentFragment();

    values.forEach((tag) => {
      const element =
        document.createElement("li");

      element.className =
        "shop-item-tag";

      element.textContent =
        String(tag);

      fragment.appendChild(element);
    });

    container.replaceChildren(
      fragment
    );
  }

  function createFallbackItem() {
    const article =
      document.createElement("article");

    article.className = "shop-item";

    article.innerHTML = `
      <h3 data-shop-item-title></h3>
      <p data-shop-item-description></p>
      <p data-shop-item-effect></p>

      <p class="shop-item-price">
        <span data-shop-item-value></span>
        <span data-shop-currency></span>
      </p>

      <ul data-shop-item-tags></ul>

      <footer class="shop-item-controls">
        <label
          class="sr-only"
          data-shop-quantity-label
        >
          Cantidad
        </label>

        <input
          type="number"
          data-shop-quantity
        />

        <button
          type="button"
          data-shop-action="add"
        >
          Añadir
        </button>
      </footer>
    `;

    return article;
  }

  function createFallbackCartItem() {
    const article =
      document.createElement("article");

    article.className = "cart-item";

    article.innerHTML = `
      <span data-cart-item-title></span>

      <span data-cart-item-value></span>

      <span data-shop-currency></span>

      <button
        type="button"
        data-cart-action="remove"
      >
        Quitar
      </button>

      <button
        type="button"
        data-cart-action="decrease"
      >
        −
      </button>

      <label
        class="sr-only"
        data-cart-quantity-label
      >
        Cantidad
      </label>

      <input
        type="number"
        data-cart-quantity
      />

      <button
        type="button"
        data-cart-action="increase"
      >
        +
      </button>

      <div data-cart-fields></div>
    `;

    return article;
  }

  function getTemplateNode(
    context,
    fallbackFactory
  ) {
    const node =
      typeof context.template ===
      "function"
        ? context.template()
        : null;

    return node instanceof Element
      ? node
      : fallbackFactory();
  }

  function normalizeDefinition(
    definition,
    fallbackType
  ) {
    if (typeof definition === "string") {
      return {
        type: definition
      };
    }

    if (!utils.isPlainObject(definition)) {
      return {
        type: fallbackType
      };
    }

    return definition;
  }

  /*
   * Renderer card
   */

  function renderCard(
    options,
    context
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_CARD,
      options || {}
    );

    const {
      item,
      shop
    } = context;

    const node = getTemplateNode(
      context,
      createFallbackItem
    );

    const selectors =
      config.selectors;

    const fields =
      config.fields;

    const title =
      fields.title === "$title"
        ? shop.getTitle(item)
        : resolveItemValue(
            item,
            fields.title,
            { shop }
          ) ??
          shop.getTitle(item);

    setText(
      node,
      selectors.category,
      resolveItemValue(
        item,
        fields.category,
        { shop }
      ),
      config
    );

    setText(
      node,
      selectors.title,
      title,
      config
    );

    setText(
      node,
      selectors.description,
      resolveItemValue(
        item,
        fields.description,
        { shop }
      ),
      config
    );

    setText(
      node,
      selectors.effect,
      resolveItemValue(
        item,
        fields.effect,
        { shop }
      ),
      config
    );

    setText(
      node,
      selectors.value,
      resolveItemValue(
        item,
        fields.value,
        { shop }
      ),
      config
    );

    setCurrency(
      node,
      selectors.currency,
      shop.config.currency,
      true
    );

    applyMedia(
      node,
      selectors.media,
      resolveItemValue(
        item,
        fields.media,
        { shop }
      ),
      {
        trustedHTML:
          config.trustedMediaHTML,

        hideEmpty:
          config.hideEmpty
      }
    );

    renderTags(
      node,
      selectors.tags,
      resolveItemValue(
        item,
        fields.tags,
        { shop }
      ) ?? item.tags
    );

    if (
      typeof config.afterRender ===
      "function"
    ) {
      config.afterRender({
        node,
        item,
        shop,
        context
      });
    }

    return node;
  }

  /*
   * Renderer group-card
   */

  function renderGroupCard(
    options,
    context
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_GROUP_CARD,
      options || {}
    );

    const node = renderCard(
      config,
      context
    );

    renderMeta(
      node,
      config.meta,
      context
    );

    renderChildren(
      node,
      config.children,
      context
    );

    return node;
  }

  function renderMeta(
    node,
    definitions,
    context
  ) {
    const values =
      Array.isArray(definitions)
        ? definitions
        : [];

    if (!values.length) return;

    let container =
      node.querySelector(
        "[data-shop-item-meta]"
      );

    if (!container) {
      container =
        document.createElement("dl");

      container.className =
        "shop-item-meta";

      container.dataset.shopItemMeta =
        "";

      const children =
        node.querySelector(
          DEFAULT_ITEM_SELECTORS.children
        );

      if (children) {
        children.before(container);
      } else {
        node.appendChild(container);
      }
    }

    const fragment =
      document.createDocumentFragment();

    values.forEach((definition) => {
      if (
        !utils.isPlainObject(
          definition
        )
      ) {
        return;
      }

      const value =
        resolveItemValue(
          context.item,
          definition.field,
          {
            shop: context.shop
          }
        );

      if (
        definition.hideEmpty !== false &&
        (
          value === undefined ||
          value === null ||
          value === ""
        )
      ) {
        return;
      }

      const term =
        document.createElement("dt");

      const description =
        document.createElement("dd");

      term.textContent =
        String(
          definition.label || ""
        );

      description.textContent =
        String(value ?? "");

      fragment.append(
        term,
        description
      );
    });

    container.replaceChildren(
      fragment
    );

    if (!container.children.length) {
      container.remove();
    }
  }

  function renderChildren(
    node,
    definition,
    context
  ) {
    const container =
      node.querySelector(
        DEFAULT_ITEM_SELECTORS.children
      );

    if (!container) return;

    const config = utils.deepMerge(
      {},
      DEFAULT_GROUP_CARD.children,
      definition || {}
    );

    const children =
      resolveItemValue(
        context.item,
        config.field,
        {
          shop: context.shop
        }
      );

    if (
      !Array.isArray(children) ||
      !children.length
    ) {
      container.remove();
      return;
    }

    const fragment =
      document.createDocumentFragment();

    children.forEach(
      (child, index) => {
        const childNode =
          typeof config.render ===
          "function"
            ? config.render({
                child,
                index,
                item: context.item,
                shop: context.shop
              })
            : renderDefaultChild(
                child,
                config
              );

        if (childNode instanceof Node) {
          fragment.appendChild(
            childNode
          );
        }
      }
    );

    container.replaceChildren(
      fragment
    );
  }

  function renderDefaultChild(
    child,
    config
  ) {
    const tag = String(
      config.element || "article"
    ).toLowerCase();

    const allowedTag =
      /^[a-z][a-z0-9-]*$/.test(tag)
        ? tag
        : "article";

    const element =
      document.createElement(
        allowedTag
      );

    element.className =
      String(
        config.className ||
        "shop-item-child"
      );

    const fields =
      config.fields || {};

    appendChildField(
      element,
      "title",
      readPath(child, fields.title),
      "h4"
    );

    appendChildField(
      element,
      "description",
      readPath(
        child,
        fields.description
      ),
      "p"
    );

    appendChildField(
      element,
      "effect",
      readPath(child, fields.effect),
      "p"
    );

    const childValue =
      readPath(child, fields.value);

    if (
      childValue !== undefined &&
      childValue !== null &&
      childValue !== ""
    ) {
      const value =
        document.createElement("p");

      value.className =
        "shop-item-child-value";

      const label =
        config.labels?.value;

      value.textContent = label
        ? `${label}: ${childValue}`
        : String(childValue);

      element.appendChild(value);
    }

    return element;
  }

  function appendChildField(
    root,
    name,
    value,
    tagName
  ) {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    const element =
      document.createElement(tagName);

    element.className =
      `shop-item-child-${name}`;

    element.textContent =
      String(value);

    root.appendChild(element);
  }

  /*
   * Renderer basic-cart
   */

  function renderBasicCart(
    options,
    context
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_CART,
      options || {}
    );

    const {
      item,
      entry,
      sectionName,
      shop
    } = context;

    const node = getTemplateNode(
      context,
      createFallbackCartItem
    );

    const selectors =
      config.selectors;

    const title =
      resolveItemValue(
        item,
        config.fields.title,
        {
          shop,
          entry,
          sectionName
        }
      ) ??
      shop.getTitle(item);

    const value =
      resolveItemValue(
        item,
        config.fields.value,
        {
          shop,
          entry,
          sectionName
        }
      );

    setText(
      node,
      selectors.title,
      title,
      config
    );

    if (config.showValue) {
      setText(
        node,
        selectors.value,
        value,
        config
      );
    } else {
      removeElements(
        node,
        selectors.value
      );
    }

    setCurrency(
      node,
      selectors.currency,
      shop.config.currency,
      config.showCurrency &&
        config.showValue
    );

    prepareCartActions(
      node,
      selectors
    );

    prepareCartQuantity(
      node,
      selectors,
      item,
      entry,
      shop,
      config
    );

    if (config.renderFields) {
      mountFields(
        node,
        selectors.fields,
        context
      );
    } else {
      removeElements(
        node,
        selectors.fields
      );
    }

    if (
      typeof config.afterRender ===
      "function"
    ) {
      config.afterRender({
        node,
        item,
        entry,
        sectionName,
        shop,
        context
      });
    }

    return node;
  }

  function prepareCartActions(
    node,
    selectors
  ) {
    const actions = [
      [selectors.remove, "remove"],
      [selectors.decrease, "decrease"],
      [selectors.increase, "increase"]
    ];

    actions.forEach(
      ([selector, action]) => {
        queryAll(node, selector).forEach(
          (button) => {
            button.dataset.cartAction =
              action;
          }
        );
      }
    );
  }

  function prepareCartQuantity(
    node,
    selectors,
    item,
    entry,
    shop,
    rendererConfig
  ) {
    const input =
      node.querySelector(
        selectors.quantity
      );

    const label =
      node.querySelector(
        selectors.quantityLabel
      );

    const quantity =
      shop.getQuantityConfig(item);

    if (
      !rendererConfig.showQuantity ||
      !quantity.enabled
    ) {
      input?.remove();
      label?.remove();

      removeElements(
        node,
        selectors.decrease
      );

      removeElements(
        node,
        selectors.increase
      );

      return;
    }

    if (!input) return;

    const id = [
      "pixie-cart",
      shop.name,
      entry.uid,
      "quantity"
    ].join("-");

    input.id = id;

    input.value =
      String(entry.quantity);

    input.min =
      String(quantity.min);

    input.max =
      String(quantity.max);

    input.step =
      String(quantity.step);

    input.dataset.cartQuantity = "";

    const text = utils.format(
      shop.config.messages.quantity,
      {
        item: shop.getTitle(item)
      }
    );

    if (label) {
      label.htmlFor = id;
      label.textContent = text;
    } else {
      input.setAttribute(
        "aria-label",
        text
      );
    }
  }

  function mountFields(
    node,
    selector,
    context
  ) {
    const container =
      node.querySelector(selector);

    if (!container) return;

    const fieldModule =
      PixieShop.hasModule("fields")
        ? PixieShop.use("fields")
        : null;

    if (!fieldModule) {
      console.warn(
        "[PixieShopRenderers] El renderer del carrito necesita pixie-shop-fields.js."
      );

      container.remove();
      return;
    }

    const definitions =
      context.shop.getSectionConfig(
        context.sectionName
      )?.fields || [];

    if (!definitions.length) {
      container.remove();
      return;
    }

    fieldModule.mount(
      container,
      definitions,
      {
        entry: context.entry,
        item: context.item,
        sectionName:
          context.sectionName,
        shop: context.shop
      }
    );
  }

  /*
   * Renderer compact-cart
   */

  function renderCompactCart(
    options,
    context
  ) {
    return renderBasicCart(
      utils.deepMerge(
        {},
        {
          showValue: false,
          showCurrency: false,
          showQuantity: false,
          renderFields: true
        },
        options || {}
      ),
      context
    );
  }

  /*
   * Fábricas públicas
   */

  function card(options = {}) {
    return (context) => {
      return renderCard(
        options,
        context
      );
    };
  }

  function groupCard(options = {}) {
    return (context) => {
      return renderGroupCard(
        options,
        context
      );
    };
  }

  function basicCart(options = {}) {
    return (context) => {
      return renderBasicCart(
        options,
        context
      );
    };
  }

  function compactCart(options = {}) {
    return (context) => {
      return renderCompactCart(
        options,
        context
      );
    };
  }

  /*
   * Resolvedor declarativo
   */

  const rendererTypes = {
    card: renderCard,

    "group-card":
      renderGroupCard,

    "basic-cart":
      renderBasicCart,

    "compact-cart":
      renderCompactCart
  };

  function resolve(
    definition,
    context = {}
  ) {
    if (typeof definition === "function") {
      return definition(context);
    }

    const normalized =
      normalizeDefinition(
        definition,
        context.target === "cart"
          ? "basic-cart"
          : "card"
      );

    const type =
      normalized.type;

    const renderer =
      rendererTypes[type];

    if (!renderer) {
      throw new Error(
        `[PixieShopRenderers] No existe el renderer “${type}”.`
      );
    }

    const options = {
      ...normalized
    };

    delete options.type;

    return renderer(
      options,
      context
    );
  }

  /*
   * API pública
   */

  const PixieShopRenderers = {
    version: VERSION,

    resolve,

    card,

    groupCard,

    basicCart,

    compactCart,

    renderCard,

    renderGroupCard,

    renderBasicCart,

    renderCompactCart,

    utils: {
      readPath,
      resolveItemValue,
      setText,
      setCurrency,
      applyMedia,
      renderTags,
      createFallbackItem,
      createFallbackCartItem
    }
  };

  PixieShop.module(
    MODULE_NAME,
    PixieShopRenderers
  );
})(window, document);
