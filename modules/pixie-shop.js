/*!
 * PixieShop.js
 * Núcleo genérico de tiendas para Pixie.
 *
 * PixieShop no conoce recompensas, items, niveles ni ecos.
 * Las reglas concretas se registran desde scripts externos:
 *
 * PixieShop.register("nombre", config);
 */
(function (window, document) {
  "use strict";

  const VERSION = "1.0.0";
  const registry = new Map();
  const instances = new WeakMap();
  const activeInstances = new Set();

  const DEFAULTS = {
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
      tags: "tags"
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
      uniqueItems: false
    },

    sections: {
      default: {
        label: "CARRITO",
        emptyText: "No hay elementos.",
        fields: [],
        total: null
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
      message: "[data-shop-message], textarea[name='message']",
      itemTemplate: "[data-shop-item-template]",
      cartItemTemplate: "[data-shop-cart-item-template]"
    },

    messages: {
      allCategories: "Todas",
      noTags: "Sin etiquetas",
      noResults: "No hay elementos para mostrar.",
      required: "{item}: falta “{field}”.",
      invalidUrl: "{item}: “{field}” no contiene una URL válida.",
      unique: "{item} ya está en el carrito.",
      login: "Debes iniciar sesión para utilizar esta tienda.",
      remove: "Quitar {item}",
      increase: "Sumar una unidad de {item}",
      decrease: "Restar una unidad de {item}",
      quantity: "Cantidad de {item}",
      addField: "Añadir otro campo",
      removeField: "Eliminar campo"
    },

    hooks: {
      normalizeItem: null,
      getTitle: null,
      getSearchText: null,
      getSection: null,
      renderItem: null,
      renderCartItem: null,
      getTotalValue: null,
      validateEntry: null,
      buildMessage: null,
      afterCartChange: null
    }
  };

  function isObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
  }

  function merge(target, ...sources) {
    const output = isObject(target) ? { ...target } : {};

    sources.forEach((source) => {
      if (!isObject(source)) return;

      Object.entries(source).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          output[key] = value.slice();
        } else if (isObject(value)) {
          output[key] = merge(
            isObject(output[key]) ? output[key] : {},
            value
          );
        } else {
          output[key] = value;
        }
      });
    });

    return output;
  }

  function format(template, values = {}) {
    return String(template || "").replace(/\{([^}]+)\}/g, (_, key) => {
      return values[key] ?? "";
    });
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

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function uid(prefix = "entry") {
    if (window.crypto?.randomUUID) {
      return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;
  }

  function isValidUrl(value) {
    if (!String(value || "").trim()) return false;

    try {
      const url = new URL(value, window.location.href);

      return (
        url.protocol === "http:" ||
        url.protocol === "https:"
      );
    } catch {
      return false;
    }
  }

  function currentUserId() {
    return String(window._userdata?.user_id || "guest");
  }

  function loggedIn() {
    return Boolean(window._userdata?.session_logged_in);
  }

  class Shop {
    constructor(root, name, config) {
      this.root = root;

      this.form =
        root instanceof HTMLFormElement
          ? root
          : root.closest("form");

      this.name = name;
      this.config = merge({}, DEFAULTS, config);
      this.abort = new AbortController();

      this.items = this.prepareItems(this.config.items);

      this.itemMap = new Map(
        this.items.map((item) => [item.id, item])
      );

      this.elements = {};

      this.state = {
        search: "",
        category: "",
        tags: [],
        sort: "name-asc",
        visible: this.config.itemsPerPage,

        cart: {
          sections: {}
        }
      };

      this.storageKey = this.makeStorageKey();
    }

    init() {
      if (
        this.config.requireLogin &&
        !loggedIn()
      ) {
        this.disable(this.config.messages.login);
        return this;
      }

      this.cacheElements();
      this.ensureSections();
      this.load();
      this.setupUI();
      this.renderFilters();
      this.renderItems(true);
      this.renderCart();
      this.bind();

      this.root.dataset.pixieShopReady = "true";

      this.emit("pixie-shop:ready", {
        name: this.name
      });

      return this;
    }

    destroy() {
      this.abort.abort();

      delete this.root.dataset.pixieShopReady;

      instances.delete(this.root);
      activeInstances.delete(this);

      this.emit("pixie-shop:destroy");
    }

    cacheElements() {
      const selectors = this.config.selectors;

      const query = (selector) => {
        return selector
          ? this.root.querySelector(selector)
          : null;
      };

      this.elements = {
        searchWrap: query(selectors.searchWrap),
        search: query(selectors.search),
        sort: query(selectors.sort),

        categoriesWrap: query(
          selectors.categoriesWrap
        ),

        categories: query(selectors.categories),

        tagsWrap: query(selectors.tagsWrap),
        tags: query(selectors.tags),

        items: query(selectors.items),
        loadMore: query(selectors.loadMore),

        cart: query(selectors.cart),
        cartClear: query(selectors.cartClear),

        message: query(selectors.message),

        itemTemplate: query(
          selectors.itemTemplate
        ),

        cartItemTemplate: query(
          selectors.cartItemTemplate
        )
      };
    }

    prepareItems(items) {
      const seen = new Set();

      return (
        Array.isArray(items)
          ? items
          : []
      )
        .map((raw, index) => {
          return this.normalizeItem(raw, index);
        })
        .filter((item) => {
          if (!item.id || seen.has(item.id)) {
            return false;
          }

          seen.add(item.id);

          return true;
        });
    }

    normalizeItem(raw, index) {
      const fields = this.config.fields;

      let item = {
        ...raw,

        id: String(
          raw?.[fields.id] ??
            raw?.id ??
            `item-${index + 1}`
        ).trim(),

        title: String(
          raw?.[fields.title] ??
            raw?.titulo ??
            raw?.nombre ??
            ""
        ).trim(),

        category: String(
          raw?.[fields.category] ??
            raw?.categoria ??
            ""
        ).trim(),

        tags: Array.isArray(
          raw?.[fields.tags]
        )
          ? raw[fields.tags]
              .filter(Boolean)
              .map(String)
          : [],

        raw
      };

      if (
        typeof this.config.hooks
          .normalizeItem === "function"
      ) {
        item =
          this.config.hooks.normalizeItem({
            item,
            raw,
            index,
            shop: this
          }) || item;
      }

      return item;
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

    ensureSections() {
      Object.keys(
        this.config.sections
      ).forEach((name) => {
        this.state.cart.sections[name] ||= [];
      });
    }

    makeStorageKey() {
      const base =
        this.config.storageKey ||
        `pixie_shop_${this.name}`;

      return `${base}_${currentUserId()}_v1`;
    }

    save() {
      if (!this.config.persist) return;

      try {
        localStorage.setItem(
          this.storageKey,
          JSON.stringify(this.state.cart)
        );
      } catch (error) {
        console.warn(
          `[PixieShop:${this.name}] No se pudo guardar el carrito.`,
          error
        );
      }
    }

    load() {
      if (!this.config.persist) return;

      try {
        const saved = JSON.parse(
          localStorage.getItem(
            this.storageKey
          )
        );

        if (!saved?.sections) return;

        Object.keys(
          this.config.sections
        ).forEach((section) => {
          this.state.cart.sections[section] = (
            saved.sections[section] || []
          )
            .filter((entry) => {
              return this.itemMap.has(
                String(entry.itemId)
              );
            })
            .map((entry) => {
              const item = this.itemMap.get(
                String(entry.itemId)
              );

              return {
                uid: String(
                  entry.uid || uid("cart")
                ),

                itemId: String(entry.itemId),

                section,

                quantity: this.normalizeQuantity(
                  entry.quantity,
                  item
                ),

                fields: isObject(entry.fields)
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

    setupUI() {
      const features = this.config.features;

      const hide = (
        element,
        condition
      ) => {
        if (element) {
          element.hidden = condition;
        }
      };

      hide(
        this.elements.search,
        !features.search
      );

      hide(
        this.elements.sort,
        !features.sort
      );

      hide(
        this.elements.searchWrap,
        !features.search &&
          !features.sort
      );

      hide(
        this.elements.categoriesWrap,
        !features.categories
      );

      hide(
        this.elements.tagsWrap,
        !features.tags
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
            .map((item) => item.category)
            .filter(Boolean)
        )
      ].sort((a, b) => {
        return a.localeCompare(b, "es");
      });

      const fragment =
        document.createDocumentFragment();

      fragment.appendChild(
        this.makeCategory(
          "",
          this.config.messages
            .allCategories,
          true
        )
      );

      categories.forEach((category) => {
        fragment.appendChild(
          this.makeCategory(
            category,
            category
          )
        );
      });

      this.elements.categories.replaceChildren(
        fragment
      );
    }

    makeCategory(
      value,
      label,
      active = false
    ) {
      const item =
        document.createElement("li");

      const button =
        document.createElement("button");

      button.type = "button";
      button.dataset.shopCategory = value;

      button.className = active
        ? "is-active"
        : "";

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
          document.createElement("label");

        const input =
          document.createElement("input");

        const text =
          document.createElement("span");

        const id =
          `pixie-shop-${this.name}-tag-${index}`;

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

    filteredItems() {
      const result = this.items.filter(
        (item) => {
          const extra =
            typeof this.config.hooks
              .getSearchText === "function"
              ? this.config.hooks.getSearchText(
                  {
                    item,
                    shop: this
                  }
                )
              : "";

          const haystack = normalizeText(
            [
              item.title,
              item.category,
              item.tags.join(" "),
              extra
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
        return result;
      }

      return result.sort((a, b) => {
        if (
          this.state.sort ===
          "name-desc"
        ) {
          return this.getTitle(
            b
          ).localeCompare(
            this.getTitle(a),
            "es"
          );
        }

        if (
          typeof this.config.sort ===
          "function"
        ) {
          return this.config.sort(
            a,
            b,
            this.state.sort,
            this
          );
        }

        return this.getTitle(
          a
        ).localeCompare(
          this.getTitle(b),
          "es"
        );
      });
    }

    renderItems(reset = false) {
      if (!this.elements.items) return;

      if (reset) {
        this.state.visible =
          this.config.itemsPerPage;
      }

      const filtered =
        this.filteredItems();

      const visible = filtered.slice(
        0,
        this.state.visible
      );

      const fragment =
        document.createDocumentFragment();

      visible.forEach((item) => {
        const node = this.renderItem(item);

        if (node) {
          fragment.appendChild(node);
        }
      });

      this.elements.items.replaceChildren();

      if (!visible.length) {
        const empty =
          document.createElement("p");

        empty.className =
          "shop-empty-results";

        empty.textContent =
          this.config.messages.noResults;

        this.elements.items.appendChild(
          empty
        );
      } else {
        this.elements.items.appendChild(
          fragment
        );
      }

      if (this.elements.loadMore) {
        this.elements.loadMore.hidden =
          this.state.visible >=
          filtered.length;
      }
    }

    renderItem(item) {
      if (
        typeof this.config.hooks
          .renderItem !== "function"
      ) {
        console.warn(
          `[PixieShop:${this.name}] Falta hooks.renderItem().`
        );

        return null;
      }

      const node =
        this.config.hooks.renderItem({
          item,
          shop: this,

          template: () => {
            return this.cloneTemplate(
              this.elements.itemTemplate
            );
          }
        });

      if (!(node instanceof Element)) {
        return null;
      }

      node.dataset.shopItemId = item.id;

      this.prepareQuantity(node, item);

      return node;
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

    prepareQuantity(node, item) {
      const input =
        node.querySelector(
          "[data-shop-quantity]"
        );

      const label =
        node.querySelector(
          "[data-shop-quantity-label]"
        );

      const config = merge(
        {},
        this.config.quantity,
        item.quantity || {}
      );

      if (!input) return;

      if (!config.enabled) {
        input.remove();
        label?.remove();

        return;
      }

      const id =
        `pixie-shop-${this.name}-${item.id}-quantity`;

      input.id = id;
      input.min = String(config.min);
      input.max = String(config.max);
      input.step = String(config.step);
      input.value = String(config.min);

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

    resolveSection(
      action,
      item,
      node
    ) {
      if (
        typeof this.config.hooks
          .getSection === "function"
      ) {
        const section =
          this.config.hooks.getSection({
            action,
            item,
            node,
            shop: this
          });

        if (
          section &&
          this.config.sections[section]
        ) {
          return section;
        }
      }

      if (
        this.config.sections[action]
      ) {
        return action;
      }

      return (
        this.config.cart.defaultSection ||
        Object.keys(
          this.config.sections
        )[0]
      );
    }

    normalizeQuantity(value, item) {
      const config = merge(
        {},
        this.config.quantity,
        item?.quantity || {}
      );

      if (!config.enabled) {
        return 1;
      }

      return Math.max(
        config.min,
        Math.min(
          config.max,
          Math.floor(
            number(value, config.min)
          )
        )
      );
    }

    add(
      itemId,
      sectionName,
      quantity = 1
    ) {
      const item = this.itemMap.get(
        String(itemId)
      );

      const section =
        this.state.cart.sections[
          sectionName
        ];

      if (!item || !section) {
        return null;
      }

      const unique =
        item.unique ??
        this.config.cart.uniqueItems;

      const mergeDuplicates =
        item.mergeDuplicates ??
        this.config.cart
          .mergeDuplicates;

      const existing = section.find(
        (entry) => {
          return entry.itemId === item.id;
        }
      );

      if (unique && existing) {
        this.notice(
          format(
            this.config.messages.unique,
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
              number(quantity, 1),
            item
          );

        this.changed();

        return existing;
      }

      const entry = {
        uid: uid("cart"),
        itemId: item.id,
        section: sectionName,

        quantity:
          this.normalizeQuantity(
            quantity,
            item
          ),

        fields:
          this.initialFields(
            sectionName
          )
      };

      section.push(entry);

      this.changed();

      this.emit(
        "pixie-shop:item-added",
        {
          entry,
          item,
          section: sectionName
        }
      );

      return entry;
    }

    initialFields(sectionName) {
      const fields =
        this.config.sections[
          sectionName
        ]?.fields || [];

      const values = {};

      fields.forEach((field) => {
        const name =
          normalizeName(field.name);

        if (!name) return;

        values[name] =
          field.repeatable
            ? Array.isArray(
                field.defaultValue
              )
              ? field.defaultValue.slice()
              : []
            : String(
                field.defaultValue ??
                  ""
              );
      });

      return values;
    }

    findEntry(entryId) {
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
              return entry.uid === entryId;
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

    remove(entryId) {
      const found =
        this.findEntry(entryId);

      if (!found) return;

      const [entry] =
        found.entries.splice(
          found.index,
          1
        );

      this.changed();

      this.emit(
        "pixie-shop:item-removed",
        {
          entry,
          section: found.sectionName
        }
      );
    }

    clear() {
      Object.keys(
        this.state.cart.sections
      ).forEach((section) => {
        this.state.cart.sections[
          section
        ] = [];
      });

      this.changed();
    }

    updateQuantity(
      entryId,
      value
    ) {
      const found =
        this.findEntry(entryId);

      if (!found) return;

      const item = this.itemMap.get(
        found.entry.itemId
      );

      found.entry.quantity =
        this.normalizeQuantity(
          value,
          item
        );

      this.changed(false);
    }

    changeQuantity(
      entryId,
      amount
    ) {
      const found =
        this.findEntry(entryId);

      if (!found) return;

      const next =
        found.entry.quantity +
        amount;

      if (next <= 0) {
        this.remove(entryId);

        return;
      }

      this.updateQuantity(
        entryId,
        next
      );

      this.renderCart();
    }

    updateField(
      entryId,
      fieldName,
      value,
      index = null
    ) {
      const found =
        this.findEntry(entryId);

      if (!found) return;

      const name =
        normalizeName(fieldName);

      if (index === null) {
        found.entry.fields[name] =
          String(value ?? "");
      } else {
        const list = Array.isArray(
          found.entry.fields[name]
        )
          ? found.entry.fields[name]
          : [];

        list[index] =
          String(value ?? "");

        found.entry.fields[name] =
          list;
      }

      this.save();
    }

    addField(
      entryId,
      fieldName
    ) {
      const found =
        this.findEntry(entryId);

      if (!found) return;

      const field =
        this.fieldConfig(
          found.sectionName,
          fieldName
        );

      if (!field?.repeatable) {
        return;
      }

      const name =
        normalizeName(fieldName);

      const list = Array.isArray(
        found.entry.fields[name]
      )
        ? found.entry.fields[name]
        : [];

      const max = Number.isFinite(
        Number(field.max)
      )
        ? Number(field.max)
        : Infinity;

      if (list.length >= max) {
        return;
      }

      list.push("");

      found.entry.fields[name] =
        list;

      this.changed();
    }

    removeField(
      entryId,
      fieldName,
      index
    ) {
      const found =
        this.findEntry(entryId);

      if (!found) return;

      const field =
        this.fieldConfig(
          found.sectionName,
          fieldName
        );

      const name =
        normalizeName(fieldName);

      const list = Array.isArray(
        found.entry.fields[name]
      )
        ? found.entry.fields[name]
        : [];

      const min = number(
        field?.min,
        0
      );

      if (list.length <= min) {
        return;
      }

      list.splice(index, 1);

      this.changed();
    }

    fieldConfig(
      sectionName,
      fieldName
    ) {
      return (
        this.config.sections[
          sectionName
        ]?.fields || []
      ).find((field) => {
        return (
          normalizeName(field.name) ===
          normalizeName(fieldName)
        );
      }) || null;
    }

    changed(render = true) {
      this.save();

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
          cart: this.state.cart
        }
      );
    }

    renderCart() {
      Object.keys(
        this.config.sections
      ).forEach((section) => {
        this.renderSection(section);
      });

      this.renderTotals();
    }

    renderSection(sectionName) {
      const root =
        this.root.querySelector(
          `[data-shop-section="${CSS.escape(
            sectionName
          )}"]`
        );

      if (!root) return;

      const list =
        root.querySelector(
          "[data-shop-section-list]"
        ) || root;

      const entries =
        this.state.cart.sections[
          sectionName
        ] || [];

      list.replaceChildren();

      if (!entries.length) {
        const empty =
          document.createElement("p");

        empty.className =
          "shop-cart-empty";

        empty.textContent =
          this.config.sections[
            sectionName
          ].emptyText;

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
      const item = this.itemMap.get(
        entry.itemId
      );

      if (
        !item ||
        typeof this.config.hooks
          .renderCartItem !==
          "function"
      ) {
        return null;
      }

      const node =
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

      if (!(node instanceof Element)) {
        return null;
      }

      node.dataset.shopEntryId =
        entry.uid;

      node.dataset.shopSection =
        sectionName;

      this.prepareCartControls(
        node,
        entry,
        item
      );

      this.renderFields(
        node,
        entry,
        item,
        sectionName
      );

      return node;
    }

    prepareCartControls(
      node,
      entry,
      item
    ) {
      const quantity =
        node.querySelector(
          "[data-cart-quantity]"
        );

      const label =
        node.querySelector(
          "[data-cart-quantity-label]"
        );

      const config = merge(
        {},
        this.config.quantity,
        item.quantity || {}
      );

      const title =
        this.getTitle(item);

      if (quantity) {
        if (!config.enabled) {
          quantity.remove();
          label?.remove();

          node
            .querySelector(
              "[data-cart-action='increase']"
            )
            ?.remove();

          node
            .querySelector(
              "[data-cart-action='decrease']"
            )
            ?.remove();
        } else {
          const id =
            `pixie-cart-${this.name}-${entry.uid}-quantity`;

          quantity.id = id;
          quantity.value =
            String(entry.quantity);

          quantity.min =
            String(config.min);

          quantity.max =
            String(config.max);

          quantity.step =
            String(config.step);

          if (label) {
            label.htmlFor = id;

            label.textContent =
              format(
                this.config.messages
                  .quantity,
                {
                  item: title
                }
              );
          }
        }
      }

      const labels = {
        remove:
          this.config.messages.remove,

        increase:
          this.config.messages
            .increase,

        decrease:
          this.config.messages
            .decrease
      };

      Object.entries(
        labels
      ).forEach(
        ([action, template]) => {
          const button =
            node.querySelector(
              `[data-cart-action="${action}"]`
            );

          if (button) {
            button.setAttribute(
              "aria-label",
              format(template, {
                item: title
              })
            );
          }
        }
      );
    }

    renderFields(
      node,
      entry,
      item,
      sectionName
    ) {
      const container =
        node.querySelector(
          "[data-cart-fields]"
        );

      if (!container) return;

      const fields =
        this.config.sections[
          sectionName
        ]?.fields || [];

      if (!fields.length) {
        container.remove();

        return;
      }

      const fragment =
        document.createDocumentFragment();

      fields.forEach((field) => {
        fragment.appendChild(
          field.repeatable
            ? this.repeatableField(
                entry,
                field
              )
            : this.singleField(
                entry,
                field
              )
        );
      });

      container.replaceChildren(
        fragment
      );
    }

    singleField(entry, field) {
      const name =
        normalizeName(field.name);

      const label =
        document.createElement(
          "label"
        );

      const text =
        document.createElement(
          "span"
        );

      const input =
        this.makeInput(field);

      const id =
        `pixie-field-${entry.uid}-${name}`;

      label.className =
        "cart-item-field";

      label.htmlFor = id;

      text.textContent =
        field.label || name;

      input.id = id;

      input.dataset.cartField =
        name;

      input.value =
        String(
          entry.fields[name] ?? ""
        );

      label.append(text, input);

      return label;
    }

    repeatableField(
      entry,
      field
    ) {
      const name =
        normalizeName(field.name);

      const fieldset =
        document.createElement(
          "fieldset"
        );

      const legend =
        document.createElement(
          "legend"
        );

      const list =
        document.createElement(
          "div"
        );

      const add =
        document.createElement(
          "button"
        );

      const values = Array.isArray(
        entry.fields[name]
      )
        ? entry.fields[name]
        : [];

      const min = number(
        field.min,
        0
      );

      while (
        values.length < min
      ) {
        values.push("");
      }

      entry.fields[name] = values;

      legend.textContent =
        field.label || name;

      values.forEach(
        (value, index) => {
          list.appendChild(
            this.repeatableRow(
              entry,
              field,
              value,
              index
            )
          );
        }
      );

      add.type = "button";

      add.dataset.cartAction =
        "add-field";

      add.dataset.fieldName =
        name;

      add.textContent =
        field.addLabel ||
        this.config.messages
          .addField;

      const max = Number.isFinite(
        Number(field.max)
      )
        ? Number(field.max)
        : Infinity;

      add.disabled =
        values.length >= max;

      fieldset.className =
        "cart-item-repeatable-field";

      fieldset.append(
        legend,
        list,
        add
      );

      return fieldset;
    }

    repeatableRow(
      entry,
      field,
      value,
      index
    ) {
      const name =
        normalizeName(field.name);

      const row =
        document.createElement(
          "div"
        );

      const input =
        this.makeInput(field);

      const remove =
        document.createElement(
          "button"
        );

      input.dataset.cartField =
        name;

      input.dataset.fieldIndex =
        String(index);

      input.value =
        String(value ?? "");

      remove.type = "button";

      remove.dataset.cartAction =
        "remove-field";

      remove.dataset.fieldName =
        name;

      remove.dataset.fieldIndex =
        String(index);

      remove.textContent =
        field.removeLabel ||
        this.config.messages
          .removeField;

      row.className =
        "cart-item-repeatable-row";

      row.append(input, remove);

      return row;
    }

    makeInput(field) {
      const input =
        field.type === "textarea"
          ? document.createElement(
              "textarea"
            )
          : document.createElement(
              "input"
            );

      if (
        input instanceof
        HTMLInputElement
      ) {
        input.type =
          field.type || "text";
      }

      input.placeholder =
        field.placeholder || "";

      input.required =
        Boolean(field.required);

      input.className =
        "cart-item-field-input";

      return input;
    }

    sectionTotal(sectionName) {
      const total =
        this.config.sections[
          sectionName
        ]?.total;

      if (!total) return null;

      return (
        this.state.cart.sections[
          sectionName
        ] || []
      ).reduce((sum, entry) => {
        const item =
          this.itemMap.get(
            entry.itemId
          );

        if (!item) return sum;

        const value =
          typeof total ===
          "function"
            ? total({
                item,
                entry,
                sectionName,
                shop: this
              })
            : typeof this.config
                .hooks
                .getTotalValue ===
              "function"
            ? this.config.hooks
                .getTotalValue({
                  item,
                  entry,
                  sectionName,
                  shop: this
                })
            : 0;

        return (
          sum +
          number(value, 0)
        );
      }, 0);
    }

    renderTotals() {
      Object.keys(
        this.config.sections
      ).forEach((sectionName) => {
        const total =
          this.sectionTotal(
            sectionName
          );

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

        if (output) {
          output.hidden =
            total === null;

          output.textContent =
            total === null
              ? ""
              : String(total);
        }
      });
    }

    validate() {
      const errors = [];

      Object.entries(
        this.state.cart.sections
      ).forEach(
        ([sectionName, entries]) => {
          const fields =
            this.config.sections[
              sectionName
            ]?.fields || [];

          entries.forEach((entry) => {
            const item =
              this.itemMap.get(
                entry.itemId
              );

            if (!item) return;

            const title =
              this.getTitle(item);

            fields.forEach((field) => {
              const name =
                normalizeName(
                  field.name
                );

              const values =
                field.repeatable
                  ? (
                      entry.fields[
                        name
                      ] || []
                    )
                      .map((value) => {
                        return String(
                          value
                        ).trim();
                      })
                      .filter(Boolean)
                  : [
                      String(
                        entry.fields[
                          name
                        ] ?? ""
                      ).trim()
                    ].filter(Boolean);

              if (
                field.required &&
                !values.length
              ) {
                errors.push(
                  format(
                    this.config
                      .messages.required,
                    {
                      item: title,

                      field:
                        field.label ||
                        name
                    }
                  )
                );
              }

              if (
                field.type === "url"
              ) {
                values.forEach(
                  (value) => {
                    if (
                      !isValidUrl(
                        value
                      )
                    ) {
                      errors.push(
                        format(
                          this.config
                            .messages
                            .invalidUrl,
                          {
                            item:
                              title,

                            field:
                              field.label ||
                              name
                          }
                        )
                      );
                    }
                  }
                );
              }
            });

            if (
              typeof this.config
                .hooks
                .validateEntry ===
              "function"
            ) {
              const custom =
                this.config.hooks
                  .validateEntry({
                    entry,
                    item,
                    sectionName,
                    shop: this
                  });

              if (
                Array.isArray(custom)
              ) {
                errors.push(
                  ...custom.filter(Boolean)
                );
              } else if (custom) {
                errors.push(custom);
              }
            }
          });
        }
      );

      return [...new Set(errors)];
    }

    buildMessage() {
      if (
        typeof this.config.hooks
          .buildMessage !==
        "function"
      ) {
        console.warn(
          `[PixieShop:${this.name}] Falta hooks.buildMessage().`
        );

        return "";
      }

      return String(
        this.config.hooks
          .buildMessage({
            cart: this.state.cart,

            sections:
              this.state.cart
                .sections,

            items: this.itemMap,

            shop: this,

            totals:
              Object.fromEntries(
                Object.keys(
                  this.config.sections
                ).map((section) => {
                  return [
                    section,
                    this.sectionTotal(
                      section
                    )
                  ];
                })
              ),

            utils:
              PixieShop.utils
          }) ?? ""
      );
    }

    prepareSubmit() {
      const errors =
        this.validate();

      if (errors.length) {
        this.notice(
          errors.join("\n"),
          "error"
        );

        return false;
      }

      if (!this.elements.message) {
        console.warn(
          `[PixieShop:${this.name}] No se encontró el textarea del mensaje.`
        );

        return false;
      }

      this.elements.message.value =
        this.buildMessage();

      return true;
    }

    bind() {
      const signal =
        this.abort.signal;

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
            this.state.visible +=
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

            const node =
              button?.closest(
                "[data-shop-item-id]"
              );

            const item = node
              ? this.itemMap.get(
                  node.dataset
                    .shopItemId
                )
              : null;

            if (!button || !item) {
              return;
            }

            const action =
              button.dataset
                .shopAction || "add";

            const section =
              this.resolveSection(
                action,
                item,
                node
              );

            const quantity =
              node.querySelector(
                "[data-shop-quantity]"
              )?.value || 1;

            this.add(
              item.id,
              section,
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

            const node =
              button?.closest(
                "[data-shop-entry-id]"
              );

            const entryId =
              node?.dataset
                .shopEntryId;

            if (
              !button ||
              !entryId
            ) {
              return;
            }

            const action =
              button.dataset
                .cartAction;

            if (
              action === "remove"
            ) {
              this.remove(entryId);
            }

            if (
              action === "increase"
            ) {
              this.changeQuantity(
                entryId,
                1
              );
            }

            if (
              action === "decrease"
            ) {
              this.changeQuantity(
                entryId,
                -1
              );
            }

            if (
              action === "add-field"
            ) {
              this.addField(
                entryId,
                button.dataset
                  .fieldName
              );
            }

            if (
              action ===
              "remove-field"
            ) {
              this.removeField(
                entryId,
                button.dataset
                  .fieldName,
                Number(
                  button.dataset
                    .fieldIndex
                )
              );
            }
          },
          { signal }
        );

      this.elements.cart
        ?.addEventListener(
          "input",
          (event) => {
            const node =
              event.target.closest(
                "[data-shop-entry-id]"
              );

            const entryId =
              node?.dataset
                .shopEntryId;

            if (!entryId) return;

            if (
              event.target.matches(
                "[data-cart-quantity]"
              )
            ) {
              this.updateQuantity(
                entryId,
                event.target.value
              );
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
                entryId,
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

    disable(message) {
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
      } else {
        console.info(
          `[PixieShop:${this.name}] ${message}`
        );
      }
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

  const PixieShop = {
    version: VERSION,

    register(name, config) {
      const key =
        String(name || "").trim();

      if (!key) {
        throw new TypeError(
          "[PixieShop] El nombre es obligatorio."
        );
      }

      if (!isObject(config)) {
        throw new TypeError(
          `[PixieShop] “${key}” debe recibir un objeto de configuración.`
        );
      }

      registry.set(key, config);

      PixieShop.init();

      return PixieShop;
    },

    unregister(name) {
      registry.delete(
        String(name || "").trim()
      );

      return PixieShop;
    },

    getConfig(name) {
      return (
        registry.get(
          String(name || "").trim()
        ) || null
      );
    },

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

      candidates.forEach(
        (element) => {
          if (
            instances.has(element)
          ) {
            return;
          }

          const name = String(
            element.dataset
              .shopConfig || ""
          ).trim();

          const config =
            registry.get(name);

          if (!name || !config) {
            return;
          }

          const instance =
            new Shop(
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
        }
      );

      return PixieShop;
    },

    getInstance(target) {
      const element =
        typeof target === "string"
          ? document.querySelector(
              target
            )
          : target;

      return element
        ? instances.get(element) ||
            null
        : null;
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
      merge,
      format,
      normalizeText,
      normalizeName,
      number,
      uid,
      isValidUrl
    }
  };

  window.PixieShop =
    PixieShop;

  const boot = () => {
    PixieShop.init();
  };

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

  if (
    typeof window.PixieKit ===
    "function"
  ) {
    try {
      window.PixieKit(
        "PixieShop",
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
