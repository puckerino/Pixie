/*!
 * PixieShopOutput.js
 * Generación de mensajes para PixieShop.
 */

(function (window) {
  "use strict";

  const MODULE_NAME = "output";
  const VERSION = "1.2.0";

  if (!window.PixieShop) {
    console.warn(
      "[PixieShopOutput] PixieShop no está disponible."
    );

    return;
  }

  const PixieShop = window.PixieShop;
  const { utils } = PixieShop;

const DEFAULT_MESSAGE = {
  type: "message",

  codeBlock: true,
  codeOpen: "[code]",
  codeClose: "[/code]",

  sections: {},

  sectionJoiner: "\n",
  entryJoiner: "\n",

  afterCode: {
    enabled: false,
    render: null
  },

  outsideFields: {
    enabled: true,
    title: "JUSTIFICANTES",
    itemSeparator: "\n\n",
    linePrefix: "— ",
    renderItem: null
  },

  totals: [],

  totalJoiner: "\n",

  emptyMessage: ""
};

  const DEFAULT_COLLECTION = {
    type: "collection",

    wrapperTag: "",
    wrapperClass: "",

    entryJoiner: "\n",

    item: {
      tag: "div",
      attrs: {},
      content: "",
      children: null
    }
  };

  const DEFAULT_COMPONENT = {
    type: "component",

    tag: "div",
    attrs: {},
    content: "",
    children: null,

    omitEmptyAttributes: true
  };

  const DEFAULT_GROUP = {
    type: "group",

    entryJoiner: "\n",

    parent: {
      tag: "div",
      attrs: {},
      content: ""
    },

    children: {
      field: "children",
      tag: "div",
      attrs: {},
      content: "",
      joiner: "\n"
    }
  };

  /*
   * Escape
   */

  function escapeAttribute(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeText(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function normalizeTagName(
    value,
    fallback = "div"
  ) {
    const tag = String(
      value ?? ""
    )
      .trim()
      .toLowerCase();

    return /^[a-z][a-z0-9-]*$/.test(tag)
      ? tag
      : fallback;
  }

  function normalizeAttributeName(value) {
    const name = String(
      value ?? ""
    ).trim();

    return /^[a-zA-Z_:][a-zA-Z0-9_:.-]*$/.test(
      name
    )
      ? name
      : "";
  }

  /*
   * Acceso a datos
   */

  function getRawItem(item) {
    return item?.raw || item || {};
  }

  function getItem(context, entry) {
    if (!entry) return null;

    if (
      context.items instanceof Map
    ) {
      return (
        context.items.get(
          String(entry.itemId)
        ) || null
      );
    }

    if (
      typeof context.getItem ===
      "function"
    ) {
      return (
        context.getItem(
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

    return (
      context.shop?.getItem?.(
        entry.itemId
      ) || null
    );
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

    return String(path)
      .split(".")
      .filter(Boolean)
      .reduce((current, key) => {
        return current?.[key];
      }, source);
  }

  /*
   * Resolución de valores
   *
   * Valores especiales:
   *
   * $quantity
   * $section
   * $title
   * $fields.link
   * $item.title
   * $raw.coste
   * $child.titulo
   * $index
   */

  function resolveValue(
    source,
    context = {}
  ) {
    if (typeof source === "function") {
      return source({
        ...context,
        resolve: (nextSource) => {
          return resolveValue(
            nextSource,
            context
          );
        },
        utils
      });
    }

    if (
      source === undefined ||
      source === null
    ) {
      return source;
    }

    if (typeof source !== "string") {
      return source;
    }

    const {
      item,
      entry,
      sectionName,
      child,
      index,
      shop
    } = context;

    if (source === "$quantity") {
      return entry?.quantity ?? 1;
    }

    if (source === "$section") {
      return sectionName || "";
    }

    if (source === "$title") {
      return (
        shop?.getTitle?.(item) ??
        item?.title ??
        ""
      );
    }

    if (source === "$index") {
      return index ?? 0;
    }

    if (source === "$item") {
      return item;
    }

    if (source === "$raw") {
      return getRawItem(item);
    }

    if (source === "$fields") {
      return entry?.fields || {};
    }

    if (source === "$child") {
      return child;
    }

    if (source.startsWith("$fields.")) {
      return readPath(
        entry?.fields,
        source.slice(8)
      );
    }

    if (source.startsWith("$item.")) {
      return readPath(
        item,
        source.slice(6)
      );
    }

    if (source.startsWith("$raw.")) {
      return readPath(
        getRawItem(item),
        source.slice(5)
      );
    }

    if (source.startsWith("$child.")) {
      return readPath(
        child,
        source.slice(7)
      );
    }

    /*
     * Los nombres normales consultan
     * primero el artículo original.
     */

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

    if (child !== undefined) {
      const childValue = readPath(
        child,
        source
      );

      if (childValue !== undefined) {
        return childValue;
      }
    }

    return undefined;
  }

  function resolveString(
    source,
    context = {},
    options = {}
  ) {
    const value = resolveValue(
      source,
      context
    );

    if (
      value === undefined ||
      value === null
    ) {
      return "";
    }

    if (Array.isArray(value)) {
      return value
        .filter((entry) => {
          return (
            entry !== undefined &&
            entry !== null &&
            entry !== ""
          );
        })
        .join(
          options.arrayJoiner || ", "
        );
    }

    if (
      utils.isPlainObject(value)
    ) {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /*
   * Atributos
   */

  function buildAttributes(
    definitions,
    context = {},
    options = {}
  ) {
    if (
      !utils.isPlainObject(
        definitions
      )
    ) {
      return "";
    }

    const {
      omitEmpty = true
    } = options;

    return Object.entries(
      definitions
    )
      .map(([attributeName, source]) => {
        const name =
          normalizeAttributeName(
            attributeName
          );

        if (!name) return "";

        const value = resolveValue(
          source,
          context
        );

        if (
          omitEmpty &&
          (
            value === undefined ||
            value === null ||
            value === "" ||
            (
              Array.isArray(value) &&
              !value.length
            )
          )
        ) {
          return "";
        }

        if (value === true) {
          return name;
        }

        if (
          value === false ||
          value === undefined ||
          value === null
        ) {
          return "";
        }

        const normalizedValue =
          Array.isArray(value)
            ? value.join(", ")
            : value;

        return (
          `${name}="` +
          `${escapeAttribute(
            normalizedValue
          )}"`
        );
      })
      .filter(Boolean)
      .join(" ");
  }

  /*
   * Componentes
   */

  function renderComponent(
    definition,
    context = {}
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_COMPONENT,
      definition || {}
    );

    const tag = normalizeTagName(
      resolveString(
        config.tag,
        context
      ) || config.tag,
      "div"
    );

    const attributes =
      buildAttributes(
        config.attrs,
        context,
        {
          omitEmpty:
            config.omitEmptyAttributes !==
            false
        }
      );

    let content = "";

    if (
      typeof config.renderContent ===
      "function"
    ) {
      content = String(
        config.renderContent({
          ...context,
          resolve: (source) =>
            resolveValue(
              source,
              context
            ),
          utils
        }) ?? ""
      );
    } else if (
      config.content !== undefined &&
      config.content !== null &&
      config.content !== ""
    ) {
      const resolvedContent =
        resolveString(
          config.content,
          context
        );

      content =
        config.escapeContent === false
          ? resolvedContent
          : escapeText(
              resolvedContent
            );
    }

    if (config.children) {
      content += renderChildren(
        config.children,
        context
      );
    }

    const opening = attributes
      ? `<${tag} ${attributes}>`
      : `<${tag}>`;

    if (config.selfClosing) {
      return attributes
        ? `<${tag} ${attributes} />`
        : `<${tag} />`;
    }

    return (
      opening +
      content +
      `</${tag}>`
    );
  }

  /*
   * Hijos genéricos
   */

  function renderChildren(
    definition,
    context = {}
  ) {
    if (!definition) return "";

    if (
      typeof definition === "function"
    ) {
      return String(
        definition({
          ...context,
          utils,
          resolve: (source) =>
            resolveValue(
              source,
              context
            )
        }) ?? ""
      );
    }

    if (Array.isArray(definition)) {
      return definition
        .map((childDefinition) => {
          return renderComponent(
            childDefinition,
            context
          );
        })
        .join("");
    }

    if (
      !utils.isPlainObject(
        definition
      )
    ) {
      return "";
    }

    const children = resolveValue(
      definition.field,
      context
    );

    if (
      !Array.isArray(children) ||
      !children.length
    ) {
      return "";
    }

    const joiner =
      definition.joiner ?? "\n";

    return children
      .map((child, index) => {
        const childContext = {
          ...context,
          child,
          index
        };

        if (
          typeof definition.render ===
          "function"
        ) {
          return String(
            definition.render({
              ...childContext,
              resolve: (source) =>
                resolveValue(
                  source,
                  childContext
                ),
              utils
            }) ?? ""
          );
        }

        return renderComponent(
          {
            tag:
              definition.tag ||
              "div",

            attrs:
              definition.attrs ||
              {},

            content:
              definition.content ||
              "",

            children:
              definition.children ||
              null,

            omitEmptyAttributes:
              definition
                .omitEmptyAttributes !==
              false,

            escapeContent:
              definition.escapeContent
          },
          childContext
        );
      })
      .filter(Boolean)
      .join(joiner);
  }

  /*
   * collection
   *
   * Publica cada entrada como un componente.
   */

  function renderCollection(
    definition,
    context = {}
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_COLLECTION,
      definition || {}
    );

    const entries =
      getSectionEntries(context);

    const renderedEntries = entries
      .map((entry, index) => {
        const item = getItem(
          context,
          entry
        );

        if (!item) return "";

        const entryContext = {
          ...context,
          item,
          entry,
          index
        };

        if (
          typeof config.renderEntry ===
          "function"
        ) {
          return String(
            config.renderEntry({
              ...entryContext,
              resolve: (source) =>
                resolveValue(
                  source,
                  entryContext
                ),
              component:
                (
                  componentDefinition
                ) =>
                  renderComponent(
                    componentDefinition,
                    entryContext
                  ),
              utils
            }) ?? ""
          );
        }

        return renderComponent(
          config.item,
          entryContext
        );
      })
      .filter(Boolean);

    if (!renderedEntries.length) {
      return "";
    }

    const content =
      renderedEntries.join(
        config.entryJoiner
      );

    if (
      !config.wrapperTag &&
      !config.wrapperClass
    ) {
      return content;
    }

    const wrapperTag =
      normalizeTagName(
        config.wrapperTag || "div",
        "div"
      );

    const wrapperAttributes = {
      ...(config.wrapperAttrs || {})
    };

if (config.wrapperClass) {
  wrapperAttributes.class =
    () => config.wrapperClass;
}

    const attributes =
      buildAttributes(
        wrapperAttributes,
        context,
        {
          omitEmpty: true
        }
      );

    return (
      `<${wrapperTag}` +
      `${attributes ? ` ${attributes}` : ""}>` +
      content +
      `</${wrapperTag}>`
    );
  }

  /*
   * group
   *
   * Cada entrada genera un componente
   * padre con varios hijos.
   */

  function renderGroup(
    definition,
    context = {}
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_GROUP,
      definition || {}
    );

    const entries =
      getSectionEntries(context);

    return entries
      .map((entry, index) => {
        const item = getItem(
          context,
          entry
        );

        if (!item) return "";

        const entryContext = {
          ...context,
          item,
          entry,
          index
        };

        const children =
          renderChildren(
            config.children,
            entryContext
          );

        return renderComponent(
          {
            ...config.parent,

            renderContent:
              (componentContext) => {
                let parentContent = "";

                if (
                  typeof config.parent
                    .renderContent ===
                  "function"
                ) {
                  parentContent = String(
                    config.parent
                      .renderContent(
                        componentContext
                      ) ?? ""
                  );
                } else if (
                  config.parent.content
                ) {
                  const resolved =
                    resolveString(
                      config.parent.content,
                      entryContext
                    );

                  parentContent =
                    config.parent
                      .escapeContent ===
                    false
                      ? resolved
                      : escapeText(
                          resolved
                        );
                }

                return (
                  parentContent +
                  children
                );
              }
          },
          entryContext
        );
      })
      .filter(Boolean)
      .join(config.entryJoiner);
  }

  /*
   * template
   *
   * Sustituye {{valor}} en una plantilla.
   *
   * Ejemplo:
   *
   * {
   *   type: "template",
   *   template:
   *     '<s-item item="{{titulo}}"></s-item>'
   * }
   */

  function renderTemplate(
    definition,
    context = {}
  ) {
    const template = String(
      definition.template || ""
    );

    const entries =
      definition.eachEntry === false
        ? [null]
        : getSectionEntries(context);

    const renderOne = (
      entry,
      index
    ) => {
      const item = entry
        ? getItem(context, entry)
        : context.item;

      const localContext = {
        ...context,
        item,
        entry,
        index
      };

      return template.replace(
        /\{\{\s*([^}]+?)\s*\}\}/g,
        (_, source) => {
          const value = resolveString(
            source,
            localContext,
            {
              arrayJoiner:
                definition.arrayJoiner ||
                ", "
            }
          );

          return definition.escape ===
            false
            ? value
            : escapeAttribute(value);
        }
      );
    };

    return entries
      .map(renderOne)
      .filter(Boolean)
      .join(
        definition.joiner ?? "\n"
      );
  }

  function buildAfterCode(
  definition,
  context = {}
) {
  const config = utils.deepMerge(
    {},
    DEFAULT_MESSAGE.afterCode,
    definition || {}
  );

  if (!config.enabled) {
    return "";
  }

  if (
    typeof config.render !==
    "function"
  ) {
    return "";
  }

  const rendered =
    config.render({
      sections:
        context.sections || {},

      totals:
        context.totals || {},

      config:
        context.config || {},

      shop:
        context.shop,

      getItem: (entry) => {
        return getItem(
          context,
          entry
        );
      },

      escapeAttribute,

      escapeText,

      resolve: (
        source,
        local = {}
      ) => {
        return resolveValue(
          source,
          {
            ...context,
            ...local
          }
        );
      },

      component: (
        definition,
        local = {}
      ) => {
        return renderComponent(
          definition,
          {
            ...context,
            ...local
          }
        );
      },

      utils
    });

  return rendered
    ? String(rendered)
    : "";
}

  /*
   * Campos externos
   */

function buildOutsideFields(
  definition,
  context = {}
) {
  const config = utils.deepMerge(
    {},
    DEFAULT_MESSAGE.outsideFields,
    definition || {}
  );

  if (!config.enabled) {
    return "";
  }

  const groups = [];

  Object.entries(
    context.sections || {}
  ).forEach(
    ([sectionName, entries]) => {
    if (!Array.isArray(entries)) {
      return;
    }
      const sectionConfig =
        context.config
          ?.sections?.[sectionName] ||
        context.shop
          ?.getSectionConfig?.(
            sectionName
          );

      const definitions =
        sectionConfig?.fields || [];

      if (!definitions.length) {
        return;
      }

      entries.forEach((entry) => {
        const item = getItem(
          context,
          entry
        );

        if (!item) {
          return;
        }

        /*
         * Normalizamos una sola vez todos
         * los campos que deben publicarse.
         */

        const outputFields = definitions
          .filter((field) => {
            return (
              field.outsideOutput !==
              false
            );
          })
          .map((field) => {
            const name =
              utils.normalizeName(
                field.name
              );

            const storedValue =
              entry.fields?.[name];

            const rawValues =
              Array.isArray(storedValue)
                ? storedValue
                : [storedValue];

            const values = rawValues
              .map((value) => {
                if (
                  typeof value ===
                  "boolean"
                ) {
                  return value
                    ? (
                        field.trueLabel ||
                        "Sí"
                      )
                    : "";
                }

                return String(
                  value ?? ""
                ).trim();
              })
              .filter(Boolean);

            return {
              name,

              label:
                field.outputLabel ||
                field.label ||
                name,

              values,

              definition: field
            };
          })
          .filter((field) => {
            return field.values.length;
          });

        if (!outputFields.length) {
          return;
        }

        const title =
          context.shop?.getTitle?.(
            item
          ) ||
          item.title ||
          item.raw?.titulo ||
          item.raw?.nombre ||
          "";

        /*
         * Salida personalizada.
         */

        if (
          typeof config.renderItem ===
          "function"
        ) {
          const rendered =
            config.renderItem({
              item,
              entry,
              sectionName,
              title,

              fields:
                outputFields,

              shop:
                context.shop,

              escapeAttribute,
              escapeText,

              utils
            });

          if (rendered) {
            groups.push(
              String(rendered)
            );
          }

          return;
        }

        /*
         * Fallback de texto plano.
         */

        const lines = [];

        outputFields.forEach(
          (field) => {
            field.values.forEach(
              (
                value,
                index
              ) => {
                const suffix =
                  field.values.length > 1
                    ? ` ${index + 1}`
                    : "";

                lines.push(
                  `${config.linePrefix}` +
                  `${field.label}` +
                  `${suffix}: ` +
                  `${value}`
                );
              }
            );
          }
        );

        groups.push(
          `${title}\n` +
          `${lines.join("\n")}`
        );
      });
    }
  );

  if (!groups.length) {
    return "";
  }

  const body = groups.join(
    config.itemSeparator
  );

  return config.title
    ? `${config.title}\n\n${body}`
    : body;
}

  /*
   * Totales
   */

  function buildTotals(
    definitions,
    context = {}
  ) {
    const totals =
      Array.isArray(definitions)
        ? definitions
        : [];

    const lines = [];

    totals.forEach((definition) => {
      if (
        !utils.isPlainObject(
          definition
        )
      ) {
        return;
      }

      const sectionName =
        definition.section;

      const value =
        sectionName
          ? context.totals?.[
              sectionName
            ]
          : definition.value;

      if (
        value === null ||
        value === undefined
      ) {
        return;
      }

      if (
        definition.hideZero &&
        Number(value) === 0
      ) {
        return;
      }

      const section =
        context.config
          ?.sections?.[
            sectionName
          ];

      const label =
        definition.label ||
        section?.label ||
        "TOTAL";

      const currency =
        definition.currency ===
          false ||
        !context.config?.currency
          ? ""
          : ` ${context.config.currency}`;

      const prefix =
        definition.prefix || "";

      const suffix =
        definition.suffix || "";

      lines.push(
        `${label}: ` +
        `${prefix}` +
        `${value}` +
        `${suffix}` +
        `${currency}`
      );
    });

    return lines.join("\n");
  }

  /*
   * Mensaje completo
   */

  function renderMessage(
    definition,
    context = {}
  ) {
    const config = utils.deepMerge(
      {},
      DEFAULT_MESSAGE,
      definition || {}
    );

    const sectionContents = [];

    Object.entries(
      config.sections || {}
    ).forEach(
      ([
        sectionName,
        sectionDefinition
      ]) => {
        const entries =
          context.sections?.[
            sectionName
          ] || [];

        if (!entries.length) {
          return;
        }

        const localContext = {
          ...context,
          sectionName,
          entries
        };

        const rendered =
          renderSectionOutput(
            sectionDefinition,
            localContext
          );

        if (rendered) {
          sectionContents.push(
            rendered
          );
        }
      }
    );

    const mainContent =
      sectionContents.join(
        config.sectionJoiner
      );

    let message = "";

    if (mainContent) {
      message = config.codeBlock
        ? (
            `${config.codeOpen}` +
            `${mainContent}` +
            `${config.codeClose}`
          )
        : mainContent;
    }

const afterCode =
  buildAfterCode(
    config.afterCode,
    context
  );

const outsideFields =
  buildOutsideFields(
    config.outsideFields,
    context
  );

const totals = buildTotals(
  config.totals,
  context
);

const externalBlocks = [
  afterCode,
  outsideFields,
  totals
].filter(Boolean);

    if (externalBlocks.length) {
      message +=
        `${message ? "\n\n" : ""}` +
        externalBlocks.join("\n\n");
    }

    return (
      message ||
      config.emptyMessage ||
      ""
    );
  }

  function renderSectionOutput(
    definition,
    context = {}
  ) {
    if (
      typeof definition ===
      "function"
    ) {
      return String(
        definition({
          ...context,
          resolve: (source) =>
            resolveValue(
              source,
              context
            ),
          component:
            (
              componentDefinition,
              componentContext = context
            ) =>
              renderComponent(
                componentDefinition,
                componentContext
              ),
          utils
        }) ?? ""
      );
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
      return "";
    }

    const type =
      definition.type ||
      "collection";

    switch (type) {
      case "component":
        return renderEntriesAsComponents(
          definition,
          context
        );

      case "group":
        return renderGroup(
          definition,
          context
        );

      case "template":
        return renderTemplate(
          definition,
          context
        );

      case "custom":
        return renderCustom(
          definition,
          context
        );

      case "collection":
      default:
        return renderCollection(
          definition,
          context
        );
    }
  }

  function renderEntriesAsComponents(
    definition,
    context
  ) {
    const entries =
      getSectionEntries(context);

    return entries
      .map((entry, index) => {
        const item = getItem(
          context,
          entry
        );

        if (!item) return "";

        return renderComponent(
          definition,
          {
            ...context,
            item,
            entry,
            index
          }
        );
      })
      .filter(Boolean)
      .join(
        definition.entryJoiner ||
        "\n"
      );
  }

  function renderCustom(
    definition,
    context
  ) {
    const renderer =
      definition.render ||
      definition.build ||
      definition.output;

    if (
      typeof renderer !== "function"
    ) {
      return "";
    }

    return String(
      renderer({
        ...context,

        resolve: (source, local = {}) =>
          resolveValue(
            source,
            {
              ...context,
              ...local
            }
          ),

        component:
          (
            componentDefinition,
            local = {}
          ) =>
            renderComponent(
              componentDefinition,
              {
                ...context,
                ...local
              }
            ),

        collection:
          (
            collectionDefinition,
            local = {}
          ) =>
            renderCollection(
              collectionDefinition,
              {
                ...context,
                ...local
              }
            ),

        group:
          (
            groupDefinition,
            local = {}
          ) =>
            renderGroup(
              groupDefinition,
              {
                ...context,
                ...local
              }
            ),

        utils
      }) ?? ""
    );
  }

  function getSectionEntries(context) {
    if (
      Array.isArray(
        context.entries
      )
    ) {
      return context.entries;
    }

    if (context.sectionName) {
      return (
        context.sections?.[
          context.sectionName
        ] || []
      );
    }

    return [];
  }

  /*
   * Fábricas
   */

  function component(
    options = {}
  ) {
    return utils.deepMerge(
      {},
      DEFAULT_COMPONENT,
      options,
      {
        type: "component"
      }
    );
  }

  function collection(
    options = {}
  ) {
    return utils.deepMerge(
      {},
      DEFAULT_COLLECTION,
      options,
      {
        type: "collection"
      }
    );
  }

  function group(options = {}) {
    return utils.deepMerge(
      {},
      DEFAULT_GROUP,
      options,
      {
        type: "group"
      }
    );
  }

  function template(
    templateValue,
    options = {}
  ) {
    return {
      ...options,
      type: "template",
      template: templateValue
    };
  }

  function custom(
    render,
    options = {}
  ) {
    return {
      ...options,
      type: "custom",
      render
    };
  }

  function message(options = {}) {
    return utils.deepMerge(
      {},
      DEFAULT_MESSAGE,
      options,
      {
        type: "message"
      }
    );
  }

  /*
   * Resolvedor principal
   */

  function resolve(
    definition,
    context = {}
  ) {
    if (
      definition === undefined ||
      definition === null
    ) {
      return "";
    }

    if (
      typeof definition ===
      "function"
    ) {
      return String(
        definition({
          ...context,
          utils
        }) ?? ""
      );
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
      return "";
    }

    const type =
      definition.type ||
      (
        definition.sections
          ? "message"
          : "collection"
      );

    switch (type) {
      case "message":
        return renderMessage(
          definition,
          context
        );

      case "component":
        return context.entry
          ? renderComponent(
              definition,
              context
            )
          : renderEntriesAsComponents(
              definition,
              context
            );

      case "collection":
        return renderCollection(
          definition,
          context
        );

      case "group":
        return renderGroup(
          definition,
          context
        );

      case "template":
        return renderTemplate(
          definition,
          context
        );

      case "custom":
        return renderCustom(
          definition,
          context
        );

      default:
        throw new Error(
          `[PixieShopOutput] No existe la salida “${type}”.`
        );
    }
  }

  /*
   * API
   */

  const PixieShopOutput = {
    version: VERSION,

    resolve,

    message,

    component,

    collection,

    group,

    template,

    custom,

    renderMessage,

    renderComponent,

    renderCollection,

    renderGroup,

    renderTemplate,

    buildOutsideFields,

    buildAfterCode,

    buildTotals,

    resolveValue,

    resolveString,

    buildAttributes,

    escapeAttribute,

    escapeText,

    utils: {
      readPath,
      getItem,
      getRawItem,
      normalizeTagName,
      normalizeAttributeName
    }
  };

  PixieShop.module(
    MODULE_NAME,
    PixieShopOutput
  );
})(window);
