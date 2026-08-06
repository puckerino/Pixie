/*!
 * PixieShopTotals.js
 * Cálculos reutilizables para PixieShop.
 *
 * @version 1.0.0
 *
 * Requiere:
 * - pixie-shop.js
 *
 * Tipos disponibles:
 * - none
 * - sum
 * - subtract
 * - sum-fields
 * - count
 * - count-entries
 * - fixed
 * - compose
 * - min
 * - max
 * - round
 * - custom
 */

(function (window) {
  "use strict";

  const MODULE_NAME = "totals";
  const VERSION = "1.0.0";

  if (!window.PixieShop) {
    console.warn(
      "[PixieShopTotals] PixieShop no está disponible."
    );

    return;
  }

  const PixieShop = window.PixieShop;
  const { utils } = PixieShop;

  const DEFAULT_SUM = {
    type: "sum",

    field: "value",

    multiplyQuantity: true,

    base: 0,

    fallback: 0,

    absolute: false
  };

  const DEFAULT_SUM_FIELDS = {
    type: "sum-fields",

    fields: [],

    multiplyQuantity: true,

    base: 0,

    fallback: 0
  };

  const DEFAULT_COUNT = {
    type: "count",

    multiplyQuantity: true,

    base: 0
  };

  const DEFAULT_COMPOSE = {
    type: "compose",

    totals: [],

    operation: "sum",

    base: 0
  };

  /*
   * Utilidades internas
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
      .filter(Boolean)
      .reduce((current, key) => {
        return current?.[key];
      }, source);
  }

  function getItemValue(
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

    if (source === "$quantity") {
      return context.entry?.quantity;
    }

    if (source === "$item.value") {
      return item?.value;
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

    const itemValue = readPath(
      item,
      source
    );

    if (itemValue !== undefined) {
      return itemValue;
    }

    return undefined;
  }

  function getEntries(context) {
    return Array.isArray(context.entries)
      ? context.entries
      : [];
  }

  function getItem(
    context,
    entry
  ) {
    if (
      typeof context.getItem ===
      "function"
    ) {
      return context.getItem(
        entry.itemId
      );
    }

    if (
      context.items instanceof Map
    ) {
      return (
        context.items.get(
          entry.itemId
        ) || null
      );
    }

    if (
      utils.isPlainObject(
        context.items
      )
    ) {
      return (
        context.items[
          entry.itemId
        ] || null
      );
    }

    return null;
  }

  function entryQuantity(entry) {
    return Math.max(
      0,
      utils.toNumber(
        entry?.quantity,
        1
      )
    );
  }

  function normalizeResult(
    value,
    fallback = 0
  ) {
    return utils.toNumber(
      value,
      fallback
    );
  }

  function calculateEntryValue(
    item,
    entry,
    definition,
    context
  ) {
    let value = getItemValue(
      item,
      definition.field,
      {
        entry,
        sectionName:
          context.sectionName,

        shop: context.shop
      }
    );

    value = normalizeResult(
      value,
      definition.fallback
    );

    if (definition.absolute) {
      value = Math.abs(value);
    }

    if (
      definition.multiplyQuantity !==
      false
    ) {
      value *= entryQuantity(entry);
    }

    if (
      typeof definition.transform ===
      "function"
    ) {
      value =
        definition.transform({
          value,
          item,
          entry,
          sectionName:
            context.sectionName,

          shop: context.shop
        }) ?? value;
    }

    return normalizeResult(
      value,
      0
    );
  }

  /*
   * none
   *
   * No hay total para la sección.
   */

  function calculateNone() {
    return null;
  }

  /*
   * sum
   *
   * {
   *   type: "sum",
   *   field: "coste",
   *   multiplyQuantity: true
   * }
   */

  function calculateSum(
    definition,
    context
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_SUM,
      definition || {}
    );

    return getEntries(context).reduce(
      (total, entry) => {
        const item = getItem(
          context,
          entry
        );

        if (!item) {
          return total;
        }

        return (
          total +
          calculateEntryValue(
            item,
            entry,
            config,
            context
          )
        );
      },
      utils.toNumber(
        config.base,
        0
      )
    );
  }

  /*
   * subtract
   *
   * Igual que sum, pero el resultado
   * se devuelve en negativo.
   */

  function calculateSubtract(
    definition,
    context
  ) {
    const total = calculateSum(
      {
        ...definition,
        type: "sum"
      },
      context
    );

    return total === null
      ? null
      : -Math.abs(total);
  }

  /*
   * sum-fields
   *
   * Suma varios campos por artículo.
   *
   * {
   *   type: "sum-fields",
   *   fields: [
   *     "coste",
   *     "bonusDinero"
   *   ]
   * }
   *
   * Cada campo también puede ser un objeto:
   *
   * {
   *   field: "coste",
   *   multiplier: 2
   * }
   */

  function calculateSumFields(
    definition,
    context
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_SUM_FIELDS,
      definition || {}
    );

    const fields = Array.isArray(
      config.fields
    )
      ? config.fields
      : [];

    return getEntries(context).reduce(
      (total, entry) => {
        const item = getItem(
          context,
          entry
        );

        if (!item) {
          return total;
        }

        const entryTotal = fields.reduce(
          (sum, fieldDefinition) => {
            const normalized =
              typeof fieldDefinition ===
              "string"
                ? {
                    field:
                      fieldDefinition
                  }
                : fieldDefinition || {};

            let value = getItemValue(
              item,
              normalized.field,
              {
                entry,
                sectionName:
                  context.sectionName,

                shop: context.shop
              }
            );

            value = normalizeResult(
              value,
              normalized.fallback ??
                config.fallback
            );

            value *= utils.toNumber(
              normalized.multiplier,
              1
            );

            return sum + value;
          },
          0
        );

        const multiplier =
          config.multiplyQuantity ===
          false
            ? 1
            : entryQuantity(entry);

        return (
          total +
          entryTotal * multiplier
        );
      },
      utils.toNumber(
        config.base,
        0
      )
    );
  }

  /*
   * count
   *
   * Cuenta unidades.
   *
   * Con multiplyQuantity true:
   * item A × 3 + item B × 2 = 5
   *
   * Con multiplyQuantity false:
   * item A + item B = 2
   */

  function calculateCount(
    definition,
    context
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_COUNT,
      definition || {}
    );

    return getEntries(context).reduce(
      (total, entry) => {
        return (
          total +
          (
            config.multiplyQuantity ===
            false
              ? 1
              : entryQuantity(entry)
          )
        );
      },
      utils.toNumber(
        config.base,
        0
      )
    );
  }

  /*
   * count-entries
   *
   * Cuenta entradas independientes,
   * ignorando sus cantidades.
   */

  function calculateCountEntries(
    definition,
    context
  ) {
    return (
      getEntries(context).length +
      utils.toNumber(
        definition?.base,
        0
      )
    );
  }

  /*
   * fixed
   *
   * {
   *   type: "fixed",
   *   value: 10
   * }
   */

  function calculateFixed(
    definition
  ) {
    return utils.toNumber(
      definition.value,
      0
    );
  }

  /*
   * compose
   *
   * Combina varios cálculos.
   *
   * {
   *   type: "compose",
   *   operation: "sum",
   *   totals: [
   *     { type: "sum", field: "coste" },
   *     { type: "fixed", value: 5 }
   *   ]
   * }
   *
   * Operaciones:
   * - sum
   * - subtract
   * - multiply
   * - divide
   * - min
   * - max
   */

  function calculateCompose(
    definition,
    context
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_COMPOSE,
      definition || {}
    );

    const definitions = Array.isArray(
      config.totals
    )
      ? config.totals
      : Array.isArray(
          config.values
        )
      ? config.values
      : [];

    const values = definitions
      .map((childDefinition) => {
        return resolve(
          childDefinition,
          context
        );
      })
      .filter((value) => {
        return (
          value !== null &&
          value !== undefined
        );
      })
      .map((value) => {
        return utils.toNumber(
          value,
          0
        );
      });

    if (!values.length) {
      return utils.toNumber(
        config.base,
        0
      );
    }

    const base = utils.toNumber(
      config.base,
      config.operation ===
        "multiply"
        ? 1
        : 0
    );

    switch (config.operation) {
      case "subtract":
        return values.reduce(
          (total, value) =>
            total - value,
          base
        );

      case "multiply":
        return values.reduce(
          (total, value) =>
            total * value,
          base
        );

      case "divide":
        return values.reduce(
          (total, value) => {
            if (value === 0) {
              return total;
            }

            return total / value;
          },
          base
        );

      case "min":
        return Math.min(
          base,
          ...values
        );

      case "max":
        return Math.max(
          base,
          ...values
        );

      case "sum":
      default:
        return values.reduce(
          (total, value) =>
            total + value,
          base
        );
    }
  }

  /*
   * min
   *
   * Limita el resultado a un mínimo.
   *
   * {
   *   type: "min",
   *   value: 0,
   *   total: {
   *     type: "sum",
   *     field: "coste"
   *   }
   * }
   */

  function calculateMin(
    definition,
    context
  ) {
    const total = resolve(
      definition.total ||
        definition.source,
      context
    );

    if (
      total === null ||
      total === undefined
    ) {
      return null;
    }

    return Math.max(
      utils.toNumber(
        definition.value,
        0
      ),
      utils.toNumber(total, 0)
    );
  }

  /*
   * max
   *
   * Limita el resultado a un máximo.
   */

  function calculateMax(
    definition,
    context
  ) {
    const total = resolve(
      definition.total ||
        definition.source,
      context
    );

    if (
      total === null ||
      total === undefined
    ) {
      return null;
    }

    return Math.min(
      utils.toNumber(
        definition.value,
        0
      ),
      utils.toNumber(total, 0)
    );
  }

  /*
   * round
   *
   * {
   *   type: "round",
   *   mode: "round",
   *   decimals: 0,
   *   total: {...}
   * }
   *
   * Modos:
   * - round
   * - floor
   * - ceil
   * - trunc
   */

  function calculateRound(
    definition,
    context
  ) {
    const total = resolve(
      definition.total ||
        definition.source,
      context
    );

    if (
      total === null ||
      total === undefined
    ) {
      return null;
    }

    const decimals = Math.max(
      0,
      Math.floor(
        utils.toNumber(
          definition.decimals,
          0
        )
      )
    );

    const factor =
      10 ** decimals;

    const value =
      utils.toNumber(total, 0) *
      factor;

    let result;

    switch (definition.mode) {
      case "floor":
        result = Math.floor(value);
        break;

      case "ceil":
        result = Math.ceil(value);
        break;

      case "trunc":
        result = Math.trunc(value);
        break;

      case "round":
      default:
        result = Math.round(value);
        break;
    }

    return result / factor;
  }

  /*
   * custom
   *
   * {
   *   type: "custom",
   *
   *   calculate({
   *     entries,
   *     getItem,
   *     shop
   *   }) {
   *     return 0;
   *   }
   * }
   */

  function calculateCustom(
    definition,
    context
  ) {
    if (
      typeof definition.calculate !==
      "function"
    ) {
      return null;
    }

    return definition.calculate({
      ...context,

      entries:
        getEntries(context),

      getItem: (entryOrId) => {
        const itemId =
          typeof entryOrId ===
          "object"
            ? entryOrId?.itemId
            : entryOrId;

        if (
          typeof context.getItem ===
          "function"
        ) {
          return context.getItem(
            itemId
          );
        }

        return null;
      },

      utils
    });
  }

  /*
   * Fábricas declarativas
   */

  function none(options = {}) {
    return {
      ...options,
      type: "none"
    };
  }

  function sum(options = {}) {
    return utils.deepMerge(
      {},
      DEFAULT_SUM,
      options,
      {
        type: "sum"
      }
    );
  }

  function subtract(options = {}) {
    return utils.deepMerge(
      {},
      DEFAULT_SUM,
      options,
      {
        type: "subtract"
      }
    );
  }

  function sumFields(options = {}) {
    return utils.deepMerge(
      {},
      DEFAULT_SUM_FIELDS,
      options,
      {
        type: "sum-fields"
      }
    );
  }

  function count(options = {}) {
    return utils.deepMerge(
      {},
      DEFAULT_COUNT,
      options,
      {
        type: "count"
      }
    );
  }

  function countEntries(
    options = {}
  ) {
    return {
      ...options,
      type: "count-entries"
    };
  }

  function fixed(
    value,
    options = {}
  ) {
    return {
      ...options,
      type: "fixed",
      value
    };
  }

  function compose(
    totals,
    options = {}
  ) {
    return utils.deepMerge(
      {},
      DEFAULT_COMPOSE,
      options,
      {
        type: "compose",

        totals: Array.isArray(
          totals
        )
          ? totals
          : utils.toArray(totals)
      }
    );
  }

  function minimum(
    value,
    total,
    options = {}
  ) {
    return {
      ...options,
      type: "min",
      value,
      total
    };
  }

  function maximum(
    value,
    total,
    options = {}
  ) {
    return {
      ...options,
      type: "max",
      value,
      total
    };
  }

  function round(
    total,
    options = {}
  ) {
    return {
      ...options,
      type: "round",
      total
    };
  }

  function custom(
    calculate,
    options = {}
  ) {
    return {
      ...options,
      type: "custom",
      calculate
    };
  }

  /*
   * Resolvedor principal
   */

  const totalTypes = {
    none: calculateNone,

    sum: calculateSum,

    subtract: calculateSubtract,

    "sum-fields":
      calculateSumFields,

    count: calculateCount,

    "count-entries":
      calculateCountEntries,

    fixed: calculateFixed,

    compose: calculateCompose,

    min: calculateMin,

    max: calculateMax,

    round: calculateRound,

    custom: calculateCustom
  };

  function resolve(
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
      return definition({
        ...context,
        utils
      });
    }

    if (
      typeof definition ===
      "number"
    ) {
      return definition;
    }

    if (
      typeof definition ===
      "string"
    ) {
      definition = {
        type: definition
      };
    }

    if (
      !utils.isPlainObject(
        definition
      )
    ) {
      return null;
    }

    const type =
      definition.type || "none";

    const calculator =
      totalTypes[type];

    if (!calculator) {
      throw new Error(
        `[PixieShopTotals] No existe el cálculo “${type}”.`
      );
    }

    const result = calculator(
      definition,
      context
    );

    if (
      result === null ||
      result === undefined
    ) {
      return null;
    }

    let normalized =
      utils.toNumber(
        result,
        0
      );

    if (
      definition.absolute === true
    ) {
      normalized =
        Math.abs(normalized);
    }

    if (
      definition.multiplier !==
      undefined
    ) {
      normalized *=
        utils.toNumber(
          definition.multiplier,
          1
        );
    }

    if (
      definition.offset !==
      undefined
    ) {
      normalized +=
        utils.toNumber(
          definition.offset,
          0
        );
    }

    return normalized;
  }

  /*
   * API pública
   */

  const PixieShopTotals = {
    version: VERSION,

    resolve,

    none,

    sum,

    subtract,

    sumFields,

    count,

    countEntries,

    fixed,

    compose,

    minimum,

    maximum,

    round,

    custom,

    calculateNone,

    calculateSum,

    calculateSubtract,

    calculateSumFields,

    calculateCount,

    calculateCountEntries,

    calculateFixed,

    calculateCompose,

    calculateMin,

    calculateMax,

    calculateRound,

    calculateCustom,

    utils: {
      readPath,
      getItemValue,
      entryQuantity
    }
  };

  PixieShop.module(
    MODULE_NAME,
    PixieShopTotals
  );
})(window);
