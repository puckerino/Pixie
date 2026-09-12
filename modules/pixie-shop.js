window.PixieShop = window.PixieKit("PixieShop", function(Pixie) {

    const SUPABASE_URL = "https://udnotovrosokbdahlqaf.supabase.co";
    const SUPABASE_KEY = "sb_publishable_OQcJe7XcKx0jGCzvUVbALw_isdQEDfo";

    const FORM_SELECTOR = ".fa-generated-shop-form";
    const INITIALIZED_ATTRIBUTE = "data-pixie-shop-initialized";

    const getRecords = async (source) => {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${encodeURIComponent(source)}?select=*`,
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Supabase respondió con ${response.status}.`);
        }

        const records = await response.json();

        return records.filter(record => record.visible !== false);
    };

    const getLabel = (record, mode) => {
        if (mode === "toggle" && record.nombre) {
            return record.nombre;
        }

        return record.titulo || record.nombre || `Registro ${record.id}`;
    };

const createEntry = ({
    personajeId,
    id,
    label,
    cantidad = 1
}) => {
    const entry = document.createElement("div");
    entry.className = "fa-entry";

    const text = document.createElement("input");
    text.type = "hidden";
    text.className = "fa-text";
    text.value = label;

    const value = document.createElement("input");
    value.type = "hidden";
    value.className = "fa-value";
    value.value = id;

    const labelElement = document.createElement("input");
    labelElement.type = "hidden";
    labelElement.className = "fa-label";
    labelElement.value = label;

    const cantidadElement = document.createElement("input");
    cantidadElement.type = "hidden";
    cantidadElement.className = "fa-cantidad";
    cantidadElement.value = cantidad;

    entry.append(
        text,
        value,
        labelElement,
        cantidadElement
    );

    return entry;
};

    const initForm = async (form) => {

        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        if (form.hasAttribute(INITIALIZED_ATTRIBUTE)) {
            return;
        }

        form.setAttribute(INITIALIZED_ATTRIBUTE, "true");

        const formId = form.dataset.id;
        const source = form.dataset.shopSource;
        const mode = form.dataset.shopMode || "toggle";
        const repeatId = form.dataset.shopRepeat;

        const recordsContainer = form.querySelector(".fa-shop-records");

        const repeat = repeatId
            ? form.querySelector(
                `.fa-repeat[data-repeat="${repeatId}"]`
            )
            : null;

        const repeatList = repeat
            ? repeat.querySelector(".fa-repeat-list")
            : null;

        const errorElement =
            form.querySelector(".fa-shop-error");

        const template = document.querySelector(
            `#fa-shop-template-${CSS.escape(formId)}`
        );

        const cart =
            form.querySelector("[data-shop-cart]");

        const cartList = cart
            ? cart.querySelector("[data-shop-cart-list]")
            : null;

        const cartTotal = cart
            ? cart.querySelector("[data-shop-cart-total]")
            : null;

        const cartEmpty = cart
            ? cart.querySelector("[data-shop-cart-empty]")
            : null;

        const cartTemplate = document.querySelector(
            `#fa-shop-cart-template-${CSS.escape(formId)}`
        );

        if (!source || !recordsContainer || !template) {
            return;
        }

        let records = [];
        const selected = new Map();

        const showError = (message) => {

            if (!errorElement) {
                return;
            }

            errorElement.textContent = message;
            errorElement.hidden = false;
        };

        const hideError = () => {

            if (!errorElement) {
                return;
            }

            errorElement.textContent = "";
            errorElement.hidden = true;
        };

        const getRecordById = (id) => {
            return records.find(
                record => String(record.id) === String(id)
            );
        };

        const getPrice = (record) => {

            const price = Number(record?.precio);

            return Number.isFinite(price)
                ? price
                : 0;
        };

        const getSummary = (selection) => {

            const record = selection.record;
            const label = selection.label;
            const cantidad = selection.cantidad;

            if (mode === "quantity") {

                const price = Number(record?.precio);

                if (Number.isFinite(price)) {

                    const subtotal = price * cantidad;

                    return `${label} x ${cantidad} — ${subtotal} €`;
                }

                return `${label} x ${cantidad}`;
            }

            return label;
        };

        const renderRecords = () => {

            recordsContainer.innerHTML = "";

            records.forEach(record => {

                const fragment =
                    template.content.cloneNode(true);

                fragment
                    .querySelectorAll("[data-shop-field]")
                    .forEach(element => {

                        const field =
                            element.dataset.shopField;

                        const value = record[field];

                        if (
                            value === undefined ||
                            value === null
                        ) {
                            element.textContent = "";
                            return;
                        }

                        const attribute =
                            element.dataset.shopAttribute;

                        if (attribute) {

                            element.setAttribute(
                                attribute,
                                value
                            );

                        } else {

                            element.textContent = value;
                        }
                    });

                const action =
                    fragment.querySelector(
                        "[data-shop-action]"
                    );

                if (action) {

                    action.dataset.shopItemId =
                        record.id;

                    const currentSelection =
                        selected.get(
                            String(record.id)
                        );

                    if (currentSelection) {

                        action.setAttribute(
                            "aria-pressed",
                            "true"
                        );

                        action.classList.add(
                            "is-selected"
                        );

                        if (mode === "quantity") {

                            action.textContent =
                                `Añadido (${currentSelection.cantidad})`;
                        }

                    } else {

                        action.setAttribute(
                            "aria-pressed",
                            "false"
                        );
                    }
                }

                recordsContainer.appendChild(fragment);
            });
        };

        const renderCart = () => {

            if (!cart || !cartList) {
                return;
            }

            cartList.innerHTML = "";

            let total = 0;
            let hasItems = false;

            selected.forEach(selection => {

                hasItems = true;

                const record = selection.record;
                const cantidad = selection.cantidad;

                const subtotal =
                    getPrice(record) * cantidad;

                total += subtotal;

                if (!cartTemplate) {
                    return;
                }

                const fragment =
                    cartTemplate.content.cloneNode(true);

                fragment
                    .querySelectorAll(
                        "[data-shop-cart-field]"
                    )
                    .forEach(element => {

                        const field =
                            element.dataset.shopCartField;

                        let value = "";

                        if (field === "cantidad") {

                            value = cantidad;

                        } else if (field === "subtotal") {

                            value = subtotal;

                        } else {

                            value =
                                record[field] ?? "";
                        }

                        const attribute =
                            element.dataset.shopCartAttribute;

                        if (attribute) {

                            element.setAttribute(
                                attribute,
                                value
                            );

                        } else {

                            element.textContent = value;
                        }
                    });

                fragment
                    .querySelectorAll(
                        "[data-shop-cart-action]"
                    )
                    .forEach(button => {

                        button.dataset.shopItemId =
                            record.id;
                    });

                cartList.appendChild(fragment);
            });

            if (cartEmpty) {
                cartEmpty.hidden = hasItems;
            }

            if (cartTotal) {
                cartTotal.textContent = total;
            }
        };

        const renderSelected = () => {

            if (repeatList) {
                repeatList.innerHTML = "";
            }

            const personajeInput =
                form.querySelector(
                    '[name="personaje_id"]'
                );

            const personajeId =
                personajeInput?.value?.trim() || "";

            selected.forEach(selection => {

                if (!repeatList) {
                    return;
                }

                /*
                 * El label que recibe PixieFormCore
                 * contiene el resumen legible.
                 *
                 * Ejemplo:
                 * Poción de curación x 2 — 200 €
                 *
                 * fa-value sigue siendo el ID del item.
                 */

                const entry = createEntry({
                    personajeId,
                    id: selection.id,
                    label: getSummary(selection),
                    cantidad: selection.cantidad
                });

                repeatList.appendChild(entry);
            });

            renderRecords();
            renderCart();
        };

        const selectRecord = (record) => {

            const key = String(record.id);
            const existing = selected.get(key);

            if (mode === "quantity") {

                if (existing) {

                    existing.cantidad += 1;

                } else {

                    selected.set(key, {
                        id: record.id,
                        label: getLabel(record, mode),
                        cantidad: 1,
                        record
                    });
                }

            } else {

                if (existing) {

                    selected.delete(key);

                } else {

                    selected.set(key, {
                        id: record.id,
                        label: getLabel(record, mode),
                        cantidad: 1,
                        record
                    });
                }
            }

            renderSelected();
        };

        const changeQuantity = (id, amount) => {

            const key = String(id);
            const selection = selected.get(key);

            if (!selection) {
                return;
            }

            selection.cantidad += amount;

            if (selection.cantidad <= 0) {
                selected.delete(key);
            }

            renderSelected();
        };

        const removeRecord = (id) => {

            selected.delete(String(id));

            renderSelected();
        };

        recordsContainer.addEventListener(
            "click",
            event => {

                const action =
                    event.target.closest(
                        "[data-shop-action]"
                    );

                if (!action) {
                    return;
                }

                const id =
                    action.dataset.shopItemId;

                if (!id) {
                    return;
                }

                const record =
                    getRecordById(id);

                if (!record) {
                    return;
                }

                selectRecord(record);
            }
        );

        if (cartList) {

            cartList.addEventListener(
                "click",
                event => {

                    const action =
                        event.target.closest(
                            "[data-shop-cart-action]"
                        );

                    if (!action) {
                        return;
                    }

                    const id =
                        action.dataset.shopItemId;

                    if (!id) {
                        return;
                    }

                    const actionType =
                        action.dataset.shopCartAction;

                    if (actionType === "increase") {

                        changeQuantity(id, 1);
                    }

                    if (actionType === "decrease") {

                        changeQuantity(id, -1);
                    }

                    if (actionType === "remove") {

                        removeRecord(id);
                    }
                }
            );
        }

        try {

            hideError();

            records =
                await getRecords(source);

            renderRecords();
            renderSelected();

        } catch (error) {

            console.error(
                "[PixieShop]",
                error
            );

            showError(
                "No se han podido cargar los registros."
            );
        }
    };

    const init = (context = document) => {

        context
            .querySelectorAll(FORM_SELECTOR)
            .forEach(initForm);
    };

    Pixie.ready(() => {
        init();
    });

    return {
        init,
        initForm
    };
});
