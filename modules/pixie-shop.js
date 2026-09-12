(() => {
    const SUPABASE_URL = "https://udnotovrosokbdahlqaf.supabase.co";
    const SUPABASE_KEY = "TU_PUBLISHABLE_KEY";

    const forms = document.querySelectorAll(".fa-generated-shop-form");

    if (!forms.length) return;

    const escapeHTML = value => {
        const div = document.createElement("div");
        div.textContent = value ?? "";
        return div.innerHTML;
    };

    const getFieldValue = (row, field) => {
        return row?.[field] ?? "";
    };

    const setTemplateField = (element, value) => {
        const attribute = element.dataset.shopAttribute;

        if (attribute) {
            element.setAttribute(attribute, value ?? "");
        } else {
            element.textContent = value ?? "";
        }
    };

    const renderRecord = (template, record) => {
        const fragment = template.content.cloneNode(true);

        fragment.querySelectorAll("[data-shop-field]").forEach(element => {
            const field = element.dataset.shopField;
            const value = getFieldValue(record, field);

            setTemplateField(element, value);
        });

        fragment.querySelectorAll("[data-shop-action]").forEach(button => {
            button.dataset.shopItemId = record.id;
        });

        return fragment;
    };

    const createEntry = ({
        personajeId,
        id,
        label,
        cantidad = 1
    }) => {
        const entry = document.createElement("div");

        entry.className = "fa-entry";
        entry.dataset.shopEntryId = id;

        const text = document.createElement("span");
        text.className = "fa-text";
        text.textContent = personajeId;

        const value = document.createElement("span");
        value.className = "fa-value";
        value.textContent = id;

        const labelElement = document.createElement("span");
        labelElement.className = "fa-label";
        labelElement.textContent = label;

        const quantity = document.createElement("span");
        quantity.className = "fa-cantidad";
        quantity.textContent = cantidad;

        entry.append(
            text,
            value,
            labelElement,
            quantity
        );

        return entry;
    };

    const initShop = async form => {
        const source = form.dataset.shopSource;
        const mode = form.dataset.shopMode;
        const repeatId = form.dataset.shopRepeat;
        const formId = form.dataset.id;

        const recordsContainer = form.querySelector(".fa-shop-records");
        const repeat = form.querySelector(`.fa-repeat[data-repeat="${repeatId}"]`);
        const repeatList = repeat?.querySelector(".fa-repeat-list");
        const error = form.querySelector(".fa-shop-error");
        const output = form.querySelector("[data-shop-output]");
        const generateButton = form.querySelector("[data-shop-generate]");
        const copyButton = form.querySelector("[data-shop-copy]");

        const template = document.querySelector(
            `#fa-shop-template-${formId}`
        );

        if (!recordsContainer || !repeat || !repeatList || !template) {
            console.warn(`PixieShop: configuración incompleta en ${formId}`);
            return;
        }

        let controller;

        if (window.PixieFormCore) {
            controller = window.PixieFormCore.initGeneratedForm(form);
        } else {
            console.error("PixieShop necesita PixieFormCore.");
            return;
        }

        const state = new Map();

        const showError = message => {
            if (!error) return;

            error.textContent = message;
            error.hidden = !message;
        };

        const getPersonajeId = () => {
            const input = form.elements.personaje_id;

            if (!input) return "";

            return input.value.trim();
        };

        const renderSelected = () => {
            repeatList.innerHTML = "";

            const personajeId = getPersonajeId();

            state.forEach((selection, id) => {
                const entry = createEntry({
                    personajeId,
                    id,
                    label: selection.label,
                    cantidad: selection.cantidad
                });

                repeatList.appendChild(entry);
            });
        };

        const updateButton = (button, selected) => {
            const defaultLabel = button.dataset.shopDefaultLabel ||
                button.textContent;

            const selectedLabel = button.dataset.shopSelectedLabel ||
                "Seleccionado";

            button.dataset.shopDefaultLabel = defaultLabel;

            button.classList.toggle("is-selected", selected);
            button.setAttribute("aria-pressed", selected);

            button.textContent = selected
                ? selectedLabel
                : defaultLabel;
        };

        const handleAction = button => {
            const id = String(button.dataset.shopItemId);
            const record = records.find(item => String(item.id) === id);

            if (!record) return;

            const label =
                record.titulo ??
                record.nombre ??
                record.id;

            if (mode === "toggle") {
                if (state.has(id)) {
                    state.delete(id);
                    updateButton(button, false);
                } else {
                    state.set(id, {
                        record,
                        label,
                        cantidad: 1
                    });

                    updateButton(button, true);
                }

                renderSelected();
                return;
            }

            if (mode === "quantity") {
                const current = state.get(id);

                if (current) {
                    current.cantidad += 1;
                } else {
                    state.set(id, {
                        record,
                        label,
                        cantidad: 1
                    });
                }

                renderSelected();
            }
        };

        const renderRecords = () => {
            recordsContainer.innerHTML = "";

            records.forEach(record => {
                const fragment = renderRecord(template, record);

                recordsContainer.appendChild(fragment);
            });

            recordsContainer
                .querySelectorAll("[data-shop-action]")
                .forEach(button => {
                    button.addEventListener("click", () => {
                        handleAction(button);
                    });
                });
        };

        let records = [];

        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/${encodeURIComponent(source)}?select=*`,
                {
                    method: "GET",
                    headers: {
                        apikey: SUPABASE_KEY,
                        Authorization: `Bearer ${SUPABASE_KEY}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Supabase respondió con ${response.status}`
                );
            }

            records = await response.json();

            records = records.filter(record => record.visible !== false);

            renderRecords();
        } catch (err) {
            console.error("PixieShop:", err);

            showError(
                "No se han podido cargar los datos de la tienda."
            );

            return;
        }

        const clearSelection = () => {
            state.clear();

            recordsContainer
                .querySelectorAll("[data-shop-action]")
                .forEach(button => {
                    updateButton(button, false);
                });

            renderSelected();
        };

        const generate = () => {
            showError("");

            const personajeId = getPersonajeId();

            if (!personajeId) {
                showError("Introduce el ID del personaje.");
                return;
            }

            if (!state.size) {
                showError("Selecciona al menos un elemento.");
                return;
            }

            renderSelected();

            const result = controller.renderTemplate();

            if (output) {
                output.value = typeof result === "string"
                    ? result
                    : "";
                output.hidden = false;
            }
        };

        generateButton?.addEventListener("click", generate);

        copyButton?.addEventListener("click", async () => {
            if (!output) return;

            if (!output.value.trim()) {
                generate();
            }

            if (!output.value.trim()) return;

            try {
                await navigator.clipboard.writeText(output.value);

                copyButton.classList.add("is-copied");

                const originalText = copyButton.textContent;
                copyButton.textContent = "Copiado";

                setTimeout(() => {
                    copyButton.textContent = originalText;
                    copyButton.classList.remove("is-copied");
                }, 1500);
            } catch {
                output.select();
                document.execCommand("copy");
            }
        });

        form.elements.personaje_id?.addEventListener("input", () => {
            if (state.size) {
                renderSelected();
            }
        });

        form.addEventListener("reset", () => {
            setTimeout(clearSelection);
        });
    };

    forms.forEach(initShop);
})();
