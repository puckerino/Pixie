/*!
 * PixieShop.js
 * Núcleo modular y declarativo de tiendas para Pixie.
 *
 * @version 1.0.0
 *
 * RESPONSABILIDADES DEL NÚCLEO
 * ----------------------------
 * - Registrar configuraciones de tiendas.
 * - Registrar y resolver módulos reutilizables.
 * - Inicializar instancias desde [data-pixie-shop].
 * - Mantener el estado y el carrito.
 * - Gestionar cantidades, duplicados y secciones.
 * - Guardar el carrito en localStorage.
 * - Conectar filtros, acciones y envío del formulario.
 * - Ejecutar renderers, validadores, cálculos y outputs externos.
 *
 * NO CONTIENE
 * -----------
 * - Renderizado concreto.
 * - Reglas de compras o retiradas.
 * - Cálculos específicos.
 * - Formatos de publicación concretos.
 * - Reglas sobre recompensas, items, niveles o ecos.
 */

(function (window, document) {
  "use strict";

  const MODULE_NAME = "PixieShop";
  const VERSION = "1.0.0";
  const STORAGE_VERSION = 1;

  /*
   * Registro de configuraciones de tiendas.
   *
   * PixieShop.register("items", {...});
   */
  const shopRegistry = new Map();

  /*
   * Registro de módulos reutilizables.
   *
   * PixieShop.module("renderers", {...});
   */
  const moduleRegistry = new Map();

  /*
   * Relación entre elementos HTML e instancias.
   */
  const instances = new WeakMap();

  /*
   * Lista iterable de instancias activas.
   */
  const activeInstances = new Set();

  const DEFAULT_CONFIG = {
    items: [],

    currency: "",

    storageKey: "",

    persist: true,

    requireLogin: false,

    itemsPerPage: 24,

    features: {
      search: true,
      sort: true,
      categories: true,
      tags: true
    },

    fields: {
      id: "id",
      title: "titulo",
      category: "categoria",
      tags: "tags",
      value: "coste"
    },

    quantity: {
      enabled: true,
      min: 1,
      max: 99,
      step: 1
    },

    cart: {
      defaultSection: "default",
      mergeDuplicates: true,
      uniqueItems: false,

      sectionResolver: null
    },

    sections: {
      default: {
        label: "CARRITO",
        emptyText: "No hay elementos.",

        fields: [],

        total: {
          type: "none"
        }
      }
    },

    renderer: {
      item: null,
      cart: null
    },

    validation: {
      rules: []
    },

    output: {
      codeBlock: true,
      sections: {},
      totals: [],

      outsideFields: {
        enabled: true,
        title: "JUSTIFICANTES"
      }
    },

    selectors: {
      searchWrap: "[data-shop-search-wrap]",
      search: "[data-shop-search]",

      sort: "[data-shop-sort]",

      categoriesWrap: "[data-shop-categories-wrap]",
      categories: "[data-shop-categories]",

      tagsWrap: "[data-shop-tags-wrap]",
      tags: "[data-shop-tags]",

      items: "[data-shop-items]",
      loadMore: "[data-shop-load-more]",

      cart: "[data-shop-cart]",
      cartClear: "[data-shop-cart-clear]",

      message: [
        "[data-shop-message]",
        "textarea[name='message']"
      ].join(", "),

      itemTemplate: "[data-shop-item-template]",

      cartItemTemplate:
        "[data-shop-cart-item-template]"
    },

    messages: {
      allCategories: "Todas",
      noTags: "Sin etiquetas",
      noResults: "No hay elementos para mostrar.",

      uniqueItem:
        "{item} ya está en el carrito.",

      loginRequired:
        "Debes iniciar sesión para utilizar esta tienda.",

      missingRenderer:
        "No se ha configurado un renderer para {target}.",

      missingOutput:
        "No se ha configurado la generación del mensaje.",

      missingMessage:
        "No se encontró el campo del mensaje.",

      quantity:
        "Cantidad de {item}",

      remove:
        "Quitar {item}",

      increase:
        "Sumar una unidad de {item}",

      decrease:
        "Restar una unidad de {item}"
    },

    /*
     * Escape hatch para comportamientos especiales.
     *
     * Los módulos declarativos se usan primero.
     * Estos hooks pueden sustituir o extender su comportamiento.
     */
    hooks: {
      normalizeItem: null,

      getTitle: null,

      getSearchText: null,

      getSection: null,

      renderItem: null,

      renderCartItem: null,

      validateEntry: null,

      buildMessage: null,

      afterCartChange: null,

      beforeSubmit: null,

      afterSubmitPreparation: null
    }
  };

  /*
   * Utilidades
   */

  function isPlainObject(value) {
    return (
      Object.prototype.toString.call(value) ===
      "[object Object]"
    );
  }

  function deepMerge(target, ...sources) {
    const output = isPlainObject(target)
      ? { ...target }
      : {};

    sources.forEach((source) => {
      if (!isPlainObject(source)) return;

      Object.entries(source).forEach(
        ([key, value]) => {
          if (Array.isArray(value)) {
            output[key] = value.slice();
            return;
          }

          if (isPlainObject(value)) {
            output[key] = deepMerge(
              isPlainObject(output[key])
                ? output[key]
                : {},
              value
            );

            return;
          }

          output[key] = value;
        }
      );
    });

    return output;
  }

  function format(template, values = {}) {
    return String(template ?? "").replace(
      /\{([^}]+)\}/g,
      (_, key) => values[key] ?? ""
    );
  }

  function normalizeText(value) {
    return String(value ?? "")
      .trim()
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function normalizeName(value) {
    return String(value ?? "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "");
  }

  function toNumber(value, fallback = 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  function toArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return [];
    }

    return [value];
  }

  function createUid(prefix = "entry") {
    if (window.crypto?.randomUUID) {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return [
      prefix,
      Date.now(),
      Math.random()
        .toString(36)
        .slice(2, 10)
    ].join("-");
  }

  function currentUserId() {
    return String(
      window._userdata?.user_id || "guest"
    );
  }

  function isLoggedIn() {
    return Boolean(
      window._userdata?.session_logged_in
    );
  }

  function clone(value) {
    if (
      typeof window.structuredClone ===
      "function"
    ) {
      return window.structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  /*
   * Instancia de una tienda.
   */

  class PixieShopInstance {
    constructor(root, name, config) {
      this.root = root;

      this.form =
        root instanceof HTMLFormElement
          ? root
          : root.closest("form");

      this.name = name;

      this.config = deepMerge(
        {},
        DEFAULT_CONFIG,
        config
      );

      this.abortController =
        new AbortController();

      this.elements = {};

      this.items = this.prepareItems(
        this.config.items
      );

      this.itemMap = new Map(
        this.items.map((item) => {
          return [item.id, item];
        })
      );

      this.state = {
        search: "",
        category: "",
        tags: [],
        sort: "name-asc",

        visibleCount:
          this.config.itemsPerPage,

        cart: {
          version: STORAGE_VERSION,
          sections: {}
        }
      };

      this.storageKey =
        this.createStorageKey();

      this.ready = false;
    }

    init() {
      if (this.ready) {
        return this;
      }

      if (
        this.config.requireLogin &&
        !isLoggedIn()
      ) {
        this.disable(
          this.config.messages.loginRequired
        );

        return this;
      }

      this.cacheElements();
      this.ensureSections();
      this.loadCart();
      this.setupOptionalUI();
      this.renderFilters();
      this.renderItems(true);
      this.renderCart();
      this.bindEvents();

      this.ready = true;

      this.root.dataset.pixieShopReady =
        "true";

      this.emit("pixie-shop:ready", {
        name: this.name
      });

      return this;
    }

    destroy() {
      this.abortController.abort();

      delete this.root.dataset
        .pixieShopReady;

      instances.delete(this.root);
      activeInstances.delete(this);

      this.ready = false;

      this.emit("pixie-shop:destroy");
    }

    /*
     * Preparación de artículos
     */

    prepareItems(items) {
      const source = Array.isArray(items)
        ? items
        : [];

      const seen = new Set();

      return source
        .map((rawItem, index) => {
          return this.normalizeItem(
            rawItem,
            index
          );
        })
        .filter((item) => {
          if (!item.id) {
            console.warn(
              `[PixieShop:${this.name}] Artículo sin ID.`,
              item
            );

            return false;
          }

          if (seen.has(item.id)) {
            console.warn(
              `[PixieShop:${this.name}] ID duplicado: ${item.id}`
            );

            return false;
          }

          seen.add(item.id);

          return true;
        });
    }

    normalizeItem(rawItem, index) {
      const fields = this.config.fields;

      let item = {
        ...rawItem,

        id: String(
          rawItem?.[fields.id] ??
            rawItem?.id ??
            `item-${index + 1}`
        ).trim(),

        title: String(
          rawItem?.[fields.title] ??
            rawItem?.titulo ??
            rawItem?.nombre ??
            ""
        ).trim(),

        category: String(
          rawItem?.[fields.category] ??
            rawItem?.categoria ??
            ""
        ).trim(),

        tags: Array.isArray(
          rawItem?.[fields.tags]
        )
          ? rawItem[fields.tags]
              .filter(Boolean)
              .map(String)
          : [],

        value: toNumber(
          rawItem?.[fields.value],
          0
        ),

        raw: rawItem
      };

      if (
        typeof this.config.hooks
          .normalizeItem === "function"
      ) {
        item =
          this.config.hooks.normalizeItem({
            item,
            rawItem,
            index,
            shop: this
          }) || item;
      }

      return item;
    }

    getItem(itemId) {
      return (
        this.itemMap.get(
          String(itemId)
        ) || null
      );
    }

    getTitle(item) {
      if (
        typeof this.config.hooks
          .getTitle === "function"
      ) {
        return (
          this.config.hooks.getTitle({
            item,
            shop: this
          }) ?? item.title
        );
      }

      return item.title;
    }

    /*
     * Elementos HTML
     */

    cacheElements() {
      const selectors =
        this.config.selectors;

      const query = (selector) => {
        if (!selector) return null;

        return this.root.querySelector(
          selector
        );
      };

      this.elements = {
        searchWrap: query(
          selectors.searchWrap
        ),

        search: query(
          selectors.search
        ),

        sort: query(
          selectors.sort
        ),

        categoriesWrap: query(
          selectors.categoriesWrap
        ),

        categories: query(
          selectors.categories
        ),

        tagsWrap: query(
          selectors.tagsWrap
        ),

        tags: query(
          selectors.tags
        ),

        items: query(
          selectors.items
        ),

        loadMore: query(
          selectors.loadMore
        ),

        cart: query(
          selectors.cart
        ),

        cartClear: query(
          selectors.cartClear
        ),

        message: query(
          selectors.message
        ),

        itemTemplate: query(
          selectors.itemTemplate
        ),

        cartItemTemplate: query(
          selectors.cartItemTemplate
        )
      };
    }

    cloneTemplate(template) {
      if (
        !(
          template instanceof
          HTMLTemplateElement
        )
      ) {
        return null;
      }

      return (
        template.content
          .firstElementChild
          ?.cloneNode(true) || null
      );
    }

    /*
     * Módulos y resolutores
     */

    resolve(moduleName, definition, context = {}) {
      return PixieShop.resolve(
        moduleName,
        definition,
        {
          ...context,
          shop: this
        }
      );
    }

    /*
     * Persistencia
     */

    createStorageKey() {
      const base =
        this.config.storageKey ||
        `pixie_shop_${this.name}`;

      return [
        base,
        currentUserId(),
        `v${STORAGE_VERSION}`
      ].join("_");
    }

    saveCart() {
      if (!this.config.persist) return;

      try {
        localStorage.setItem(
          this.storageKey,
          JSON.stringify(
            this.state.cart
          )
        );
      } catch (error) {
        console.warn(
          `[PixieShop:${this.name}] No se pudo guardar el carrito.`,
          error
        );
      }
    }

    loadCart() {
      if (!this.config.persist) {
        return;
      }

      try {
        const raw = localStorage.getItem(
          this.storageKey
        );

        if (!raw) return;

        const saved = JSON.parse(raw);

        if (
          !saved ||
          !isPlainObject(saved.sections)
        ) {
          return;
        }

        Object.keys(
          this.config.sections
        ).forEach((sectionName) => {
          const savedEntries =
            Array.isArray(
              saved.sections[sectionName]
            )
              ? saved.sections[
                  sectionName
                ]
              : [];

          this.state.cart.sections[
            sectionName
          ] = savedEntries
            .filter((entry) => {
              return this.itemMap.has(
                String(entry.itemId)
              );
            })
            .map((entry) => {
              const item = this.getItem(
                entry.itemId
              );

              return {
                uid: String(
                  entry.uid ||
                    createUid("cart")
                ),

                itemId: String(
                  entry.itemId
                ),

                section: sectionName,

                quantity:
                  this.normalizeQuantity(
                    entry.quantity,
                    item
                  ),

                fields: isPlainObject(
                  entry.fields
                )
                  ? entry.fields
                  : {}
              };
            });
        });
      } catch (error) {
        console.warn(
          `[PixieShop:${this.name}] No se pudo cargar el carrito.`,
          error
        );
      }
    }

    /*
     * Secciones y carrito
     */

    ensureSections() {
      Object.keys(
        this.config.sections
      ).forEach((sectionName) => {
        if (
          !Array.isArray(
            this.state.cart.sections[
              sectionName
            ]
          )
        ) {
          this.state.cart.sections[
            sectionName
          ] = [];
        }
      });
    }

    getSectionEntries(sectionName) {
      return (
        this.state.cart.sections[
          sectionName
        ] || []
      );
    }

    getSectionConfig(sectionName) {
      return (
        this.config.sections[
          sectionName
        ] || null
      );
    }

    resolveSection(
      action,
      item,
      itemNode
    ) {
      if (
        typeof this.config.hooks
          .getSection === "function"
      ) {
        const hookResult =
          this.config.hooks.getSection({
            action,
            item,
            itemNode,
            shop: this
          });

        if (
          hookResult &&
          this.config.sections[
            hookResult
          ]
        ) {
          return hookResult;
        }
      }

      const resolver =
        this.config.cart
          .sectionResolver;

      if (resolver) {
        const result = this.resolve(
          "sections",
          resolver,
          {
            action,
            item,
            itemNode
          }
        );

        if (
          result &&
          this.config.sections[result]
        ) {
          return result;
        }
      }

      if (
        action &&
        this.config.sections[action]
      ) {
        return action;
      }

      return (
        this.config.cart
          .defaultSection ||
        Object.keys(
          this.config.sections
        )[0]
      );
    }

    /*
     * Cantidades
     */

    getQuantityConfig(item) {
      return deepMerge(
        {},
        this.config.quantity,
        item?.quantity || {}
      );
    }

    normalizeQuantity(value, item) {
      const config =
        this.getQuantityConfig(item);

      if (!config.enabled) {
        return 1;
      }

      const min = toNumber(
        config.min,
        1
      );

      const max = toNumber(
        config.max,
        99
      );

      const parsed = Math.floor(
        toNumber(value, min)
      );

      return Math.max(
        min,
        Math.min(max, parsed)
      );
    }

    /*
     * Campos iniciales del carrito
     */

    createInitialFields(sectionName) {
      const fields =
        this.getSectionConfig(
          sectionName
        )?.fields || [];

      const values = {};

      fields.forEach((field) => {
        const name = normalizeName(
          field.name
        );

        if (!name) return;

        if (field.repeatable) {
          const initial = Array.isArray(
            field.defaultValue
          )
            ? field.defaultValue.slice()
            : [];

          const minimum = toNumber(
            field.min,
            0
          );

          while (
            initial.length < minimum
          ) {
            initial.push("");
          }

          values[name] = initial;
          return;
        }

        values[name] = String(
          field.defaultValue ?? ""
        );
      });

      return values;
    }

    /*
     * Operaciones del carrito
     */

    add(
      itemId,
      sectionName,
      quantity = 1
    ) {
      const item = this.getItem(itemId);

      const entries =
        this.getSectionEntries(
          sectionName
        );

      if (
        !item ||
        !this.config.sections[
          sectionName
        ]
      ) {
        return null;
      }

      const unique =
        item.unique ??
        this.config.cart.uniqueItems;

      const mergeDuplicates =
        item.mergeDuplicates ??
        this.config.cart
          .mergeDuplicates;

      const existing = entries.find(
        (entry) => {
          return entry.itemId === item.id;
        }
      );

      if (unique && existing) {
        this.notice(
          format(
            this.config.messages
              .uniqueItem,
            {
              item: this.getTitle(item)
            }
          ),
          "warning"
        );

        return existing;
      }

      if (
        mergeDuplicates &&
        existing
      ) {
        existing.quantity =
          this.normalizeQuantity(
            existing.quantity +
              toNumber(quantity, 1),
            item
          );

        this.cartChanged();

        return existing;
      }

      const entry = {
        uid: createUid("cart"),

        itemId: item.id,

        section: sectionName,

        quantity:
          this.normalizeQuantity(
            quantity,
            item
          ),

        fields:
          this.createInitialFields(
            sectionName
          )
      };

      entries.push(entry);

      this.cartChanged();

      this.emit(
        "pixie-shop:item-added",
        {
          item,
          entry,
          sectionName
        }
      );

      return entry;
    }

    findEntry(entryUid) {
      for (
        const [
          sectionName,
          entries
        ] of Object.entries(
          this.state.cart.sections
        )
      ) {
        const index =
          entries.findIndex(
            (entry) => {
              return (
                entry.uid === entryUid
              );
            }
          );

        if (index >= 0) {
          return {
            sectionName,
            entries,
            index,
            entry: entries[index]
          };
        }
      }

      return null;
    }

    remove(entryUid) {
      const found =
        this.findEntry(entryUid);

      if (!found) return;

      const [entry] =
        found.entries.splice(
          found.index,
          1
        );

      this.cartChanged();

      this.emit(
        "pixie-shop:item-removed",
        {
          entry,
          sectionName:
            found.sectionName
        }
      );
    }

    clear() {
      Object.keys(
        this.state.cart.sections
      ).forEach((sectionName) => {
        this.state.cart.sections[
          sectionName
        ] = [];
      });

      this.cartChanged();

      this.emit(
        "pixie-shop:cart-cleared"
      );
    }

    updateQuantity(
      entryUid,
      value
    ) {
      const found =
        this.findEntry(entryUid);

      if (!found) return;

      const item = this.getItem(
        found.entry.itemId
      );

      found.entry.quantity =
        this.normalizeQuantity(
          value,
          item
        );

      this.cartChanged(false);
    }

    changeQuantity(
      entryUid,
      amount
    ) {
      const found =
        this.findEntry(entryUid);

      if (!found) return;

      const next =
        found.entry.quantity +
        amount;

      if (next <= 0) {
        this.remove(entryUid);
        return;
      }

      this.updateQuantity(
        entryUid,
        next
      );

      this.renderCart();
    }

    updateField(
      entryUid,
      fieldName,
      value,
      index = null
    ) {
      const found =
        this.findEntry(entryUid);

      if (!found) return;

      const name =
        normalizeName(fieldName);

      if (!name) return;

      if (index === null) {
        found.entry.fields[name] =
          String(value ?? "");
      } else {
        const values =
          Array.isArray(
            found.entry.fields[name]
          )
            ? found.entry.fields[name]
            : [];

        values[index] = String(
          value ?? ""
        );

        found.entry.fields[name] =
          values;
      }

      this.saveCart();

      this.emit(
        "pixie-shop:field-change",
        {
          entry: found.entry,
          fieldName: name,
          index,
          value
        }
      );
    }

    addRepeatableField(
      entryUid,
      fieldName
    ) {
      const found =
        this.findEntry(entryUid);

      if (!found) return;

      const field = this.getFieldConfig(
        found.sectionName,
        fieldName
      );

      if (!field?.repeatable) {
        return;
      }

      const name =
        normalizeName(field.name);

      const values =
        Array.isArray(
          found.entry.fields[name]
        )
          ? found.entry.fields[name]
          : [];

      const maximum =
        field.max === null ||
        field.max === undefined
          ? Infinity
          : toNumber(field.max, Infinity);

      if (
        values.length >= maximum
      ) {
        return;
      }

      values.push("");

      found.entry.fields[name] =
        values;

      this.cartChanged();
    }

    removeRepeatableField(
      entryUid,
      fieldName,
      index
    ) {
      const found =
        this.findEntry(entryUid);

      if (!found) return;

      const field = this.getFieldConfig(
        found.sectionName,
        fieldName
      );

      if (!field?.repeatable) {
        return;
      }

      const name =
        normalizeName(field.name);

      const values =
        Array.isArray(
          found.entry.fields[name]
        )
          ? found.entry.fields[name]
          : [];

      const minimum = toNumber(
        field.min,
        0
      );

      if (
        values.length <= minimum
      ) {
        return;
      }

      values.splice(index, 1);

      found.entry.fields[name] =
        values;

      this.cartChanged();
    }

    getFieldConfig(
      sectionName,
      fieldName
    ) {
      const fields =
        this.getSectionConfig(
          sectionName
        )?.fields || [];

      const normalized =
        normalizeName(fieldName);

      return (
        fields.find((field) => {
          return (
            normalizeName(field.name) ===
            normalized
          );
        }) || null
      );
    }

    cartChanged(render = true) {
      this.saveCart();

      if (render) {
        this.renderCart();
      }

      if (
        typeof this.config.hooks
          .afterCartChange === "function"
      ) {
        this.config.hooks
          .afterCartChange({
            cart: this.state.cart,
            shop: this
          });
      }

      this.emit(
        "pixie-shop:cart-change",
        {
          cart: clone(
            this.state.cart
          )
        }
      );
    }

    /*
     * Filtros
     */

    setupOptionalUI() {
      const features =
        this.config.features;

      const toggle = (
        element,
        enabled
      ) => {
        if (!element) return;

        element.hidden = !enabled;
      };

      toggle(
        this.elements.search,
        features.search
      );

      toggle(
        this.elements.sort,
        features.sort
      );

      toggle(
        this.elements.searchWrap,
        features.search ||
          features.sort
      );

      toggle(
        this.elements.categoriesWrap,
        features.categories
      );

      toggle(
        this.elements.tagsWrap,
        features.tags
      );

      this.root
        .querySelectorAll(
          "[data-shop-currency]"
        )
        .forEach((element) => {
          element.textContent =
            this.config.currency;
        });
    }

    renderFilters() {
      this.renderCategories();
      this.renderTags();
    }

    renderCategories() {
      if (
        !this.config.features.categories ||
        !this.elements.categories
      ) {
        return;
      }

      const categories = [
        ...new Set(
          this.items
            .map((item) => {
              return item.category;
            })
            .filter(Boolean)
        )
      ].sort((a, b) => {
        return a.localeCompare(b, "es");
      });

      const fragment =
        document.createDocumentFragment();

      fragment.appendChild(
        this.createCategoryButton(
          "",
          this.config.messages
            .allCategories,
          true
        )
      );

      categories.forEach(
        (category) => {
          fragment.appendChild(
            this.createCategoryButton(
              category,
              category,
              false
            )
          );
        }
      );

      this.elements.categories
        .replaceChildren(fragment);
    }

    createCategoryButton(
      value,
      label,
      active
    ) {
      const item =
        document.createElement("li");

      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.dataset.shopCategory =
        value;

      button.classList.toggle(
        "is-active",
        active
      );

      button.setAttribute(
        "aria-pressed",
        String(active)
      );

      button.textContent = label;

      item.appendChild(button);

      return item;
    }

    renderTags() {
      if (
        !this.config.features.tags ||
        !this.elements.tags
      ) {
        return;
      }

      const tags = [
        ...new Set(
          this.items.flatMap(
            (item) => item.tags
          )
        )
      ].sort((a, b) => {
        return a.localeCompare(b, "es");
      });

      if (!tags.length) {
        this.elements.tags.textContent =
          this.config.messages.noTags;

        return;
      }

      const fragment =
        document.createDocumentFragment();

      tags.forEach((tag, index) => {
        const item =
          document.createElement("li");

        const label =
          document.createElement(
            "label"
          );

        const input =
          document.createElement(
            "input"
          );

        const text =
          document.createElement(
            "span"
          );

        const id = [
          "pixie-shop",
          this.name,
          "tag",
          index
        ].join("-");

        input.id = id;
        input.type = "checkbox";
        input.value = tag;

        input.dataset.shopTag = "";

        label.htmlFor = id;

        text.textContent = tag;

        label.append(input, text);
        item.appendChild(label);
        fragment.appendChild(item);
      });

      this.elements.tags.replaceChildren(
        fragment
      );
    }

    getFilteredItems() {
      const filtered = this.items.filter(
        (item) => {
          const extraSearchText =
            typeof this.config.hooks
              .getSearchText === "function"
              ? this.config.hooks
                  .getSearchText({
                    item,
                    shop: this
                  })
              : "";

          const haystack = normalizeText(
            [
              this.getTitle(item),
              item.category,
              item.tags.join(" "),
              extraSearchText
            ].join(" ")
          );

          const matchesSearch =
            !this.config.features.search ||
            !this.state.search ||
            haystack.includes(
              this.state.search
            );

          const matchesCategory =
            !this.config.features
              .categories ||
            !this.state.category ||
            item.category ===
              this.state.category;

          const matchesTags =
            !this.config.features.tags ||
            !this.state.tags.length ||
            this.state.tags.every(
              (tag) => {
                return item.tags.includes(
                  tag
                );
              }
            );

          return (
            matchesSearch &&
            matchesCategory &&
            matchesTags
          );
        }
      );

      if (!this.config.features.sort) {
        return filtered;
      }

      if (
        typeof this.config.sort ===
        "function"
      ) {
        return filtered.sort((a, b) => {
          return this.config.sort(
            a,
            b,
            this.state.sort,
            this
          );
        });
      }

      return filtered.sort((a, b) => {
        const titleA =
          this.getTitle(a);

        const titleB =
          this.getTitle(b);

        if (
          this.state.sort ===
          "name-desc"
        ) {
          return titleB.localeCompare(
            titleA,
            "es"
          );
        }

        return titleA.localeCompare(
          titleB,
          "es"
        );
      });
    }

    /*
     * Renderizado
     */

    renderItems(reset = false) {
      if (!this.elements.items) {
        return;
      }

      if (reset) {
        this.state.visibleCount =
          this.config.itemsPerPage;
      }

      const filtered =
        this.getFilteredItems();

      const visible = filtered.slice(
        0,
        this.state.visibleCount
      );

      const fragment =
        document.createDocumentFragment();

      visible.forEach((item) => {
        const node =
          this.renderItem(item);

        if (node) {
          fragment.appendChild(node);
        }
      });

      this.elements.items
        .replaceChildren();

      if (!visible.length) {
        const empty =
          document.createElement("p");

        empty.className =
          "shop-empty-results";

        empty.textContent =
          this.config.messages.noResults;

        this.elements.items
          .appendChild(empty);
      } else {
        this.elements.items
          .appendChild(fragment);
      }

      if (this.elements.loadMore) {
        this.elements.loadMore.hidden =
          this.state.visibleCount >=
          filtered.length;
      }
    }

    renderItem(item) {
      let node = null;

      if (
        typeof this.config.hooks
          .renderItem === "function"
      ) {
        node =
          this.config.hooks.renderItem({
            item,
            shop: this,

            template: () => {
              return this.cloneTemplate(
                this.elements.itemTemplate
              );
            }
          });
      } else if (
        this.config.renderer.item
      ) {
        node = this.resolve(
          "renderers",
          this.config.renderer.item,
          {
            target: "item",
            item,

            template: () => {
              return this.cloneTemplate(
                this.elements.itemTemplate
              );
            }
          }
        );
      }

      if (!(node instanceof Element)) {
        console.warn(
          `[PixieShop:${this.name}] ${format(
            this.config.messages
              .missingRenderer,
            {
              target: "los artículos"
            }
          )}`
        );

        return null;
      }

      node.dataset.shopItemId =
        item.id;

      this.prepareItemQuantity(
        node,
        item
      );

      return node;
    }

    prepareItemQuantity(node, item) {
      const input =
        node.querySelector(
          "[data-shop-quantity]"
        );

      const label =
        node.querySelector(
          "[data-shop-quantity-label]"
        );

      if (!input) return;

      const quantity =
        this.getQuantityConfig(item);

      if (!quantity.enabled) {
        input.remove();
        label?.remove();
        return;
      }

      const id = [
        "pixie-shop",
        this.name,
        item.id,
        "quantity"
      ].join("-");

      input.id = id;

      input.min = String(
        quantity.min
      );

      input.max = String(
        quantity.max
      );

      input.step = String(
        quantity.step
      );

      input.value = String(
        quantity.min
      );

      const text = format(
        this.config.messages.quantity,
        {
          item: this.getTitle(item)
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

    renderCart() {
      Object.keys(
        this.config.sections
      ).forEach((sectionName) => {
        this.renderCartSection(
          sectionName
        );
      });

      this.renderTotals();
    }

    renderCartSection(sectionName) {
      const sectionRoot =
        this.root.querySelector(
          `[data-shop-section="${CSS.escape(
            sectionName
          )}"]`
        );

      if (!sectionRoot) return;

      const list =
        sectionRoot.querySelector(
          "[data-shop-section-list]"
        ) || sectionRoot;

      const entries =
        this.getSectionEntries(
          sectionName
        );

      list.replaceChildren();

      if (!entries.length) {
        const empty =
          document.createElement("p");

        empty.className =
          "shop-cart-empty";

        empty.textContent =
          this.getSectionConfig(
            sectionName
          )?.emptyText ||
          "No hay elementos.";

        list.appendChild(empty);

        return;
      }

      const fragment =
        document.createDocumentFragment();

      entries.forEach((entry) => {
        const node =
          this.renderCartItem(
            entry,
            sectionName
          );

        if (node) {
          fragment.appendChild(node);
        }
      });

      list.appendChild(fragment);
    }

    renderCartItem(
      entry,
      sectionName
    ) {
      const item = this.getItem(
        entry.itemId
      );

      if (!item) return null;

      let node = null;

      if (
        typeof this.config.hooks
          .renderCartItem === "function"
      ) {
        node =
          this.config.hooks
            .renderCartItem({
              entry,
              item,
              sectionName,
              shop: this,

              template: () => {
                return this.cloneTemplate(
                  this.elements
                    .cartItemTemplate
                );
              }
            });
      } else if (
        this.config.renderer.cart
      ) {
        node = this.resolve(
          "renderers",
          this.config.renderer.cart,
          {
            target: "cart",
            entry,
            item,
            sectionName,

            template: () => {
              return this.cloneTemplate(
                this.elements
                  .cartItemTemplate
              );
            }
          }
        );
      }

      if (!(node instanceof Element)) {
        console.warn(
          `[PixieShop:${this.name}] ${format(
            this.config.messages
              .missingRenderer,
            {
              target:
                "las entradas del carrito"
            }
          )}`
        );

        return null;
      }

      node.dataset.shopEntryId =
        entry.uid;

      node.dataset.shopSection =
        sectionName;

      return node;
    }

    /*
     * Totales
     */

    calculateSectionTotal(sectionName) {
      const definition =
        this.getSectionConfig(
          sectionName
        )?.total;

      if (!definition) {
        return null;
      }

      return this.resolve(
        "totals",
        definition,
        {
          sectionName,

          entries:
            this.getSectionEntries(
              sectionName
            ),

          getItem: (itemId) => {
            return this.getItem(itemId);
          }
        }
      );
    }

    getTotals() {
      return Object.fromEntries(
        Object.keys(
          this.config.sections
        ).map((sectionName) => {
          return [
            sectionName,
            this.calculateSectionTotal(
              sectionName
            )
          ];
        })
      );
    }

    renderTotals() {
      Object.keys(
        this.config.sections
      ).forEach((sectionName) => {
        const root =
          this.root.querySelector(
            `[data-shop-section="${CSS.escape(
              sectionName
            )}"]`
          );

        const output =
          root?.querySelector(
            "[data-shop-section-total]"
          );

        if (!output) return;

        const total =
          this.calculateSectionTotal(
            sectionName
          );

        output.hidden =
          total === null ||
          total === undefined;

        output.textContent =
          output.hidden
            ? ""
            : String(total);
      });
    }

    /*
     * Validación y mensaje
     */

    validate() {
      const errors = [];

      Object.entries(
        this.state.cart.sections
      ).forEach(
        ([sectionName, entries]) => {
          entries.forEach((entry) => {
            const item = this.getItem(
              entry.itemId
            );

            if (!item) return;

            const context = {
              item,
              entry,
              sectionName,

              section:
                this.getSectionConfig(
                  sectionName
                ),

              shop: this
            };

            if (
              typeof this.config.hooks
                .validateEntry ===
              "function"
            ) {
              const result =
                this.config.hooks
                  .validateEntry(context);

              errors.push(
                ...toArray(result)
                  .filter(Boolean)
              );
            }

            const validationResult =
              this.resolve(
                "validators",
                {
                  type: "compose",

                  rules: [
                    ...(this.config
                      .validation.rules ||
                      []),

                    ...(this.getSectionConfig(
                      sectionName
                    )?.validation
                      ?.rules || [])
                  ]
                },
                context
              );

            errors.push(
              ...toArray(
                validationResult
              ).filter(Boolean)
            );
          });
        }
      );

      return [
        ...new Set(errors)
      ];
    }

    buildMessage() {
      const context = {
        cart: this.state.cart,

        sections:
          this.state.cart.sections,

        items: this.itemMap,

        totals: this.getTotals(),

        config: this.config,

        shop: this,

        utils: PixieShop.utils
      };

      if (
        typeof this.config.hooks
          .buildMessage === "function"
      ) {
        return String(
          this.config.hooks
            .buildMessage(context) ?? ""
        );
      }

      if (this.config.output) {
        const message = this.resolve(
          "output",
          this.config.output,
          context
        );

        return String(message ?? "");
      }

      console.warn(
        `[PixieShop:${this.name}] ${this.config.messages.missingOutput}`
      );

      return "";
    }

    prepareSubmit() {
      const errors = this.validate();

      if (errors.length) {
        this.notice(
          errors.join("\n"),
          "error"
        );

        return false;
      }

      if (!this.elements.message) {
        this.notice(
          this.config.messages
            .missingMessage,
          "error"
        );

        return false;
      }

      if (
        typeof this.config.hooks
          .beforeSubmit === "function"
      ) {
        const result =
          this.config.hooks
            .beforeSubmit({
              cart: this.state.cart,
              shop: this
            });

        if (result === false) {
          return false;
        }
      }

      const message =
        this.buildMessage();

      this.elements.message.value =
        message;

      if (
        typeof this.config.hooks
          .afterSubmitPreparation ===
        "function"
      ) {
        this.config.hooks
          .afterSubmitPreparation({
            message,
            cart: this.state.cart,
            shop: this
          });
      }

      this.emit(
        "pixie-shop:message-created",
        {
          message
        }
      );

      return true;
    }

    /*
     * Eventos
     */

    bindEvents() {
      const signal =
        this.abortController.signal;

      this.elements.search
        ?.addEventListener(
          "input",
          (event) => {
            this.state.search =
              normalizeText(
                event.target.value
              );

            this.renderItems(true);
          },
          { signal }
        );

      this.elements.sort
        ?.addEventListener(
          "change",
          (event) => {
            this.state.sort =
              event.target.value;

            this.renderItems(true);
          },
          { signal }
        );

      this.elements.categories
        ?.addEventListener(
          "click",
          (event) => {
            const button =
              event.target.closest(
                "[data-shop-category]"
              );

            if (!button) return;

            this.state.category =
              button.dataset
                .shopCategory || "";

            this.elements.categories
              .querySelectorAll(
                "[data-shop-category]"
              )
              .forEach(
                (candidate) => {
                  const active =
                    candidate === button;

                  candidate.classList
                    .toggle(
                      "is-active",
                      active
                    );

                  candidate.setAttribute(
                    "aria-pressed",
                    String(active)
                  );
                }
              );

            this.renderItems(true);
          },
          { signal }
        );

      this.elements.tags
        ?.addEventListener(
          "change",
          () => {
            this.state.tags = [
              ...this.elements.tags
                .querySelectorAll(
                  "input[data-shop-tag]:checked"
                )
            ].map((input) => {
              return input.value;
            });

            this.renderItems(true);
          },
          { signal }
        );

      this.elements.loadMore
        ?.addEventListener(
          "click",
          () => {
            this.state.visibleCount +=
              this.config
                .itemsPerPage;

            this.renderItems();
          },
          { signal }
        );

      this.elements.items
        ?.addEventListener(
          "click",
          (event) => {
            const button =
              event.target.closest(
                "[data-shop-action]"
              );

            if (!button) return;

            const itemNode =
              button.closest(
                "[data-shop-item-id]"
              );

            if (!itemNode) return;

            const item = this.getItem(
              itemNode.dataset
                .shopItemId
            );

            if (!item) return;

            const action =
              button.dataset
                .shopAction || "add";

            const sectionName =
              this.resolveSection(
                action,
                item,
                itemNode
              );

            const quantityInput =
              itemNode.querySelector(
                "[data-shop-quantity]"
              );

            const quantity =
              quantityInput
                ? quantityInput.value
                : 1;

            this.add(
              item.id,
              sectionName,
              quantity
            );
          },
          { signal }
        );

      this.elements.cart
        ?.addEventListener(
          "click",
          (event) => {
            const button =
              event.target.closest(
                "[data-cart-action]"
              );

            if (!button) return;

            const entryNode =
              button.closest(
                "[data-shop-entry-id]"
              );

            const entryUid =
              entryNode?.dataset
                .shopEntryId;

            if (!entryUid) return;

            const action =
              button.dataset
                .cartAction;

            switch (action) {
              case "remove":
                this.remove(entryUid);
                break;

              case "increase":
                this.changeQuantity(
                  entryUid,
                  1
                );
                break;

              case "decrease":
                this.changeQuantity(
                  entryUid,
                  -1
                );
                break;

              case "add-field":
                this.addRepeatableField(
                  entryUid,
                  button.dataset
                    .fieldName
                );
                break;

              case "remove-field":
                this.removeRepeatableField(
                  entryUid,
                  button.dataset
                    .fieldName,
                  Number(
                    button.dataset
                      .fieldIndex
                  )
                );
                break;
            }
          },
          { signal }
        );

      this.elements.cart
        ?.addEventListener(
          "input",
          (event) => {
            const entryNode =
              event.target.closest(
                "[data-shop-entry-id]"
              );

            const entryUid =
              entryNode?.dataset
                .shopEntryId;

            if (!entryUid) return;

            if (
              event.target.matches(
                "[data-cart-quantity]"
              )
            ) {
              this.updateQuantity(
                entryUid,
                event.target.value
              );

              return;
            }

            if (
              event.target.matches(
                "[data-cart-field]"
              )
            ) {
              const index =
                event.target.dataset
                  .fieldIndex ===
                undefined
                  ? null
                  : Number(
                      event.target
                        .dataset
                        .fieldIndex
                    );

              this.updateField(
                entryUid,
                event.target.dataset
                  .cartField,
                event.target.value,
                index
              );
            }
          },
          { signal }
        );

      this.elements.cartClear
        ?.addEventListener(
          "click",
          () => {
            this.clear();
          },
          { signal }
        );

      this.form?.addEventListener(
        "submit",
        (event) => {
          if (
            !this.prepareSubmit()
          ) {
            event.preventDefault();
          }
        },
        { signal }
      );
    }

    /*
     * Avisos y eventos públicos
     */

    disable(message) {
      this.root.dataset
        .pixieShopDisabled = "true";

      this.root
        .querySelectorAll(
          "button, input, select, textarea"
        )
        .forEach((element) => {
          element.disabled = true;
        });

      this.notice(
        message,
        "warning"
      );
    }

    notice(
      message,
      type = "info"
    ) {
      this.emit(
        "pixie-shop:notice",
        {
          message,
          type
        }
      );

      if (
        typeof this.config.notice ===
        "function"
      ) {
        this.config.notice({
          message,
          type,
          shop: this
        });

        return;
      }

      if (
        type === "error" ||
        type === "warning"
      ) {
        window.alert(message);
        return;
      }

      console.info(
        `[PixieShop:${this.name}] ${message}`
      );
    }

    emit(name, detail = {}) {
      this.root.dispatchEvent(
        new CustomEvent(name, {
          bubbles: true,

          detail: {
            ...detail,
            shop: this
          }
        })
      );
    }
  }

  /*
   * API pública
   */

  const PixieShop = {
    version: VERSION,

    /*
     * Registrar un módulo reutilizable.
     */
    module(name, moduleValue) {
      const key = String(
        name ?? ""
      ).trim();

      if (!key) {
        throw new TypeError(
          "[PixieShop] El nombre del módulo es obligatorio."
        );
      }

      if (
        moduleValue === undefined
      ) {
        throw new TypeError(
          `[PixieShop] El módulo “${key}” no puede ser undefined.`
        );
      }

      moduleRegistry.set(
        key,
        moduleValue
      );

      document.dispatchEvent(
        new CustomEvent(
          "pixie-shop:module",
          {
            detail: {
              name: key,
              module: moduleValue
            }
          }
        )
      );

      return PixieShop;
    },

    use(name) {
      const key = String(
        name ?? ""
      ).trim();

      if (!moduleRegistry.has(key)) {
        throw new Error(
          `[PixieShop] No existe el módulo “${key}”.`
        );
      }

      return moduleRegistry.get(key);
    },

    hasModule(name) {
      return moduleRegistry.has(
        String(name ?? "").trim()
      );
    },

    removeModule(name) {
      moduleRegistry.delete(
        String(name ?? "").trim()
      );

      return PixieShop;
    },

    /*
     * Resolver una definición declarativa.
     *
     * PixieShop.resolve(
     *   "totals",
     *   { type: "sum", field: "coste" },
     *   context
     * );
     */
    resolve(
      moduleName,
      definition,
      context = {}
    ) {
      if (
        definition === undefined ||
        definition === null
      ) {
        return null;
      }

      if (
        typeof definition ===
        "function"
      ) {
        return definition(context);
      }

      const moduleValue =
        PixieShop.use(moduleName);

      if (
        typeof moduleValue.resolve !==
        "function"
      ) {
        throw new TypeError(
          `[PixieShop] El módulo “${moduleName}” no dispone de resolve().`
        );
      }

      return moduleValue.resolve(
        definition,
        context
      );
    },

    /*
     * Registrar una tienda.
     */
    register(name, config) {
      const key = String(
        name ?? ""
      ).trim();

      if (!key) {
        throw new TypeError(
          "[PixieShop] El nombre de la tienda es obligatorio."
        );
      }

      if (!isPlainObject(config)) {
        throw new TypeError(
          `[PixieShop] La configuración “${key}” debe ser un objeto.`
        );
      }

      shopRegistry.set(key, config);

      document.dispatchEvent(
        new CustomEvent(
          "pixie-shop:registered",
          {
            detail: {
              name: key,
              config
            }
          }
        )
      );

      /*
       * Permite registrar la configuración
       * después de que el DOM ya haya cargado.
       */
      PixieShop.init(document);

      return PixieShop;
    },

    unregister(name) {
      shopRegistry.delete(
        String(name ?? "").trim()
      );

      return PixieShop;
    },

    getConfig(name) {
      return (
        shopRegistry.get(
          String(name ?? "").trim()
        ) || null
      );
    },

    /*
     * Inicializar tiendas presentes en el DOM.
     */
    init(root = document) {
      const candidates = [];

      if (
        root instanceof Element &&
        root.matches(
          "[data-pixie-shop]"
        )
      ) {
        candidates.push(root);
      }

      root
        .querySelectorAll?.(
          "[data-pixie-shop]"
        )
        .forEach((element) => {
          candidates.push(element);
        });

      candidates.forEach((element) => {
        if (instances.has(element)) {
          return;
        }

        const name = String(
          element.dataset.shopConfig ||
            ""
        ).trim();

        if (!name) {
          console.warn(
            "[PixieShop] Falta data-shop-config.",
            element
          );

          return;
        }

        const config =
          shopRegistry.get(name);

        /*
         * La configuración puede registrarse
         * más adelante desde Spectra.
         */
        if (!config) {
          return;
        }

        const instance =
          new PixieShopInstance(
            element,
            name,
            config
          );

        instances.set(
          element,
          instance
        );

        activeInstances.add(
          instance
        );

        instance.init();
      });

      return PixieShop;
    },

    getInstance(target) {
      const element =
        typeof target === "string"
          ? document.querySelector(
              target
            )
          : target;

      if (!element) {
        return null;
      }

      return (
        instances.get(element) ||
        null
      );
    },

    getInstances() {
      return [
        ...activeInstances
      ];
    },

    destroy(target) {
      PixieShop
        .getInstance(target)
        ?.destroy();

      return PixieShop;
    },

    utils: {
      isPlainObject,
      deepMerge,
      format,
      normalizeText,
      normalizeName,
      toNumber,
      toArray,
      createUid,
      clone
    }
  };

  /*
   * Exposición global.
   *
   * Los módulos y configuraciones de Spectra
   * utilizarán window.PixieShop.
   */
  window.PixieShop = PixieShop;

  /*
   * Inicialización automática.
   */
  function boot() {
    PixieShop.init(document);
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      {
        once: true
      }
    );
  } else {
    boot();
  }

  /*
   * Integración opcional con PixieKit.
   *
   * El módulo sigue funcionando mediante
   * window.PixieShop aunque PixieKit no esté presente.
   */
  if (
    typeof window.PixieKit ===
    "function"
  ) {
    try {
      window.PixieKit(
        MODULE_NAME,
        function () {
          return PixieShop;
        }
      );
    } catch (error) {
      console.warn(
        "[PixieShop] No se pudo registrar en PixieKit.",
        error
      );
    }
  }
})(window, document);
