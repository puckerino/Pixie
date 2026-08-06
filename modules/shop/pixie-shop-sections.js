/*!
 * PixieShopSections.js
 * Secciones y resolutores reutilizables para PixieShop.
 *
 * @version 1.0.0
 *
 * Requiere:
 * - pixie-shop.js
 *
 * RESPONSABILIDADES
 * -----------------
 * - Resolver la sección de destino de una entrada.
 * - Elegir sección según acciones o controles del artículo.
 * - Crear configuraciones declarativas de secciones.
 * - Combinar resolutores reutilizables.
 *
 * NO CONTIENE
 * -----------
 * - Cálculos de totales.
 * - Renderizado.
 * - Validaciones.
 * - Reglas específicas de una tienda.
 */

(function (window) {
  "use strict";

  const MODULE_NAME = "sections";
  const VERSION = "1.0.0";

  if (!window.PixieShop) {
    console.warn(
      "[PixieShopSections] PixieShop no está disponible."
    );

    return;
  }

  const PixieShop = window.PixieShop;
  const { utils } = PixieShop;

  const DEFAULT_SECTION = {
    label: "CARRITO",
    emptyText: "No hay elementos.",
    fields: [],

    total: {
      type: "none"
    },

    validation: {
      rules: []
    },

    output: null
  };

  const DEFAULT_ACTION_RESOLVER = {
    type: "action",
    actions: {},
    fallback: ""
  };

  const DEFAULT_CHECKBOX_RESOLVER = {
    type: "checkbox",
    selector: "[data-shop-section-control]",
    checked: "",
    unchecked: "",
    fallback: ""
  };

  const DEFAULT_VALUE_RESOLVER = {
    type: "value",
    selector: "[data-shop-section-control]",
    values: {},
    fallback: ""
  };

  const DEFAULT_ATTRIBUTE_RESOLVER = {
    type: "attribute",
    selector: "",
    attribute: "data-shop-section",
    values: {},
    fallback: ""
  };

  /*
   * Utilidades
   */

  function normalizeSectionName(value) {
    return String(value ?? "").trim();
  }

  function sectionExists(shop, sectionName) {
    const name =
      normalizeSectionName(sectionName);

    return Boolean(
      name &&
      shop?.config?.sections?.[name]
    );
  }

  function validSection(
    shop,
    sectionName,
    fallback = ""
  ) {
    if (
      sectionExists(
        shop,
        sectionName
      )
    ) {
      return normalizeSectionName(
        sectionName
      );
    }

    if (
      sectionExists(shop, fallback)
    ) {
      return normalizeSectionName(
        fallback
      );
    }

    return "";
  }

  function getDefaultSection(shop) {
    const configured =
      shop?.config?.cart
        ?.defaultSection;

    if (
      sectionExists(
        shop,
        configured
      )
    ) {
      return configured;
    }

    return (
      Object.keys(
        shop?.config?.sections || {}
      )[0] || ""
    );
  }

  function findControl(
    itemNode,
    selector
  ) {
    if (
      !itemNode ||
      !selector ||
      typeof itemNode.querySelector !==
        "function"
    ) {
      return null;
    }

    return itemNode.querySelector(
      selector
    );
  }

  function getControlValue(control) {
    if (!control) return "";

    if (
      control instanceof
      HTMLInputElement
    ) {
      if (
        control.type === "checkbox"
      ) {
        return control.checked
          ? control.value || "true"
          : "";
      }

      if (control.type === "radio") {
        if (control.checked) {
          return control.value;
        }

        const root =
          control.form ||
          control.closest(
            "[data-shop-item-id]"
          ) ||
          document;

        const escapedName =
          window.CSS?.escape
            ? CSS.escape(control.name)
            : control.name.replace(
                /["\\]/g,
                "\\$&"
              );

        return (
          root.querySelector(
            `input[type="radio"][name="${escapedName}"]:checked`
          )?.value || ""
        );
      }
    }

    return String(
      control.value ?? ""
    );
  }

  function mapValue(
    value,
    values,
    fallback = ""
  ) {
    const normalizedValue =
      String(value ?? "");

    if (
      utils.isPlainObject(values) &&
      Object.prototype.hasOwnProperty.call(
        values,
        normalizedValue
      )
    ) {
      return normalizeSectionName(
        values[normalizedValue]
      );
    }

    return normalizeSectionName(
      fallback
    );
  }

  /*
   * Resolutor por acción
   *
   * HTML:
   *
   * <button data-shop-action="purchase">
   * <button data-shop-action="withdrawal">
   *
   * Configuración:
   *
   * {
   *   type: "action",
   *   actions: {
   *     purchase: "compras",
   *     withdrawal: "retiradas"
   *   },
   *   fallback: "compras"
   * }
   */

  function resolveAction(
    definition,
    context
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_ACTION_RESOLVER,
      definition || {}
    );

    const action =
      String(
        context.action ?? ""
      ).trim();

    const mapped =
      config.actions?.[action];

    return validSection(
      context.shop,
      mapped,
      config.fallback ||
        getDefaultSection(
          context.shop
        )
    );
  }

  /*
   * Resolutor por checkbox
   *
   * Configuración:
   *
   * {
   *   type: "checkbox",
   *   selector: "[data-shop-withdrawal]",
   *   checked: "retiradas",
   *   unchecked: "compras"
   * }
   */

  function resolveCheckbox(
    definition,
    context
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_CHECKBOX_RESOLVER,
      definition || {}
    );

    const control = findControl(
      context.itemNode,
      config.selector
    );

    if (
      !(
        control instanceof
        HTMLInputElement
      ) ||
      control.type !== "checkbox"
    ) {
      return validSection(
        context.shop,
        config.fallback,
        getDefaultSection(
          context.shop
        )
      );
    }

    const sectionName =
      control.checked
        ? config.checked
        : config.unchecked;

    return validSection(
      context.shop,
      sectionName,
      config.fallback ||
        getDefaultSection(
          context.shop
        )
    );
  }

  /*
   * Resolutor por valor de un control.
   *
   * Funciona con:
   * - select
   * - radio
   * - input
   *
   * Configuración:
   *
   * {
   *   type: "value",
   *   selector: "[data-shop-operation]",
   *   values: {
   *     compra: "compras",
   *     retirada: "retiradas"
   *   },
   *   fallback: "compras"
   * }
   */

  function resolveValue(
    definition,
    context
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_VALUE_RESOLVER,
      definition || {}
    );

    let control = findControl(
      context.itemNode,
      config.selector
    );

    if (
      control instanceof
        HTMLInputElement &&
      control.type === "radio" &&
      control.name
    ) {
      const escapedName =
        window.CSS?.escape
          ? CSS.escape(control.name)
          : control.name.replace(
              /["\\]/g,
              "\\$&"
            );

      control =
        context.itemNode.querySelector(
          `input[type="radio"][name="${escapedName}"]:checked`
        ) || control;
    }

    const value =
      getControlValue(control);

    const sectionName = mapValue(
      value,
      config.values,
      config.fallback
    );

    return validSection(
      context.shop,
      sectionName,
      getDefaultSection(
        context.shop
      )
    );
  }

  /*
   * Resolutor por atributo.
   *
   * Puede leer un atributo del botón,
   * del artículo o de un descendiente.
   *
   * Configuración:
   *
   * {
   *   type: "attribute",
   *   selector: "[data-shop-operation]",
   *   attribute: "data-shop-section",
   *   values: {
   *     purchase: "compras",
   *     withdrawal: "retiradas"
   *   }
   * }
   */

  function resolveAttribute(
    definition,
    context
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_ATTRIBUTE_RESOLVER,
      definition || {}
    );

    let source = null;

    if (config.selector) {
      source = findControl(
        context.itemNode,
        config.selector
      );
    }

    if (!source) {
      source =
        context.trigger ||
        context.button ||
        context.itemNode;
    }

    const attributeName =
      String(
        config.attribute ||
          "data-shop-section"
      );

    const value =
      source?.getAttribute?.(
        attributeName
      ) || "";

    const mapped =
      utils.isPlainObject(
        config.values
      ) &&
      Object.keys(
        config.values
      ).length
        ? mapValue(
            value,
            config.values,
            config.fallback
          )
        : value ||
          config.fallback;

    return validSection(
      context.shop,
      mapped,
      getDefaultSection(
        context.shop
      )
    );
  }

  /*
   * Resolutor fijo
   *
   * {
   *   type: "fixed",
   *   section: "recompensas"
   * }
   */

  function resolveFixed(
    definition,
    context
  ) {
    return validSection(
      context.shop,
      definition.section ||
        definition.value ||
        definition.name,
      definition.fallback ||
        getDefaultSection(
          context.shop
        )
    );
  }

  /*
   * Resolutor por propiedad del artículo
   *
   * {
   *   type: "item-field",
   *   field: "operacion",
   *   values: {
   *     compra: "compras",
   *     retirada: "retiradas"
   *   }
   * }
   */

  function resolveItemField(
    definition,
    context
  ) {
    const raw =
      context.item?.raw ||
      context.item ||
      {};

    const field =
      String(
        definition.field || ""
      );

    const value = field
      .split(".")
      .filter(Boolean)
      .reduce(
        (current, key) =>
          current?.[key],
        raw
      );

    const mapped =
      utils.isPlainObject(
        definition.values
      )
        ? mapValue(
            value,
            definition.values,
            definition.fallback
          )
        : value ||
          definition.fallback;

    return validSection(
      context.shop,
      mapped,
      getDefaultSection(
        context.shop
      )
    );
  }

  /*
   * Resolutor compuesto
   *
   * Prueba varias definiciones en orden
   * y devuelve la primera sección válida.
   *
   * {
   *   type: "compose",
   *   resolvers: [
   *     {...},
   *     {...}
   *   ],
   *   fallback: "compras"
   * }
   */

  function resolveCompose(
    definition,
    context
  ) {
    const resolvers =
      Array.isArray(
        definition.resolvers
      )
        ? definition.resolvers
        : Array.isArray(
            definition.rules
          )
        ? definition.rules
        : [];

    for (
      const resolver of resolvers
    ) {
      const result = resolve(
        resolver,
        context
      );

      if (
        sectionExists(
          context.shop,
          result
        )
      ) {
        return result;
      }
    }

    return validSection(
      context.shop,
      definition.fallback,
      getDefaultSection(
        context.shop
      )
    );
  }

  /*
   * Resolutor condicional
   *
   * {
   *   type: "condition",
   *
   *   when({ item, itemNode }) {
   *     return true;
   *   },
   *
   *   truthy: "retiradas",
   *   falsy: "compras"
   * }
   */

  function resolveCondition(
    definition,
    context
  ) {
    const condition =
      typeof definition.when ===
      "function"
        ? Boolean(
            definition.when(context)
          )
        : Boolean(definition.when);

    return validSection(
      context.shop,
      condition
        ? definition.truthy
        : definition.falsy,
      definition.fallback ||
        getDefaultSection(
          context.shop
        )
    );
  }

  /*
   * Fábricas de resolutores
   */

  function action(options = {}) {
    return utils.deepMerge(
      {},
      DEFAULT_ACTION_RESOLVER,
      options,
      {
        type: "action"
      }
    );
  }

  function checkbox(options = {}) {
    return utils.deepMerge(
      {},
      DEFAULT_CHECKBOX_RESOLVER,
      options,
      {
        type: "checkbox"
      }
    );
  }

  function value(options = {}) {
    return utils.deepMerge(
      {},
      DEFAULT_VALUE_RESOLVER,
      options,
      {
        type: "value"
      }
    );
  }

  function select(options = {}) {
    return value(options);
  }

  function radio(options = {}) {
    return value(options);
  }

  function attribute(options = {}) {
    return utils.deepMerge(
      {},
      DEFAULT_ATTRIBUTE_RESOLVER,
      options,
      {
        type: "attribute"
      }
    );
  }

  function fixed(
    sectionName,
    options = {}
  ) {
    return {
      ...options,
      type: "fixed",
      section: sectionName
    };
  }

  function itemField(options = {}) {
    return {
      ...options,
      type: "item-field"
    };
  }

  function compose(
    ...resolvers
  ) {
    let options = {};

    if (
      resolvers.length &&
      utils.isPlainObject(
        resolvers[
          resolvers.length - 1
        ]
      ) &&
      !resolvers[
        resolvers.length - 1
      ].type &&
      (
        Object.prototype.hasOwnProperty.call(
          resolvers[
            resolvers.length - 1
          ],
          "fallback"
        ) ||
        Object.prototype.hasOwnProperty.call(
          resolvers[
            resolvers.length - 1
          ],
          "resolvers"
        )
      )
    ) {
      options =
        resolvers.pop();
    }

    return {
      type: "compose",

      resolvers:
        resolvers.flat().filter(Boolean),

      ...options
    };
  }

  function condition(options = {}) {
    return {
      ...options,
      type: "condition"
    };
  }

  /*
   * Fábricas de configuraciones de sección
   */

  function section(options = {}) {
    return utils.deepMerge(
      {},
      DEFAULT_SECTION,
      options
    );
  }

  function basic(options = {}) {
    return section(options);
  }

  function withoutTotal(
    options = {}
  ) {
    return section(
      utils.deepMerge(
        {},
        options,
        {
          total: {
            type: "none"
          }
        }
      )
    );
  }

  function withTotal(
    total,
    options = {}
  ) {
    return section(
      utils.deepMerge(
        {},
        options,
        {
          total
        }
      )
    );
  }

  /*
   * Estos helpers no contienen reglas
   * especiales de negocio.
   *
   * Solo generan configuraciones frecuentes
   * con nombres predeterminados modificables.
   */

  function purchase(options = {}) {
    return section(
      utils.deepMerge(
        {},
        {
          label: "COMPRAS",
          emptyText:
            "No hay compras."
        },
        options
      )
    );
  }

  function withdrawal(options = {}) {
    return section(
      utils.deepMerge(
        {},
        {
          label: "RETIRADAS",
          emptyText:
            "No hay retiradas.",

          total: {
            type: "none"
          }
        },
        options
      )
    );
  }

  /*
   * Normalización de un mapa completo
   * de secciones.
   *
   * sections.map({
   *   compras: {...},
   *   retiradas: {...}
   * });
   */

  function map(sections) {
    if (
      !utils.isPlainObject(sections)
    ) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(sections).map(
        ([name, config]) => {
          return [
            normalizeSectionName(name),
            section(config)
          ];
        }
      )
    );
  }

  /*
   * Resolvedor principal
   */

  const resolverTypes = {
    action: resolveAction,
    checkbox: resolveCheckbox,
    value: resolveValue,
    select: resolveValue,
    radio: resolveValue,
    attribute: resolveAttribute,
    fixed: resolveFixed,
    "item-field": resolveItemField,
    compose: resolveCompose,
    condition: resolveCondition
  };

  function resolve(
    definition,
    context = {}
  ) {
    if (
      typeof definition ===
      "function"
    ) {
      return definition(context);
    }

    if (
      typeof definition ===
      "string"
    ) {
      return validSection(
        context.shop,
        definition,
        getDefaultSection(
          context.shop
        )
      );
    }

    if (
      !utils.isPlainObject(
        definition
      )
    ) {
      return getDefaultSection(
        context.shop
      );
    }

    const type =
      definition.type ||
      "fixed";

    const resolver =
      resolverTypes[type];

    if (!resolver) {
      throw new Error(
        `[PixieShopSections] No existe el resolutor “${type}”.`
      );
    }

    return resolver(
      definition,
      context
    );
  }

  /*
   * API pública
   */

  const PixieShopSections = {
    version: VERSION,

    resolve,

    exists: sectionExists,

    valid: validSection,

    getDefault:
      getDefaultSection,

    action,

    checkbox,

    value,

    select,

    radio,

    attribute,

    fixed,

    itemField,

    compose,

    condition,

    section,

    basic,

    withoutTotal,

    withTotal,

    purchase,

    withdrawal,

    map,

    utils: {
      normalizeSectionName,
      findControl,
      getControlValue,
      mapValue
    }
  };

  PixieShop.module(
    MODULE_NAME,
    PixieShopSections
  );
})(window);
