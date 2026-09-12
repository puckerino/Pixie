/*!
 * PixieShop.js
 * Motor genérico para formularios de tienda / solicitudes.
 *
 * Requiere:
 * - PixieFormCore.js
 *
 * No escribe en Supabase.
 * Solo consulta datos y genera solicitudes para copiar.
 */

(function (window, document) {
    "use strict";

    if (window.PixieShop) return;

    const SUPABASE_URL = "https://udnotovrosokbdahlqaf.supabase.co";
    const SUPABASE_KEY = "TU_PUBLISHABLE_KEY";

    const SELECTOR = ".fa-generated-shop-form";

    const PixieShop = {
        init,
        fetchTable
    };

    function init() {
        const forms = document.querySelectorAll(SELECTOR);

        if (!forms.length) return;

        forms.forEach(initForm);
    }

    async function initForm(form) {
        if (!window.PixieFormCore) {
            console.error("PixieShop: PixieFormCore no está disponible.");
            return;
        }

        const source = form.dataset.shopSource;

        if (!source) {
            console.error("PixieShop: falta data-shop-source.", form);
            return;
        }

        const repeat = form.dataset.shopRepeat || source;

        const idField = form.dataset.shopIdField || "id";
        const labelField = form.dataset.shopLabelField || "titulo";
        const imageField = form.dataset.shopImageField || "imagen";

        const actionLabel =
            form.dataset.shopAction ||
            "Seleccionar";

        const mode =
            form.dataset.shopMode ||
            "quantity";

        const controller = window.PixieFormCore.initGeneratedForm(form);

        const state = {
            source,
            repeat,
            idField,
            labelField,
            imageField,
            actionLabel,
            mode,
            data: [],
            selected: new Map()
        };

        form.__pixieShop = state;

        try {
            const data = await fetchTable(source);

            state.data = data.filter(row => row.visible !== false);

            renderSource(form, state);
            renderSelection(form, state);

            bindCharacterId(form, state);
            bindGenerate(form, state);
            bindCopy(form, state);

        } catch (error) {
            console.error("PixieShop:", error);

            const errorBox = form.querySelector(".fa-shop-error");

            if (errorBox) {
                errorBox.textContent =
                    "No se han podido cargar los datos.";
                errorBox.hidden = false;
            }
        }

        form.__pixieShopController = controller;
    }

    async function fetchTable(table) {
        const url =
            `${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}` +
            `?select=*`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        });

        if (!response.ok) {
            const text = await response.text();

            throw new Error(
                `Supabase ${response.status}: ${text}`
            );
        }

        return response.json();
    }

    function renderSource(form, state) {
        const container =
            form.querySelector(".fa-shop-items");

        if (!container) return;

        container.replaceChildren();

        state.data.forEach(item => {
            const id = item[state.idField];
            const label = item[state.labelField] ?? id;
            const image = item[state.imageField];

            const article =
                document.createElement("article");

            article.className = "fa-shop-item";
            article.dataset.id = id;

            if (image) {
                const img =
                    document.createElement("img");

                img.className = "fa-shop-item-image";
                img.src = image;
                img.alt = label;

                article.append(img);
            }

            const content =
                document.createElement("div");

            content.className = "fa-shop-item-content";

            const title =
                document.createElement("div");

            title.className = "fa-shop-item-title";
            title.textContent = label;

            content.append(title);

            if (item.descripcion) {
                const description =
                    document.createElement("div");

                description.className =
                    "fa-shop-item-description";

                description.textContent =
                    item.descripcion;

                content.append(description);
            }

            if (item.precio !== undefined) {
                const price =
                    document.createElement("div");

                price.className = "fa-shop-item-price";

                price.textContent =
                    `${item.precio} $`;

                content.append(price);
            }

            const controls =
                document.createElement("div");

            controls.className = "fa-shop-item-controls";

            if (state.mode === "toggle") {
                renderToggleButton(
                    controls,
                    item,
                    state,
                    form
                );
            } else {
                renderQuantityButton(
                    controls,
                    item,
                    state,
                    form
                );
            }

            content.append(controls);
            article.append(content);

            container.append(article);
        });
    }

    function renderQuantityButton(
        container,
        item,
        state,
        form
    ) {
        const id = item[state.idField];

        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "fa-shop-add";
        button.textContent = state.actionLabel;

        button.addEventListener("click", () => {
            const current =
                state.selected.get(id) || 0;

            state.selected.set(id, current + 1);

            renderSelection(form, state);
        });

        container.append(button);
    }

    function renderToggleButton(
        container,
        item,
        state,
        form
    ) {
        const id = item[state.idField];

        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "fa-shop-add";

        updateToggleButton(
            button,
            state.selected.has(id),
            state.actionLabel
        );

        button.addEventListener("click", () => {
            if (state.selected.has(id)) {
                state.selected.delete(id);
            } else {
                state.selected.set(id, 1);
            }

            updateToggleButton(
                button,
                state.selected.has(id),
                state.actionLabel
            );

            renderSelection(form, state);
        });

        container.append(button);
    }

    function updateToggleButton(
        button,
        selected,
        label
    ) {
        button.textContent =
            selected
                ? "Seleccionado"
                : label;

        button.classList.toggle(
            "is-selected",
            selected
        );
    }

    function renderSelection(form, state) {
        const repeat =
            form.querySelector(
                `.fa-repeat[data-repeat="${CSS.escape(state.repeat)}"]`
            );

        if (!repeat) return;

        const list =
            repeat.querySelector(".fa-repeat-list");

        if (!list) return;

        list.replaceChildren();

        state.selected.forEach((quantity, id) => {
            const item =
                state.data.find(
                    row =>
                        String(row[state.idField]) ===
                        String(id)
                );

            if (!item) return;

            const entry =
                document.createElement("div");

            entry.className = "fa-entry";

            entry.dataset.value = id;

            const label =
                document.createElement("span");

            label.className = "fa-label";
            label.textContent =
                item[state.labelField] ?? id;

            entry.append(label);

            const value =
                document.createElement("span");

            value.className = "fa-value";
            value.textContent = id;

            entry.append(value);

            const amount =
                document.createElement("span");

            amount.className = "fa-cantidad";
            amount.textContent = quantity;

            entry.append(amount);

            const character =
                form.querySelector(
                    "[name='personaje_id']"
                );

            const text =
                document.createElement("span");

            text.className = "fa-text";
            text.hidden = true;
            text.textContent =
                character?.value.trim() || "";

            entry.append(text);

            const controls =
                document.createElement("div");

            controls.className =
                "fa-shop-entry-controls";

            if (state.mode === "quantity") {
                const minus =
                    document.createElement("button");

                minus.type = "button";
                minus.textContent = "−";

                minus.addEventListener(
                    "click",
                    () => {
                        const current =
                            state.selected.get(id) || 0;

                        if (current <= 1) {
                            state.selected.delete(id);
                        } else {
                            state.selected.set(
                                id,
                                current - 1
                            );
                        }

                        renderSelection(
                            form,
                            state
                        );
                    }
                );

                controls.append(minus);

                const plus =
                    document.createElement("button");

                plus.type = "button";
                plus.textContent = "+";

                plus.addEventListener(
                    "click",
                    () => {
                        const current =
                            state.selected.get(id) || 0;

                        state.selected.set(
                            id,
                            current + 1
                        );

                        renderSelection(
                            form,
                            state
                        );
                    }
                );

                controls.append(plus);
            }

            const remove =
                document.createElement("button");

            remove.type = "button";
            remove.textContent = "×";

            remove.addEventListener(
                "click",
                () => {
                    state.selected.delete(id);

                    renderSelection(
                        form,
                        state
                    );
                }
            );

            controls.append(remove);

            entry.append(controls);
            list.append(entry);
        });

        updateCharacterIdInEntries(
            form,
            state
        );

        const controller =
            form.__pixieShopController;

        if (controller) {
            controller.renderTemplate();
        }
    }

    function bindCharacterId(form, state) {
        const input =
            form.querySelector(
                "[name='personaje_id']"
            );

        if (!input) return;

        input.addEventListener(
            "input",
            () => {
                updateCharacterIdInEntries(
                    form,
                    state
                );

                const controller =
                    form.__pixieShopController;

                if (controller) {
                    controller.renderTemplate();
                }
            }
        );
    }

    function updateCharacterIdInEntries(
        form,
        state
    ) {
        const input =
            form.querySelector(
                "[name='personaje_id']"
            );

        const characterId =
            input?.value.trim() || "";

        const repeat =
            form.querySelector(
                `.fa-repeat[data-repeat="${CSS.escape(state.repeat)}"]`
            );

        if (!repeat) return;

        repeat
            .querySelectorAll(".fa-entry .fa-text")
            .forEach(element => {
                element.textContent =
                    characterId;
            });
    }

    function bindGenerate(form, state) {
        const button =
            form.querySelector(
                ".fa-shop-generate"
            );

        if (!button) return;

        button.addEventListener(
            "click",
            event => {
                event.preventDefault();

                const characterId =
                    getCharacterId(form);

                if (!characterId) {
                    showError(
                        form,
                        "Introduce el ID del personaje."
                    );

                    return;
                }

                if (!state.selected.size) {
                    showError(
                        form,
                        "Selecciona al menos un elemento."
                    );

                    return;
                }

                clearError(form);

                const controller =
                    form.__pixieShopController;

                if (!controller) return;

                updateCharacterIdInEntries(
                    form,
                    state
                );

                controller.renderTemplate();

                const output =
                    form.querySelector(
                        ".fa-shop-output"
                    );

                if (output) {
                    output.hidden = false;
                }
            }
        );
    }

    function bindCopy(form) {
        const button =
            form.querySelector(
                ".fa-shop-copy"
            );

        if (!button) return;

        button.addEventListener(
            "click",
            async event => {
                event.preventDefault();

                const output =
                    form.querySelector(
                        ".fa-shop-output"
                    );

                if (!output) return;

                const text =
                    output.value ??
                    output.textContent ??
                    "";

                if (!text.trim()) return;

                try {
                    await navigator.clipboard.writeText(
                        text
                    );

                    const original =
                        button.textContent;

                    button.textContent =
                        "Copiado";

                    setTimeout(() => {
                        button.textContent =
                            original;
                    }, 1500);

                } catch (error) {
                    console.error(
                        "PixieShop: no se pudo copiar.",
                        error
                    );
                }
            }
        );
    }

    function getCharacterId(form) {
        const input =
            form.querySelector(
                "[name='personaje_id']"
            );

        return input?.value.trim() || "";
    }

    function showError(form, message) {
        const errorBox =
            form.querySelector(".fa-shop-error");

        if (!errorBox) return;

        errorBox.textContent = message;
        errorBox.hidden = false;
    }

    function clearError(form) {
        const errorBox =
            form.querySelector(".fa-shop-error");

        if (!errorBox) return;

        errorBox.hidden = true;
        errorBox.textContent = "";
    }

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

    window.PixieShop = PixieShop;

})(window, document);
