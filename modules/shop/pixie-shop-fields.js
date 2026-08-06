/*!
 * PixieShopFields.js
 * Campos reutilizables para PixieShop.
 *
 * @version 1.0.0
 *
 * Requiere:
 * - PixieShop.js
 *
 * RESPONSABILIDADES
 * -----------------
 * - Crear definiciones declarativas de campos.
 * - Normalizar configuraciones de campos.
 * - Renderizar campos simples y repetibles.
 * - Generar el HTML esperado por los eventos del núcleo.
 * - Ofrecer utilidades para consultar valores del carrito.
 *
 * NO CONTIENE
 * -----------
 * - Validaciones compuestas.
 * - Reglas de negocio.
 * - Cálculos.
 * - Formatos de publicación.
 */

(function (window, document) {
  "use strict";

  const MODULE_NAME = "fields";
  const VERSION = "1.0.0";

  if (!window.PixieShop) {
    console.warn(
      "[PixieShopFields] PixieShop no está disponible."
    );

    return;
  }

  const { utils } = window.PixieShop;

  const DEFAULT_FIELD = {
    type: "text",

    name: "",

    label: "",

    placeholder: "",

    defaultValue: "",

    required: false,

    disabled: false,

    readonly: false,

    repeatable: false,

    min: 0,

    max: null,

    addLabel: "Añadir otro campo",

    removeLabel: "Eliminar campo",

    outsideOutput: true,

    outputLabel: "",

    attributes: {},

    options: []
  };

  const SUPPORTED_TYPES = new Set([
    "text",
    "url",
    "number",
    "email",
    "tel",
    "date",
    "time",
    "datetime-local",
    "textarea",
    "select",
    "checkbox",
    "radio",
    "hidden"
  ]);

  /*
   * Utilidades internas
   */

  function normalizeType(type) {
    const value = String(
      type || "text"
    ).trim();

    return SUPPORTED_TYPES.has(value)
      ? value
      : "text";
  }

  function normalizeDefinition(
    definition = {}
  ) {
    const normalized =
      utils.deepMerge(
        {},
        DEFAULT_FIELD,
        definition
      );

    normalized.type =
      normalizeType(normalized.type);

    normalized.name =
      utils.normalizeName(
        normalized.name
      );

    normalized.label =
      String(
        normalized.label ||
        normalized.name
      );

    normalized.placeholder =
      String(
        normalized.placeholder || ""
      );

    normalized.required =
      Boolean(normalized.required);

    normalized.disabled =
      Boolean(normalized.disabled);

    normalized.readonly =
      Boolean(normalized.readonly);

    normalized.repeatable =
      Boolean(normalized.repeatable);

    normalized.min = Math.max(
      0,
      utils.toNumber(
        normalized.min,
        0
      )
    );

    normalized.max =
      normalized.max === null ||
      normalized.max === undefined ||
      normalized.max === ""
        ? null
        : Math.max(
            normalized.min,
            utils.toNumber(
              normalized.max,
              normalized.min
            )
          );

    normalized.options =
      normalizeOptions(
        normalized.options
      );

    normalized.attributes =
      utils.isPlainObject(
        normalized.attributes
      )
        ? normalized.attributes
        : {};

    return normalized;
  }

  function normalizeDefinitions(
    definitions
  ) {
    return utils
      .toArray(definitions)
      .map(normalizeDefinition)
      .filter((field) => field.name);
  }

  function normalizeOptions(options) {
    if (!Array.isArray(options)) {
      return [];
    }

    return options
      .map((option) => {
        if (
          typeof option === "string" ||
          typeof option === "number"
        ) {
          return {
            value: String(option),
            label: String(option),
            disabled: false
          };
        }

        if (!utils.isPlainObject(option)) {
          return null;
        }

        const value =
          option.value ??
          option.label ??
          "";

        return {
          value: String(value),

          label: String(
            option.label ?? value
          ),

          disabled:
            Boolean(option.disabled)
        };
      })
      .filter(Boolean);
  }

  function getInitialValue(field) {
    const normalized =
      normalizeDefinition(field);

    if (normalized.repeatable) {
      const values = Array.isArray(
        normalized.defaultValue
      )
        ? normalized.defaultValue
            .map((value) => {
              return String(value ?? "");
            })
        : [];

      while (
        values.length <
        normalized.min
      ) {
        values.push("");
      }

      return values;
    }

    if (
      normalized.type ===
      "checkbox"
    ) {
      return Boolean(
        normalized.defaultValue
      );
    }

    return String(
      normalized.defaultValue ??
      ""
    );
  }

  function getFieldValue(
    entry,
    fieldName
  ) {
    const name =
      utils.normalizeName(
        fieldName
      );

    if (
      !entry ||
      !entry.fields ||
      !name
    ) {
      return undefined;
    }

    return entry.fields[name];
  }

  function getFieldValues(
    entry,
    fieldName
  ) {
    const value = getFieldValue(
      entry,
      fieldName
    );

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

  function getFilledValues(
    entry,
    fieldName
  ) {
    return getFieldValues(
      entry,
      fieldName
    )
      .map((value) => {
        return String(value ?? "").trim();
      })
      .filter(Boolean);
  }

  function hasValue(
    entry,
    fieldName
  ) {
    return (
      getFilledValues(
        entry,
        fieldName
      ).length > 0
    );
  }

  function applyAttributes(
    element,
    attributes
  ) {
    if (
      !element ||
      !utils.isPlainObject(
        attributes
      )
    ) {
      return;
    }

    Object.entries(
      attributes
    ).forEach(
      ([name, value]) => {
        if (
          value === undefined ||
          value === null ||
          value === false
        ) {
          return;
        }

        const attributeName =
          String(name).trim();

        if (!attributeName) {
          return;
        }

        if (value === true) {
          element.setAttribute(
            attributeName,
            ""
          );

          return;
        }

        element.setAttribute(
          attributeName,
          String(value)
        );
      }
    );
  }

  function makeId(
    entry,
    fieldName,
    index = null
  ) {
    const parts = [
      "pixie-shop-field",
      entry?.uid || "entry",
      fieldName
    ];

    if (index !== null) {
      parts.push(index);
    }

    return parts.join("-");
  }

  /*
   * Creación de controles
   */

  function createControl(
    field,
    value,
    context = {}
  ) {
    const normalized =
      normalizeDefinition(field);

    let control;

    switch (normalized.type) {
      case "textarea":
        control =
          createTextarea(
            normalized,
            value
          );
        break;

      case "select":
        control =
          createSelect(
            normalized,
            value
          );
        break;

      case "checkbox":
        control =
          createCheckbox(
            normalized,
            value
          );
        break;

      case "radio":
        control =
          createRadioGroup(
            normalized,
            value,
            context
          );
        break;

      default:
        control =
          createInput(
            normalized,
            value
          );
        break;
    }

    if (
      control instanceof Element
    ) {
      applyAttributes(
        control,
        normalized.attributes
      );
    }

    return control;
  }

  function createInput(
    field,
    value
  ) {
    const input =
      document.createElement(
        "input"
      );

    input.type =
      field.type === "hidden"
        ? "hidden"
        : field.type;

    input.value =
      String(value ?? "");

    configureCommonControl(
      input,
      field
    );

    if (
      field.minValue !== undefined
    ) {
      input.min = String(
        field.minValue
      );
    }

    if (
      field.maxValue !== undefined
    ) {
      input.max = String(
        field.maxValue
      );
    }

    if (
      field.step !== undefined
    ) {
      input.step = String(
        field.step
      );
    }

    if (
      field.pattern
    ) {
      input.pattern =
        String(field.pattern);
    }

    if (
      field.minLength !== undefined
    ) {
      input.minLength =
        utils.toNumber(
          field.minLength,
          0
        );
    }

    if (
      field.maxLength !== undefined
    ) {
      input.maxLength =
        utils.toNumber(
          field.maxLength,
          -1
        );
    }

    return input;
  }

  function createTextarea(
    field,
    value
  ) {
    const textarea =
      document.createElement(
        "textarea"
      );

    textarea.value =
      String(value ?? "");

    configureCommonControl(
      textarea,
      field
    );

    if (
      field.rows !== undefined
    ) {
      textarea.rows =
        utils.toNumber(
          field.rows,
          3
        );
    }

    if (
      field.cols !== undefined
    ) {
      textarea.cols =
        utils.toNumber(
          field.cols,
          20
        );
    }

    if (
      field.minLength !== undefined
    ) {
      textarea.minLength =
        utils.toNumber(
          field.minLength,
          0
        );
    }

    if (
      field.maxLength !== undefined
    ) {
      textarea.maxLength =
        utils.toNumber(
          field.maxLength,
          -1
        );
    }

    return textarea;
  }

  function createSelect(
    field,
    value
  ) {
    const select =
      document.createElement(
        "select"
      );

    configureCommonControl(
      select,
      field
    );

    if (field.multiple) {
      select.multiple = true;
    }

    if (
      field.emptyOption !==
      false
    ) {
      const empty =
        document.createElement(
          "option"
        );

      empty.value = "";

      empty.textContent =
        String(
          field.emptyLabel ||
          "Selecciona una opción"
        );

      select.appendChild(empty);
    }

    field.options.forEach(
      (option) => {
        const element =
          document.createElement(
            "option"
          );

        element.value =
          option.value;

        element.textContent =
          option.label;

        element.disabled =
          option.disabled;

        if (
          Array.isArray(value)
        ) {
          element.selected =
            value.includes(
              option.value
            );
        } else {
          element.selected =
            String(value ?? "") ===
            option.value;
        }

        select.appendChild(element);
      }
    );

    return select;
  }

  function createCheckbox(
    field,
    value
  ) {
    const input =
      document.createElement(
        "input"
      );

    input.type = "checkbox";

    input.checked =
      Boolean(value);

    input.value =
      String(
        field.value ?? "true"
      );

    configureCommonControl(
      input,
      field
    );

    return input;
  }

  function createRadioGroup(
    field,
    value,
    context
  ) {
    const group =
      document.createElement(
        "div"
      );

    group.className =
      "cart-item-radio-group";

    field.options.forEach(
      (option, index) => {
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

        const id = makeId(
          context.entry,
          field.name,
          index
        );

        input.id = id;
        input.type = "radio";

        input.name = [
          "pixie-shop",
          context.entry?.uid ||
            "entry",
          field.name
        ].join("-");

        input.value =
          option.value;

        input.checked =
          String(value ?? "") ===
          option.value;

        input.disabled =
          field.disabled ||
          option.disabled;

        input.required =
          field.required;

        input.dataset.cartField =
          field.name;

        text.textContent =
          option.label;

        label.htmlFor = id;

        label.append(
          input,
          text
        );

        group.appendChild(label);
      }
    );

    return group;
  }

  function configureCommonControl(
    control,
    field
  ) {
    control.classList.add(
      "cart-item-field-input"
    );

    control.placeholder =
      field.placeholder;

    control.required =
      field.required;

    control.disabled =
      field.disabled;

    control.readOnly =
      field.readonly;

    control.autocomplete =
      field.autocomplete ||
      "off";

    control.dataset.cartField =
      field.name;
  }

  /*
   * Renderizado de campos simples
   */

  function renderSingle(
    field,
    context
  ) {
    const normalized =
      normalizeDefinition(field);

    const {
      entry
    } = context;

    const value =
      getFieldValue(
        entry,
        normalized.name
      ) ??
      getInitialValue(
        normalized
      );

    if (
      normalized.type ===
      "hidden"
    ) {
      const control =
        createControl(
          normalized,
          value,
          context
        );

      control.dataset.cartField =
        normalized.name;

      return control;
    }

    if (
      normalized.type ===
      "checkbox"
    ) {
      return renderCheckboxField(
        normalized,
        value,
        context
      );
    }

    if (
      normalized.type ===
      "radio"
    ) {
      return renderRadioField(
        normalized,
        value,
        context
      );
    }

    const wrapper =
      document.createElement(
        "label"
      );

    const label =
      document.createElement(
        "span"
      );

    const control =
      createControl(
        normalized,
        value,
        context
      );

    const id = makeId(
      entry,
      normalized.name
    );

    wrapper.className =
      "cart-item-field";

    wrapper.dataset.fieldName =
      normalized.name;

    wrapper.htmlFor = id;

    label.className =
      "cart-item-field-label";

    label.textContent =
      normalized.label;

    control.id = id;

    wrapper.append(
      label,
      control
    );

    return wrapper;
  }

  function renderCheckboxField(
    field,
    value,
    context
  ) {
    const wrapper =
      document.createElement(
        "label"
      );

    const control =
      createControl(
        field,
        value,
        context
      );

    const label =
      document.createElement(
        "span"
      );

    const id = makeId(
      context.entry,
      field.name
    );

    wrapper.className = [
      "cart-item-field",
      "cart-item-checkbox-field"
    ].join(" ");

    wrapper.dataset.fieldName =
      field.name;

    wrapper.htmlFor = id;

    control.id = id;

    label.className =
      "cart-item-field-label";

    label.textContent =
      field.label;

    wrapper.append(
      control,
      label
    );

    return wrapper;
  }

  function renderRadioField(
    field,
    value,
    context
  ) {
    const fieldset =
      document.createElement(
        "fieldset"
      );

    const legend =
      document.createElement(
        "legend"
      );

    const group =
      createControl(
        field,
        value,
        context
      );

    fieldset.className = [
      "cart-item-field",
      "cart-item-radio-field"
    ].join(" ");

    fieldset.dataset.fieldName =
      field.name;

    legend.className =
      "cart-item-field-label";

    legend.textContent =
      field.label;

    fieldset.append(
      legend,
      group
    );

    return fieldset;
  }

  /*
   * Renderizado de campos repetibles
   */

  function renderRepeatable(
    field,
    context
  ) {
    const normalized =
      normalizeDefinition({
        ...field,
        repeatable: true
      });

    const {
      entry
    } = context;

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

    const addButton =
      document.createElement(
        "button"
      );

    const values =
      getRepeatableValues(
        entry,
        normalized
      );

    fieldset.className =
      "cart-item-repeatable-field";

    fieldset.dataset.fieldName =
      normalized.name;

    legend.className =
      "cart-item-field-label";

    legend.textContent =
      normalized.label;

    list.className =
      "cart-item-repeatable-list";

    list.dataset.fieldName =
      normalized.name;

    values.forEach(
      (value, index) => {
        list.appendChild(
          renderRepeatableRow(
            normalized,
            value,
            index,
            context
          )
        );
      }
    );

    addButton.type = "button";

    addButton.className =
      "cart-item-field-add";

    addButton.dataset.cartAction =
      "add-field";

    addButton.dataset.fieldName =
      normalized.name;

    addButton.textContent =
      normalized.addLabel;

    if (
      normalized.max !== null
    ) {
      addButton.disabled =
        values.length >=
        normalized.max;
    }

    fieldset.append(
      legend,
      list,
      addButton
    );

    return fieldset;
  }

  function getRepeatableValues(
    entry,
    field
  ) {
    const stored =
      getFieldValue(
        entry,
        field.name
      );

    const values =
      Array.isArray(stored)
        ? stored
        : getInitialValue(field);

    while (
      values.length <
      field.min
    ) {
      values.push("");
    }

    if (
      entry &&
      entry.fields
    ) {
      entry.fields[field.name] =
        values;
    }

    return values;
  }

  function renderRepeatableRow(
    field,
    value,
    index,
    context
  ) {
    const row =
      document.createElement(
        "div"
      );

    const label =
      document.createElement(
        "label"
      );

    const accessibleLabel =
      document.createElement(
        "span"
      );

    const control =
      createControl(
        {
          ...field,
          repeatable: false
        },
        value,
        context
      );

    const removeButton =
      document.createElement(
        "button"
      );

    const id = makeId(
      context.entry,
      field.name,
      index
    );

    row.className =
      "cart-item-repeatable-row";

    row.dataset.fieldIndex =
      String(index);

    label.htmlFor = id;

    accessibleLabel.className =
      "sr-only";

    accessibleLabel.textContent = [
      field.label,
      index + 1
    ].join(" ");

    label.appendChild(
      accessibleLabel
    );

    control.id = id;

    control.dataset.cartField =
      field.name;

    control.dataset.fieldIndex =
      String(index);

    removeButton.type = "button";

    removeButton.className =
      "cart-item-field-remove";

    removeButton.dataset.cartAction =
      "remove-field";

    removeButton.dataset.fieldName =
      field.name;

    removeButton.dataset.fieldIndex =
      String(index);

    removeButton.setAttribute(
      "aria-label",
      [
        field.removeLabel,
        index + 1
      ].join(" ")
    );

    removeButton.textContent =
      field.removeLabel;

    const minimumReached =
      getFieldValues(
        context.entry,
        field.name
      ).length <= field.min;

    removeButton.disabled =
      minimumReached;

    row.append(
      label,
      control,
      removeButton
    );

    return row;
  }

  /*
   * Renderizado de colecciones
   */

  function render(
    definition,
    context = {}
  ) {
    const field =
      normalizeDefinition(
        definition
      );

    if (!field.name) {
      console.warn(
        "[PixieShopFields] Se ha intentado renderizar un campo sin nombre.",
        definition
      );

      return null;
    }

    return field.repeatable
      ? renderRepeatable(
          field,
          context
        )
      : renderSingle(
          field,
          context
        );
  }

  function renderAll(
    definitions,
    context = {}
  ) {
    const fragment =
      document.createDocumentFragment();

    normalizeDefinitions(
      definitions
    ).forEach((field) => {
      const node = render(
        field,
        context
      );

      if (node) {
        fragment.appendChild(node);
      }
    });

    return fragment;
  }

  function mount(
    container,
    definitions,
    context = {}
  ) {
    if (!(container instanceof Element)) {
      console.warn(
        "[PixieShopFields] mount() necesita un elemento contenedor."
      );

      return null;
    }

    const fragment = renderAll(
      definitions,
      context
    );

    container.replaceChildren(
      fragment
    );

    return container;
  }

  /*
   * Fábricas declarativas
   */

  function field(
    type,
    options = {}
  ) {
    return normalizeDefinition({
      ...options,
      type
    });
  }

  function text(
    options = {}
  ) {
    return field(
      "text",
      options
    );
  }

  function url(
    options = {}
  ) {
    return field(
      "url",
      options
    );
  }

  function email(
    options = {}
  ) {
    return field(
      "email",
      options
    );
  }

  function numberField(
    options = {}
  ) {
    return field(
      "number",
      options
    );
  }

  function textarea(
    options = {}
  ) {
    return field(
      "textarea",
      options
    );
  }

  function select(
    options = {}
  ) {
    return field(
      "select",
      options
    );
  }

  function checkbox(
    options = {}
  ) {
    return field(
      "checkbox",
      options
    );
  }

  function radio(
    options = {}
  ) {
    return field(
      "radio",
      options
    );
  }

  function hidden(
    options = {}
  ) {
    return field(
      "hidden",
      options
    );
  }

  function repeatable(
    type,
    options = {}
  ) {
    return field(type, {
      ...options,
      repeatable: true
    });
  }

  function repeatableText(
    options = {}
  ) {
    return repeatable(
      "text",
      options
    );
  }

  function repeatableUrl(
    options = {}
  ) {
    return repeatable(
      "url",
      options
    );
  }

  function repeatableTextarea(
    options = {}
  ) {
    return repeatable(
      "textarea",
      options
    );
  }

  function group(
    definitions
  ) {
    return normalizeDefinitions(
      definitions
    );
  }

  function urlGroup(
    definitions
  ) {
    return utils
      .toArray(definitions)
      .map((definition) => {
        return url(definition);
      });
  }

  /*
   * Resolvedor declarativo
   *
   * Ejemplos:
   *
   * PixieShop.resolve(
   *   "fields",
   *   {
   *     type: "url",
   *     name: "link"
   *   }
   * );
   *
   * PixieShop.resolve(
   *   "fields",
   *   {
   *     type: "render",
   *     field: {...}
   *   },
   *   context
   * );
   */

  function resolve(
    definition,
    context = {}
  ) {
    if (
      Array.isArray(definition)
    ) {
      if (
        context.mode === "render"
      ) {
        return renderAll(
          definition,
          context
        );
      }

      return normalizeDefinitions(
        definition
      );
    }

    if (
      typeof definition ===
      "string"
    ) {
      return field(
        definition,
        context.options || {}
      );
    }

    if (
      !utils.isPlainObject(
        definition
      )
    ) {
      return null;
    }

    if (
      definition.type === "render"
    ) {
      return render(
        definition.field,
        context
      );
    }

    if (
      definition.type ===
      "render-all"
    ) {
      return renderAll(
        definition.fields,
        context
      );
    }

    if (
      definition.type === "group"
    ) {
      return group(
        definition.fields
      );
    }

    return normalizeDefinition(
      definition
    );
  }

  /*
   * API pública del módulo
   */

  const PixieShopFields = {
    version: VERSION,

    resolve,

    normalize:
      normalizeDefinition,

    normalizeAll:
      normalizeDefinitions,

    initialValue:
      getInitialValue,

    getValue:
      getFieldValue,

    getValues:
      getFieldValues,

    getFilledValues,

    hasValue,

    render,

    renderAll,

    mount,

    control:
      createControl,

    field,

    text,

    url,

    email,

    number:
      numberField,

    textarea,

    select,

    checkbox,

    radio,

    hidden,

    repeatable,

    repeatableText,

    repeatableUrl,

    repeatableTextarea,

    group,

    urlGroup
  };

  window.PixieShop.module(
    MODULE_NAME,
    PixieShopFields
  );
})(window, document);
