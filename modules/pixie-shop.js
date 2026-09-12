(function (window, document) {
    "use strict";

    if (window.PixieShop) return;

    const SUPABASE_URL =
        "https://udnotovrosokbdahlqaf.supabase.co";

    const SUPABASE_KEY =
        "sb_publishable_OQcJe7XcKx0jGCzvUVbALw_isdQEDfo";

    const FORM_SELECTOR =
        ".fa-generated-shop-form";

    const INITIALIZED_ATTRIBUTE =
        "data-pixie-shop-initialized";

    const escapeHTML = value => {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const getValue = (record, element) => {
        const field =
            element.dataset.shopField;

        if (!field) {
            return "";
        }

        return record?.[field] ?? "";
    };

    const setElementValue = (
        element,
        value
    ) => {
        const attribute =
            element.dataset.shopAttribute;

        if (attribute) {
            element.setAttribute(
                attribute,
                value
            );

            return;
        }

        element.textContent = value;
    };

    const createEntry = ({
        personajeId,
        id,
        label,
        cantidad = 1
    }) => {
        const entry =
            document.createElement("div");

        entry.className = "fa-entry";

        const text =
            document.createElement("input");

        text.type = "hidden";
        text.className = "fa-text";
        text.value = personajeId;

        const value =
            document.createElement("input");

        value.type = "hidden";
        value.className = "fa-value";
        value.value = id;

        const labelElement =
            document.createElement("input");

        labelElement.type = "hidden";
        labelElement.className = "fa-label";
        labelElement.value = label;

        const cantidadElement =
            document.createElement("input");

        cantidadElement.type = "hidden";
        cantidadElement.className =
            "fa-cantidad";

        cantidadElement.value =
            cantidad;

        const extra =
            document.createElement("input");

        extra.type = "hidden";
        extra.className = "fa-extra";
        extra.value = label;

        entry.append(
            text,
            value,
            labelElement,
            cantidadElement,
            extra
        );

        return entry;
    };

    const initForm = async form => {
        if (
            form.getAttribute(
                INITIALIZED_ATTRIBUTE
            ) === "true"
        ) {
            return;
        }

        form.setAttribute(
            INITIALIZED_ATTRIBUTE,
            "true"
        );

        const formId =
            form.dataset.id;

        const source =
            form.dataset.shopSource;

        const mode =
            form.dataset.shopMode ||
            "toggle";

        const repeatId =
            form.dataset.shopRepeat ||
            "shop";

        if (!formId || !source) {
            return;
        }

        const recordsContainer =
            form.querySelector(
                ".fa-shop-records"
            );

        const repeat =
            form.querySelector(
                `.fa-repeat[data-repeat="${CSS.escape(repeatId)}"]`
            );

        const repeatList =
            repeat?.querySelector(
                ".fa-repeat-list"
            );

        const template =
            document.querySelector(
                `#fa-shop-template-${CSS.escape(formId)}`
            );

        const cartTemplate =
            document.querySelector(
                `#fa-shop-cart-template-${CSS.escape(formId)}`
            );

        const cart =
            form.querySelector(
                "[data-shop-cart]"
            );

        const cartList =
            cart?.querySelector(
                "[data-shop-cart-list]"
            );

        const cartTotal =
            cart?.querySelector(
                "[data-shop-cart-total]"
            );

        const cartEmpty =
            cart?.querySelector(
                "[data-shop-cart-empty]"
            );

        const errorElement =
            form.querySelector(
                ".fa-shop-error"
            );

        if (
            !recordsContainer ||
            !template
        ) {
            return;
        }

        let records = [];
        let selected = [];

        /*
         * Campo normal que utilizará PixieFormCore
         * para mostrar el resumen.
         */

        const summaryName =
            `${formId}-summary`;

        let summaryInput =
            form.querySelector(
                `[name="${CSS.escape(summaryName)}"]`
            );

        if (!summaryInput) {
            summaryInput =
                document.createElement("input");

            summaryInput.type = "hidden";
            summaryInput.name =
                summaryName;

            form.appendChild(
                summaryInput
            );
        }

        const getPersonajeId = () => {
            const input =
                form.querySelector(
                    '[name="personaje_id"]'
                );

            return (
                input?.value?.trim() || ""
            );
        };

        const getRecordId = record => {
            return String(
                record?.id ?? ""
            );
        };

        const getRecordLabel = record => {
            return String(
                record?.titulo ??
                record?.nombre ??
                record?.id ??
                ""
            );
        };

        const getSummary = selection => {
            const record =
                selection.record;

            const label =
                selection.label;

            const cantidad =
                selection.cantidad;

            if (mode === "quantity") {
                const price =
                    Number(record?.precio);

                if (
                    Number.isFinite(price)
                ) {
                    const subtotal =
                        price * cantidad;

                    return `${label} x ${cantidad} — ${subtotal} €`;
                }

                return `${label} x ${cantidad}`;
            }

            return label;
        };

        const getCartSubtotal = selection => {
            const price =
                Number(
                    selection.record?.precio
                );

            if (
                !Number.isFinite(price)
            ) {
                return 0;
            }

            return (
                price *
                selection.cantidad
            );
        };

        const updateSummary = () => {
            const summaries =
                selected.map(
                    selection =>
                        getSummary(selection)
                );

            summaryInput.value =
                summaries.join("\n");
        };

        const renderRecords = () => {
            recordsContainer.innerHTML =
                "";

            records.forEach(record => {
                const fragment =
                    template.content.cloneNode(
                        true
                    );

                fragment
                    .querySelectorAll(
                        "[data-shop-field]"
                    )
                    .forEach(element => {
                        const value =
                            getValue(
                                record,
                                element
                            );

                        setElementValue(
                            element,
                            value
                        );
                    });

                const action =
                    fragment.querySelector(
                        "[data-shop-action]"
                    );

                if (action) {
                    const id =
                        getRecordId(
                            record
                        );

                    action.dataset.shopItemId =
                        id;

                    const current =
                        selected.find(
                            selection =>
                                selection.id === id
                        );

                    if (current) {
                        action.classList.add(
                            "is-selected"
                        );

                        action.dataset.shopSelected =
                            "true";

                        if (
                            mode ===
                            "quantity"
                        ) {
                            action.textContent =
                                `Añadir (${current.cantidad})`;
                        }
                    }
                }

                recordsContainer.appendChild(
                    fragment
                );
            });
        };

        const renderCart = () => {
            if (!cart) {
                return;
            }

            if (cartList) {
                cartList.innerHTML =
                    "";
            }

            let total = 0;

            selected.forEach(
                selection => {
                    total +=
                        getCartSubtotal(
                            selection
                        );

                    if (
                        !cartList ||
                        !cartTemplate
                    ) {
                        return;
                    }

                    const fragment =
                        cartTemplate.content.cloneNode(
                            true
                        );

                    fragment
                        .querySelectorAll(
                            "[data-shop-cart-field]"
                        )
                        .forEach(element => {
                            const field =
                                element.dataset
                                    .shopCartField;

                            let value = "";

                            if (
                                field ===
                                "cantidad"
                            ) {
                                value =
                                    selection.cantidad;
                            } else if (
                                field ===
                                "subtotal"
                            ) {
                                value =
                                    getCartSubtotal(
                                        selection
                                    );
                            } else {
                                value =
                                    selection
                                        .record?.[
                                        field
                                    ] ?? "";
                            }

                            setElementValue(
                                element,
                                value
                            );
                        });

                    fragment
                        .querySelectorAll(
                            "[data-shop-cart-action]"
                        )
                        .forEach(button => {
                            button.dataset.shopItemId =
                                selection.id;
                        });

                    cartList.appendChild(
                        fragment
                    );
                }
            );

            if (cartTotal) {
                cartTotal.textContent =
                    `${total} €`;
            }

            if (cartEmpty) {
                cartEmpty.hidden =
                    selected.length > 0;
            }

            updateSummary();
        };

        const renderSelected = () => {
            if (repeatList) {
                repeatList.innerHTML =
                    "";
            }

            const personajeId =
                getPersonajeId();

            selected.forEach(
                selection => {
                    if (!repeatList) {
                        return;
                    }

                    const entry =
                        createEntry({
                            personajeId,
                            id: selection.id,
                            label:
                                getSummary(
                                    selection
                                ),
                            cantidad:
                                selection.cantidad
                        });

                    repeatList.appendChild(
                        entry
                    );
                }
            );

            renderRecords();
            renderCart();
        };

        const selectRecord = record => {
            const id =
                getRecordId(record);

            if (!id) {
                return;
            }

            const existing =
                selected.find(
                    selection =>
                        selection.id === id
                );

            if (mode === "quantity") {
                if (existing) {
                    existing.cantidad += 1;
                } else {
                    selected.push({
                        id,
                        label:
                            getRecordLabel(
                                record
                            ),
                        cantidad: 1,
                        record
                    });
                }
            } else {
                if (existing) {
                    selected =
                        selected.filter(
                            selection =>
                                selection.id !==
                                id
                        );
                } else {
                    selected.push({
                        id,
                        label:
                            getRecordLabel(
                                record
                            ),
                        cantidad: 1,
                        record
                    });
                }
            }

            renderSelected();
        };

        const findSelection = id => {
            return selected.find(
                selection =>
                    selection.id ===
                    String(id)
            );
        };

        const increaseSelection = id => {
            const selection =
                findSelection(id);

            if (!selection) {
                return;
            }

            selection.cantidad += 1;

            renderSelected();
        };

        const decreaseSelection = id => {
            const selection =
                findSelection(id);

            if (!selection) {
                return;
            }

            selection.cantidad -= 1;

            if (
                selection.cantidad <=
                0
            ) {
                selected =
                    selected.filter(
                        item =>
                            item.id !==
                            String(id)
                    );
            }

            renderSelected();
        };

        const removeSelection = id => {
            selected =
                selected.filter(
                    selection =>
                        selection.id !==
                        String(id)
                );

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
                    records.find(
                        item =>
                            getRecordId(
                                item
                            ) === id
                    );

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
                        action.dataset
                            .shopItemId;

                    if (!id) {
                        return;
                    }

                    const type =
                        action.dataset
                            .shopCartAction;

                    if (
                        type ===
                        "increase"
                    ) {
                        increaseSelection(
                            id
                        );
                    }

                    if (
                        type ===
                        "decrease"
                    ) {
                        decreaseSelection(
                            id
                        );
                    }

                    if (
                        type ===
                        "remove"
                    ) {
                        removeSelection(
                            id
                        );
                    }
                }
            );
        }

        const personajeInput =
            form.querySelector(
                '[name="personaje_id"]'
            );

        personajeInput?.addEventListener(
            "input",
            () => {
                renderSelected();
            }
        );

        try {
            const response =
                await fetch(
                    `${SUPABASE_URL}/rest/v1/${encodeURIComponent(
                        source
                    )}?select=*`,
                    {
                        headers: {
                            apikey:
                                SUPABASE_KEY,

                            Authorization:
                                `Bearer ${SUPABASE_KEY}`
                        }
                    }
                );

            if (!response.ok) {
                throw new Error(
                    `Supabase ${response.status}`
                );
            }

            records =
                await response.json();

            records =
                records.filter(
                    record =>
                        record.visible !==
                        false
                );

            renderRecords();
            renderCart();
        } catch (error) {
            console.error(
                "PixieShop:",
                error
            );

            if (errorElement) {
                errorElement.hidden =
                    false;

                errorElement.textContent =
                    "No se han podido cargar los objetos de la tienda.";
            }
        }
    };

    const init = (
        context = document
    ) => {
        context
            .querySelectorAll(
                FORM_SELECTOR
            )
            .forEach(form => {
                initForm(form);
            });
    };

    window.PixieShop = {
        init,
        initForm
    };

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            () => init()
        );
    } else {
        init();
    }
})(window, document);

