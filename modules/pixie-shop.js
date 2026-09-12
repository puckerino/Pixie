(function (window, document) {
    "use strict";

    if (window.PixieShop) return;

    const SUPABASE_URL = "https://udnotovrosokbdahlqaf.supabase.co";
    const SUPABASE_KEY = "sb_publishable_OQcJe7XcKx0jGCzvUVbALw_isdQEDfo";

    const FORM_SELECTOR = ".fa-generated-shop-form";
    const READY_ATTRIBUTE = "data-pixie-shop-initialized";

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeSelector(value) {
        if (window.CSS && CSS.escape) {
            return CSS.escape(value);
        }

        return String(value).replace(/([^\w-])/g, "\\$1");
    }

    async function fetchRecords(source) {
        const url =
            `${SUPABASE_URL}/rest/v1/` +
            `${encodeURIComponent(source)}?select=*`;

        const response = await fetch(url, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(
                `Supabase ${response.status}: ${await response.text()}`
            );
        }

        const records = await response.json();

        return records.filter(record => record.visible !== false);
    }

    function getTemplate(form, prefix, formId) {
        return document.getElementById(`${prefix}${formId}`);
    }

    function renderTemplate(template, record, selectorPrefix) {
        const fragment = template.content.cloneNode(true);

        fragment.querySelectorAll(`[${selectorPrefix}-field]`).forEach(element => {
            const field = element.getAttribute(`${selectorPrefix}-field`);
            const attribute = element.getAttribute(`${selectorPrefix}-attribute`);
            const value = record[field] ?? "";

            if (attribute) {
                element.setAttribute(attribute, value);
            } else {
                element.textContent = value;
            }
        });

        return fragment;
    }

    function createEntry(repeatList, selection, personajeId) {
        const entry = document.createElement("div");

        entry.className = "fa-entry";

        entry.innerHTML = `
            <input
                type="hidden"
                class="fa-label"
                value="${escapeHTML(selection.label)}"
            >

            <input
                type="hidden"
                class="fa-value"
                value="${escapeHTML(selection.value)}"
            >

            <input
                type="hidden"
                class="fa-cantidad"
                value="${escapeHTML(selection.cantidad)}"
            >

            <input
                type="hidden"
                class="fa-text"
                value="${escapeHTML(personajeId)}"
            >

            <input
                type="hidden"
                class="fa-extra"
                value="${escapeHTML(selection.extra)}"
            >
        `;

        repeatList.appendChild(entry);
    }

    function initForm(form) {
        if (!(form instanceof HTMLFormElement)) return;

        if (form.getAttribute(READY_ATTRIBUTE) === "true") {
            return;
        }

        const formId = form.dataset.id;

        if (!formId) return;

        const source = form.dataset.shopSource;

        if (!source) return;

        const mode = form.dataset.shopMode || "toggle";
        const repeatName = form.dataset.shopRepeat || "";

        const recordsContainer = form.querySelector(".fa-shop-records");

        if (!recordsContainer) return;

        const itemTemplate = getTemplate(
            form,
            "fa-shop-template-",
            formId
        );

        if (!itemTemplate) {
            console.warn(
                `[PixieShop] No existe #fa-shop-template-${formId}`
            );
            return;
        }

        const cart = form.querySelector("[data-shop-cart]");
        const cartList = form.querySelector("[data-shop-cart-list]");
        const cartTotal = form.querySelector("[data-shop-cart-total]");
        const cartEmpty = form.querySelector("[data-shop-cart-empty]");

        const cartTemplate = getTemplate(
            form,
            "fa-shop-cart-template-",
            formId
        );

        const repeat = repeatName
            ? form.querySelector(`[data-repeat="${escapeSelector(repeatName)}"]`)
            : null;

        const repeatList = repeat
            ? repeat.querySelector(".fa-repeat-list")
            : null;

        const personajeInput = form.querySelector(
            '[name="personaje_id"]'
        );

        /*
         * Campo oculto con el resumen humano.
         *
         * IMPORTANTE:
         * PixieFormCore necesita el ID para poder resolver
         * {{shop-compras-summary}}.
         */
        const summaryName = `${formId}-summary`;

        let summaryInput = form.querySelector(
            `[name="${escapeSelector(summaryName)}"]`
        );

        if (!summaryInput) {
            summaryInput = document.createElement("input");
            summaryInput.type = "hidden";
            summaryInput.name = summaryName;
            form.appendChild(summaryInput);
        }

        summaryInput.id = summaryName;

        let records = [];
        const selected = new Map();

        function getRecordId(record) {
            return String(record.id);
        }

        function getLabel(record) {
            return (
                record.titulo ??
                record.nombre ??
                record.name ??
                record.id
            );
        }

        function getSummary(selection) {
            const quantity = Number(selection.cantidad) || 0;

            if (selection.record.precio != null) {
                const price = Number(selection.record.precio) || 0;
                const subtotal = price * quantity;

                return `${selection.label} x ${quantity} — ${subtotal} €`;
            }

            return `${selection.label} x ${quantity}`;
        }

        function getTotal() {
            let total = 0;

            selected.forEach(selection => {
                const price = Number(selection.record.precio) || 0;
                const quantity = Number(selection.cantidad) || 0;

                total += price * quantity;
            });

            return total;
        }

        function updateSummary() {
            const summaries = [];

            selected.forEach(selection => {
                summaries.push(getSummary(selection));
            });

            summaryInput.value = summaries.join("\n");
        }

        function updateCart() {
            if (!cart || !cartList || !cartTemplate) {
                updateSummary();
                return;
            }

            cartList.innerHTML = "";

            let hasItems = false;

            selected.forEach(selection => {
                const quantity = Number(selection.cantidad) || 0;

                if (quantity <= 0) return;

                hasItems = true;

                const fragment = cartTemplate.content.cloneNode(true);

                fragment
                    .querySelectorAll("[data-shop-cart-field]")
                    .forEach(element => {
                        const field = element.getAttribute(
                            "data-shop-cart-field"
                        );

                        let value = "";

                        if (field === "subtotal") {
                            const price =
                                Number(selection.record.precio) || 0;

                            value = price * quantity;
                        } else if (field === "cantidad") {
                            value = quantity;
                        } else {
                            value = selection.record[field] ?? "";
                        }

                        const attribute = element.getAttribute(
                            "data-shop-cart-attribute"
                        );

                        if (attribute) {
                            element.setAttribute(attribute, value);
                        } else {
                            element.textContent = value;
                        }
                    });

                fragment
                    .querySelectorAll("[data-shop-cart-action]")
                    .forEach(button => {
                        const action = button.getAttribute(
                            "data-shop-cart-action"
                        );

                        button.dataset.shopItemId =
                            getRecordId(selection.record);

                        button.dataset.shopCartAction = action;
                    });

                cartList.appendChild(fragment);
            });

            if (cartEmpty) {
                cartEmpty.hidden = hasItems;
            }

            if (cartTotal) {
                cartTotal.textContent = `${getTotal()} €`;
            }

            updateSummary();
        }

        function renderSelected() {
            if (!repeatList) {
                updateSummary();
                updateCart();
                return;
            }

            repeatList.innerHTML = "";

            const personajeId = personajeInput
                ? String(personajeInput.value || "").trim()
                : "";

            selected.forEach(selection => {
                if ((Number(selection.cantidad) || 0) <= 0) {
                    return;
                }

                createEntry(
                    repeatList,
                    selection,
                    personajeId
                );
            });

            updateCart();
        }

        function selectRecord(record) {
            const id = getRecordId(record);
            const existing = selected.get(id);

            if (mode === "quantity") {
                if (existing) {
                    existing.cantidad += 1;
                } else {
                    selected.set(id, {
                        record,
                        value: id,
                        label: getLabel(record),
                        cantidad: 1,
                        extra: getLabel(record)
                    });
                }
            } else {
                if (existing) {
                    selected.delete(id);
                } else {
                    selected.set(id, {
                        record,
                        value: id,
                        label: getLabel(record),
                        cantidad: 1,
                        extra: getLabel(record)
                    });
                }
            }

            renderSelected();
            renderRecords();
        }

        function increase(id) {
            const selection = selected.get(id);

            if (!selection) return;

            selection.cantidad += 1;

            renderSelected();
            renderRecords();
        }

        function decrease(id) {
            const selection = selected.get(id);

            if (!selection) return;

            selection.cantidad -= 1;

            if (selection.cantidad <= 0) {
                selected.delete(id);
            }

            renderSelected();
            renderRecords();
        }

        function remove(id) {
            selected.delete(id);

            renderSelected();
            renderRecords();
        }

        function renderRecords() {
            recordsContainer.innerHTML = "";

            records.forEach(record => {
                const fragment = renderTemplate(
                    itemTemplate,
                    record,
                    "data-shop"
                );

                const button = fragment.querySelector(
                    "[data-shop-action]"
                );

                if (button) {
                    const id = getRecordId(record);

                    button.dataset.shopItemId = id;

                    const selection = selected.get(id);

                    if (selection) {
                        button.dataset.shopSelected = "true";

                        if (mode === "quantity") {
                            button.dataset.shopQuantity =
                                String(selection.cantidad);
                        }
                    } else {
                        delete button.dataset.shopSelected;
                        delete button.dataset.shopQuantity;
                    }
                }

                recordsContainer.appendChild(fragment);
            });
        }

        recordsContainer.addEventListener("click", event => {
            const button = event.target.closest(
                "[data-shop-action]"
            );

            if (!button) return;

            event.preventDefault();

            const id = button.dataset.shopItemId;

            if (!id) return;

            const record = records.find(
                item => getRecordId(item) === id
            );

            if (!record) return;

            selectRecord(record);
        });

        if (cartList) {
            cartList.addEventListener("click", event => {
                const button = event.target.closest(
                    "[data-shop-cart-action]"
                );

                if (!button) return;

                event.preventDefault();

                const action =
                    button.dataset.shopCartAction;

                const id =
                    button.dataset.shopItemId;

                if (!id) return;

                if (action === "increase") {
                    increase(id);
                }

                if (action === "decrease") {
                    decrease(id);
                }

                if (action === "remove") {
                    remove(id);
                }
            });
        }

        if (personajeInput) {
            personajeInput.addEventListener("input", () => {
                renderSelected();
            });
        }

        form.setAttribute(READY_ATTRIBUTE, "true");

        fetchRecords(source)
            .then(data => {
                records = data;
                renderRecords();
                renderSelected();
            })
            .catch(error => {
                console.error(
                    "[PixieShop] Error cargando Supabase:",
                    error
                );

                const errorElement =
                    form.querySelector(".fa-shop-error");

                if (errorElement) {
                    errorElement.hidden = false;
                    errorElement.textContent =
                        "No se han podido cargar los objetos.";
                }
            });
    }

    function init(context = document) {
        context
            .querySelectorAll(FORM_SELECTOR)
            .forEach(initForm);
    }

    window.PixieShop = {
        init,
        initForm
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            () => init()
        );
    } else {
        init();
    }

})(window, document);
