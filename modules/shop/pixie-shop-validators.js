/*!
 * PixieShopValidators.js
 * Validaciones reutilizables para PixieShop.
 *
 * @version 1.0.0
 *
 * Requiere:
 * - pixie-shop.js
 *
 * Tipos disponibles:
 * - compose
 * - fields
 * - required
 * - url
 * - email
 * - min-length
 * - max-length
 * - number
 * - min-values
 * - max-values
 * - at-least-one
 * - all-required
 * - required-when
 * - condition
 * - custom
 */

(function (window) {
  "use strict";

  const MODULE_NAME = "validators";
  const VERSION = "1.0.0";

  if (!window.PixieShop) {
    console.warn(
      "[PixieShopValidators] PixieShop no está disponible."
    );

    return;
  }

  const PixieShop = window.PixieShop;
  const { utils } = PixieShop;

  const DEFAULT_MESSAGES = {
    required:
      "{item}: falta “{field}”.",

    invalidUrl:
      "{item}: “{field}” no contiene una URL válida.",

    invalidEmail:
      "{item}: “{field}” no contiene un email válido.",

    minLength:
      "{item}: “{field}” debe tener al menos {min} caracteres.",

    maxLength:
      "{item}: “{field}” no puede superar {max} caracteres.",

    invalidNumber:
      "{item}: “{field}” debe ser un número válido.",

    minNumber:
      "{item}: “{field}” debe ser igual o mayor que {min}.",

    maxNumber:
      "{item}: “{field}” debe ser igual o menor que {max}.",

    minValues:
      "{item}: “{field}” necesita al menos {min} valor(es).",

    maxValues:
      "{item}: “{field}” admite como máximo {max} valor(es).",

    atLeastOne:
      "{item}: debes rellenar al menos uno de estos campos: {fields}.",

    allRequired:
      "{item}: debes rellenar todos estos campos: {fields}."
  };

  /*
   * Utilidades
   */

  function getItemTitle(context) {
    if (!context.item) {
      return "";
    }

    if (
      typeof context.shop?.getTitle ===
      "function"
    ) {
      return context.shop.getTitle(
        context.item
      );
    }

    return (
      context.item.title ||
      context.item.raw?.titulo ||
      context.item.raw?.nombre ||
      ""
    );
  }

  function getSectionFields(context) {
    if (
      Array.isArray(
        context.section?.fields
      )
    ) {
      return context.section.fields;
    }

    return (
      context.shop
        ?.getSectionConfig?.(
          context.sectionName
        )
        ?.fields || []
    );
  }

  function getFieldConfig(
    context,
    fieldName
  ) {
    const normalized =
      utils.normalizeName(
        fieldName
      );

    return (
      getSectionFields(context).find(
        (field) => {
          return (
            utils.normalizeName(
              field.name
            ) === normalized
          );
        }
      ) || null
    );
  }

  function getFieldLabel(
    context,
    fieldName
  ) {
    const field = getFieldConfig(
      context,
      fieldName
    );

    return (
      field?.label ||
      field?.outputLabel ||
      fieldName
    );
  }

  function getValue(
    context,
    fieldName
  ) {
    const name =
      utils.normalizeName(
        fieldName
      );

    return context.entry
      ?.fields?.[name];
  }

  function getValues(
    context,
    fieldName
  ) {
    const value = getValue(
      context,
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
    context,
    fieldName
  ) {
    return getValues(
      context,
      fieldName
    )
      .map((value) => {
        if (typeof value === "boolean") {
          return value ? "true" : "";
        }

        return String(
          value ?? ""
        ).trim();
      })
      .filter(Boolean);
  }

  function hasValue(
    context,
    fieldName
  ) {
    const value = getValue(
      context,
      fieldName
    );

    if (typeof value === "boolean") {
      return value;
    }

    return (
      getFilledValues(
        context,
        fieldName
      ).length > 0
    );
  }

  function formatMessage(
    template,
    context,
    values = {}
  ) {
    return utils.format(
      template,
      {
        item: getItemTitle(context),
        ...values
      }
    );
  }

  function isValidUrl(value) {
    const stringValue =
      String(value ?? "").trim();

    if (!stringValue) return false;

    try {
      const url = new URL(
        stringValue,
        window.location.href
      );

      return (
        url.protocol === "http:" ||
        url.protocol === "https:"
      );
    } catch {
      return false;
    }
  }

  function isValidEmail(value) {
    const stringValue =
      String(value ?? "").trim();

    if (!stringValue) return false;

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      stringValue
    );
  }

  function normalizeErrors(result) {
    if (
      result === undefined ||
      result === null ||
      result === false ||
      result === true
    ) {
      return [];
    }

    if (Array.isArray(result)) {
      return result
        .flatMap(normalizeErrors)
        .filter(Boolean);
    }

    return [
      String(result)
    ];
  }

  /*
   * required
   */

  function validateRequired(
    definition,
    context
  ) {
    const fieldName =
      definition.field ||
      definition.name;

    if (
      hasValue(
        context,
        fieldName
      )
    ) {
      return [];
    }

    return [
      formatMessage(
        definition.message ||
          DEFAULT_MESSAGES.required,
        context,
        {
          field: getFieldLabel(
            context,
            fieldName
          )
        }
      )
    ];
  }

  /*
   * url
   */

  function validateUrl(
    definition,
    context
  ) {
    const fieldName =
      definition.field ||
      definition.name;

    const values =
      getFilledValues(
        context,
        fieldName
      );

    if (!values.length) {
      return [];
    }

    const errors = [];

    values.forEach((value) => {
      if (!isValidUrl(value)) {
        errors.push(
          formatMessage(
            definition.message ||
              DEFAULT_MESSAGES.invalidUrl,
            context,
            {
              field:
                getFieldLabel(
                  context,
                  fieldName
                )
            }
          )
        );
      }
    });

    return errors;
  }

  /*
   * email
   */

  function validateEmail(
    definition,
    context
  ) {
    const fieldName =
      definition.field ||
      definition.name;

    const values =
      getFilledValues(
        context,
        fieldName
      );

    if (!values.length) {
      return [];
    }

    const errors = [];

    values.forEach((value) => {
      if (!isValidEmail(value)) {
        errors.push(
          formatMessage(
            definition.message ||
              DEFAULT_MESSAGES.invalidEmail,
            context,
            {
              field:
                getFieldLabel(
                  context,
                  fieldName
                )
            }
          )
        );
      }
    });

    return errors;
  }

  /*
   * min-length
   */

  function validateMinLength(
    definition,
    context
  ) {
    const fieldName =
      definition.field ||
      definition.name;

    const minimum = Math.max(
      0,
      utils.toNumber(
        definition.min,
        0
      )
    );

    const errors = [];

    getFilledValues(
      context,
      fieldName
    ).forEach((value) => {
      if (
        String(value).length <
        minimum
      ) {
        errors.push(
          formatMessage(
            definition.message ||
              DEFAULT_MESSAGES.minLength,
            context,
            {
              field:
                getFieldLabel(
                  context,
                  fieldName
                ),

              min: minimum
            }
          )
        );
      }
    });

    return errors;
  }

  /*
   * max-length
   */

  function validateMaxLength(
    definition,
    context
  ) {
    const fieldName =
      definition.field ||
      definition.name;

    const maximum = Math.max(
      0,
      utils.toNumber(
        definition.max,
        0
      )
    );

    const errors = [];

    getFilledValues(
      context,
      fieldName
    ).forEach((value) => {
      if (
        String(value).length >
        maximum
      ) {
        errors.push(
          formatMessage(
            definition.message ||
              DEFAULT_MESSAGES.maxLength,
            context,
            {
              field:
                getFieldLabel(
                  context,
                  fieldName
                ),

              max: maximum
            }
          )
        );
      }
    });

    return errors;
  }

  /*
   * number
   */

  function validateNumber(
    definition,
    context
  ) {
    const fieldName =
      definition.field ||
      definition.name;

    const values =
      getFilledValues(
        context,
        fieldName
      );

    const errors = [];

    values.forEach((value) => {
      const parsed = Number(value);

      if (!Number.isFinite(parsed)) {
        errors.push(
          formatMessage(
            definition.message ||
              DEFAULT_MESSAGES
                .invalidNumber,
            context,
            {
              field:
                getFieldLabel(
                  context,
                  fieldName
                )
            }
          )
        );

        return;
      }

      if (
        definition.min !==
          undefined &&
        parsed <
          Number(definition.min)
      ) {
        errors.push(
          formatMessage(
            definition.minMessage ||
              DEFAULT_MESSAGES.minNumber,
            context,
            {
              field:
                getFieldLabel(
                  context,
                  fieldName
                ),

              min: definition.min
            }
          )
        );
      }

      if (
        definition.max !==
          undefined &&
        parsed >
          Number(definition.max)
      ) {
        errors.push(
          formatMessage(
            definition.maxMessage ||
              DEFAULT_MESSAGES.maxNumber,
            context,
            {
              field:
                getFieldLabel(
                  context,
                  fieldName
                ),

              max: definition.max
            }
          )
        );
      }
    });

    return errors;
  }

  /*
   * min-values
   */

  function validateMinValues(
    definition,
    context
  ) {
    const fieldName =
      definition.field ||
      definition.name;

    const minimum = Math.max(
      0,
      utils.toNumber(
        definition.min,
        0
      )
    );

    const count =
      getFilledValues(
        context,
        fieldName
      ).length;

    if (count >= minimum) {
      return [];
    }

    return [
      formatMessage(
        definition.message ||
          DEFAULT_MESSAGES.minValues,
        context,
        {
          field: getFieldLabel(
            context,
            fieldName
          ),

          min: minimum
        }
      )
    ];
  }

  /*
   * max-values
   */

  function validateMaxValues(
    definition,
    context
  ) {
    const fieldName =
      definition.field ||
      definition.name;

    const maximum = Math.max(
      0,
      utils.toNumber(
        definition.max,
        0
      )
    );

    const count =
      getFilledValues(
        context,
        fieldName
      ).length;

    if (count <= maximum) {
      return [];
    }

    return [
      formatMessage(
        definition.message ||
          DEFAULT_MESSAGES.maxValues,
        context,
        {
          field: getFieldLabel(
            context,
            fieldName
          ),

          max: maximum
        }
      )
    ];
  }

  /*
   * at-least-one
   */

  function validateAtLeastOne(
    definition,
    context
  ) {
    const fields =
      utils.toArray(
        definition.fields
      )
        .map(String)
        .filter(Boolean);

    const valid = fields.some(
      (fieldName) => {
        return hasValue(
          context,
          fieldName
        );
      }
    );

    if (valid) {
      return [];
    }

    const labels = fields.map(
      (fieldName) => {
        return getFieldLabel(
          context,
          fieldName
        );
      }
    );

    return [
      formatMessage(
        definition.message ||
          DEFAULT_MESSAGES.atLeastOne,
        context,
        {
          fields:
            labels.join(", ")
        }
      )
    ];
  }

  /*
   * all-required
   */

  function validateAllRequired(
    definition,
    context
  ) {
    const fields =
      utils.toArray(
        definition.fields
      )
        .map(String)
        .filter(Boolean);

    const missing = fields.filter(
      (fieldName) => {
        return !hasValue(
          context,
          fieldName
        );
      }
    );

    if (!missing.length) {
      return [];
    }

    const labels = missing.map(
      (fieldName) => {
        return getFieldLabel(
          context,
          fieldName
        );
      }
    );

    return [
      formatMessage(
        definition.message ||
          DEFAULT_MESSAGES.allRequired,
        context,
        {
          fields:
            labels.join(", ")
        }
      )
    ];
  }

  /*
   * required-when
   */

  function validateRequiredWhen(
    definition,
    context
  ) {
    const condition =
      typeof definition.when ===
      "function"
        ? Boolean(
            definition.when(
              context
            )
          )
        : Boolean(
            definition.when
          );

    if (!condition) {
      return [];
    }

    return validateRequired(
      definition,
      context
    );
  }

  /*
   * condition
   *
   * Ejecuta una validación solamente
   * cuando se cumple la condición.
   */

  function validateCondition(
    definition,
    context
  ) {
    const condition =
      typeof definition.when ===
      "function"
        ? Boolean(
            definition.when(
              context
            )
          )
        : Boolean(
            definition.when
          );

    if (!condition) {
      return [];
    }

    const rule =
      definition.rule ||
      definition.validator ||
      definition.then;

    return resolve(
      rule,
      context
    );
  }

  /*
   * fields
   *
   * Valida automáticamente las
   * definiciones de campo de la sección:
   *
   * - required
   * - type=url
   * - type=email
   * - type=number
   * - minLength
   * - maxLength
   * - min y max de repetibles
   */

  function validateFields(
    definition,
    context
  ) {
    const fieldDefinitions =
      Array.isArray(
        definition.fields
      )
        ? definition.fields
        : getSectionFields(
            context
          );

    const errors = [];

    fieldDefinitions.forEach(
      (field) => {
        if (
          !utils.isPlainObject(
            field
          ) ||
          !field.name
        ) {
          return;
        }

        const fieldName =
          field.name;

        if (field.required) {
          errors.push(
            ...validateRequired(
              {
                field: fieldName,

                message:
                  field.requiredMessage
              },
              context
            )
          );
        }

        if (field.type === "url") {
          errors.push(
            ...validateUrl(
              {
                field: fieldName,

                message:
                  field.invalidMessage
              },
              context
            )
          );
        }

        if (field.type === "email") {
          errors.push(
            ...validateEmail(
              {
                field: fieldName,

                message:
                  field.invalidMessage
              },
              context
            )
          );
        }

        if (field.type === "number") {
          errors.push(
            ...validateNumber(
              {
                field: fieldName,

                min:
                  field.minValue,

                max:
                  field.maxValue,

                message:
                  field.invalidMessage,

                minMessage:
                  field.minMessage,

                maxMessage:
                  field.maxMessage
              },
              context
            )
          );
        }

        if (
          field.minLength !==
          undefined
        ) {
          errors.push(
            ...validateMinLength(
              {
                field: fieldName,

                min:
                  field.minLength,

                message:
                  field.minLengthMessage
              },
              context
            )
          );
        }

        if (
          field.maxLength !==
          undefined
        ) {
          errors.push(
            ...validateMaxLength(
              {
                field: fieldName,

                max:
                  field.maxLength,

                message:
                  field.maxLengthMessage
              },
              context
            )
          );
        }

        if (
          field.repeatable &&
          field.min !== undefined
        ) {
          errors.push(
            ...validateMinValues(
              {
                field: fieldName,

                min:
                  field.min,

                message:
                  field.minValuesMessage
              },
              context
            )
          );
        }

        if (
          field.repeatable &&
          field.max !== null &&
          field.max !== undefined
        ) {
          errors.push(
            ...validateMaxValues(
              {
                field: fieldName,

                max:
                  field.max,

                message:
                  field.maxValuesMessage
              },
              context
            )
          );
        }
      }
    );

    return errors;
  }

  /*
   * custom
   */

  function validateCustom(
    definition,
    context
  ) {
    const validator =
      definition.validate ||
      definition.validator ||
      definition.run;

    if (
      typeof validator !==
      "function"
    ) {
      return [];
    }

    return normalizeErrors(
      validator({
        ...context,

        getValue:
          (fieldName) =>
            getValue(
              context,
              fieldName
            ),

        getValues:
          (fieldName) =>
            getValues(
              context,
              fieldName
            ),

        getFilledValues:
          (fieldName) =>
            getFilledValues(
              context,
              fieldName
            ),

        hasValue:
          (fieldName) =>
            hasValue(
              context,
              fieldName
            ),

        utils
      })
    );
  }

  /*
   * compose
   */

  function validateCompose(
    definition,
    context
  ) {
    const rules = [
      /*
       * La validación automática de
       * los campos se ejecuta por defecto.
       */
      ...(definition.includeFields ===
      false
        ? []
        : [
            {
              type: "fields"
            }
          ]),

      ...utils.toArray(
        definition.rules
      )
    ];

    const errors = [];

    rules.forEach((rule) => {
      errors.push(
        ...normalizeErrors(
          resolve(
            rule,
            context
          )
        )
      );
    });

    return [
      ...new Set(errors)
    ];
  }

  /*
   * Fábricas declarativas
   */

  function fields(
    options = {}
  ) {
    return {
      ...options,
      type: "fields"
    };
  }

  function required(
    fieldName,
    options = {}
  ) {
    return {
      ...options,
      type: "required",
      field: fieldName
    };
  }

  function url(
    fieldName,
    options = {}
  ) {
    return {
      ...options,
      type: "url",
      field: fieldName
    };
  }

  function email(
    fieldName,
    options = {}
  ) {
    return {
      ...options,
      type: "email",
      field: fieldName
    };
  }

  function minLength(
    fieldName,
    min,
    options = {}
  ) {
    return {
      ...options,
      type: "min-length",
      field: fieldName,
      min
    };
  }

  function maxLength(
    fieldName,
    max,
    options = {}
  ) {
    return {
      ...options,
      type: "max-length",
      field: fieldName,
      max
    };
  }

  function number(
    fieldName,
    options = {}
  ) {
    return {
      ...options,
      type: "number",
      field: fieldName
    };
  }

  function minValues(
    fieldName,
    min,
    options = {}
  ) {
    return {
      ...options,
      type: "min-values",
      field: fieldName,
      min
    };
  }

  function maxValues(
    fieldName,
    max,
    options = {}
  ) {
    return {
      ...options,
      type: "max-values",
      field: fieldName,
      max
    };
  }

  function atLeastOne(
    fieldNames,
    options = {}
  ) {
    return {
      ...options,
      type: "at-least-one",

      fields:
        utils.toArray(
          fieldNames
        )
    };
  }

  function allRequired(
    fieldNames,
    options = {}
  ) {
    return {
      ...options,
      type: "all-required",

      fields:
        utils.toArray(
          fieldNames
        )
    };
  }

  function requiredWhen(
    fieldName,
    when,
    options = {}
  ) {
    return {
      ...options,
      type: "required-when",
      field: fieldName,
      when
    };
  }

  function condition(
    when,
    rule,
    options = {}
  ) {
    return {
      ...options,
      type: "condition",
      when,
      rule
    };
  }

  function custom(
    validate,
    options = {}
  ) {
    return {
      ...options,
      type: "custom",
      validate
    };
  }

  function compose(
    ...rules
  ) {
    let options = {};

    if (
      rules.length &&
      utils.isPlainObject(
        rules[
          rules.length - 1
        ]
      ) &&
      !rules[
        rules.length - 1
      ].type &&
      (
        Object.prototype.hasOwnProperty.call(
          rules[
            rules.length - 1
          ],
          "includeFields"
        ) ||
        Object.prototype.hasOwnProperty.call(
          rules[
            rules.length - 1
          ],
          "rules"
        )
      )
    ) {
      options = rules.pop();
    }

    return {
      type: "compose",

      rules:
        rules.flat().filter(Boolean),

      ...options
    };
  }

  /*
   * Resolvedor
   */

  const validatorTypes = {
    compose:
      validateCompose,

    fields:
      validateFields,

    required:
      validateRequired,

    url:
      validateUrl,

    email:
      validateEmail,

    "min-length":
      validateMinLength,

    "max-length":
      validateMaxLength,

    number:
      validateNumber,

    "min-values":
      validateMinValues,

    "max-values":
      validateMaxValues,

    "at-least-one":
      validateAtLeastOne,

    "all-required":
      validateAllRequired,

    "required-when":
      validateRequiredWhen,

    condition:
      validateCondition,

    custom:
      validateCustom
  };

  function resolve(
    definition,
    context = {}
  ) {
    if (
      definition === undefined ||
      definition === null
    ) {
      return [];
    }

    if (
      typeof definition ===
      "function"
    ) {
      return normalizeErrors(
        definition({
          ...context,
          utils
        })
      );
    }

    if (
      Array.isArray(definition)
    ) {
      return validateCompose(
        {
          type: "compose",
          rules: definition
        },
        context
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
      return [];
    }

    const type =
      definition.type ||
      "compose";

    const validator =
      validatorTypes[type];

    if (!validator) {
      throw new Error(
        `[PixieShopValidators] No existe la validación “${type}”.`
      );
    }

    return normalizeErrors(
      validator(
        definition,
        context
      )
    );
  }

  /*
   * API pública
   */

  const PixieShopValidators = {
    version: VERSION,

    resolve,

    fields,

    required,

    url,

    email,

    minLength,

    maxLength,

    number,

    minValues,

    maxValues,

    atLeastOne,

    allRequired,

    requiredWhen,

    condition,

    custom,

    compose,

    validateFields,

    validateRequired,

    validateUrl,

    validateEmail,

    validateMinLength,

    validateMaxLength,

    validateNumber,

    validateMinValues,

    validateMaxValues,

    validateAtLeastOne,

    validateAllRequired,

    validateRequiredWhen,

    validateCondition,

    validateCustom,

    validateCompose,

    utils: {
      getValue,
      getValues,
      getFilledValues,
      hasValue,
      getFieldConfig,
      getFieldLabel,
      isValidUrl,
      isValidEmail,
      normalizeErrors
    }
  };

  PixieShop.module(
    MODULE_NAME,
    PixieShopValidators
  );
})(window);
