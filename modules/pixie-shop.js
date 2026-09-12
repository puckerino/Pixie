/*!
 * PixieShop.js
 * Motor genérico para formularios de tienda.
 *
 * Requiere:
 * - PixieFormCore.js
 *
 * Solo consulta Supabase.
 * No modifica ningún dato en Supabase.
 */

(function (window, document) {
    "use strict";

    if (window.PixieShop) return;

    const SUPABASE_URL =
        "https://udnotovrosokbdahlqaf.supabase.co";

    const SUPABASE_KEY =
        "TU_PUBLISHABLE_KEY";

    const FORM_SELECTOR =
        ".fa-generated-shop-form";

    const PixieShop = {
        init,
        fetchTable
    };

    function init() {
        document
            .querySelectorAll(FORM_SELECTOR)
            .forEach(initForm);
    }

    async function initForm(form) {
        if (!window.PixieFormCore) {
            console.error(
                "PixieShop: PixieFormCore no está disponible."
            );
            return;
        }

        const source =
            form.dataset.shopSource;

        if (!source) {
            console.error(
                "PixieShop: falta data-shop-source.",
                form
            );
            return;
        }

        const repeat =
            form.dataset.shopRepeat || source;

        const mode =
            form.dataset.shopMode || "quantity";

        const idField =
            form.dataset.shopIdField || "id";

        const labelField =
            form.dataset.shopLabelField || "titulo";

        const template =
            document.querySelector(
                `#fa-shop-template-${CSS.escape(
                    form.dataset.id
                )}`
            );

        if (!template) {
            console.error(
                `PixieShop: no existe la plantilla para ${form.dataset.id}.`
            );
            return;
        }

        const controller =
            PixieFormCore.initGeneratedForm(form);

        const state = {
            source,
            repeat,
            mode,
            idField,
            labelField,
            data: [],
            selected: new Map()
        };

        form.__pixieShop = state;
        form.__pixieShopController = controller;

        try {
            state.data =
                (await fetchTable(source))
                    .filter(
                        row => row.visible !== false
                    );

            renderRecords(form, state, template);
            bindForm(form, state);

        } catch (error) {
            console.error(
                "PixieShop:",
                error
            );

            showError(
                form,
                "No se han podido cargar los datos."
            );
        }
    }

    async function fetchTable(table) {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${encodeURIComponent(
                table
            )}?select=*`,
            {
                method: "GET",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization:
                        `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        if (!response.ok) {
            const message =
                await response.text();

            throw new Error(
                `Supabase ${response.status}: ${message}`
            );
        }

        return response.json();
    }

    function renderRecords(
        form,
        state,
        template
    ) {
        const container =
            form.querySelector(
                ".fa-shop-records"
            );

        if (!container) return;

        container.replaceChildren();

        state.data.forEach(item => {
            const element =
                renderRecord(
                    form,
                    state,
                    template,
                    item
                );

            if (element) {
                container.append(element);
            }
        });
    }

    function renderRecord(
        form,
        state,
        template,
        item
    ) {
        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.innerHTML =
            renderTemplate(
                template.innerHTML,
                item
            );

        const element =
            wrapper.firstElementChild;

        if (!element) return null;

        const id =
            item[state.idField];

        element.dataset.shopId = id;

        const buttons =
            element.querySelectorAll(
                "[data-shop-action]"
            );

        buttons.forEach(button => {
            button.addEventListener(
                "click",
                event => {
                    event.preventDefault();

                    handleAction(
                        form,
                        state,
                        id
                    );
                }
            );
        });

        return element;
    }

    function renderTemplate(
        source,
        data
    ) {
        return source.replace(
            /\{([a-zA-Z0-9_]+)\}/g,
            (_, field) => {
                const value =
                    data[field];

                return value == null
                    ? ""
                    : escapeHTML(
                        String(value)
                    );
            }
        );
    }

    function handleAction(
        form,
        state,
        id
    ) {
        if (state.mode === "toggle") {
            toggleItem(
                form,
                state,
                id
            );
        } else {
            addItem(
                form,
                state,
                id
            );
        }

        renderSelection(
            form,
            state
        );
    }

    function addItem(
        form,
        state,
        id
    ) {
        const current =
            state.selected.get(id) || 0;

        state.selected.set(
            id,
            current + 1
        );
    }

    function toggleItem(
        form,
        state,
        id
    ) {
        if (state.selected.has(id)) {
            state.selected.delete(id);
        } else {
            state.selected.set(id, 1);
        }
    }

    function renderSelection(
        form,
        state
    ) {
        const repeat =
            form.querySelector(
                `.fa-repeat[data-repeat="${CSS.escape(
                    state.repeat
                )}"]`
            );

        if (!repeat) return;

        const list =
            repeat.querySelector(
                ".fa-repeat-list"
            );

        if (!list) return;

        list.replaceChildren();

        state.selected.forEach(
            (quantity, id) => {
                const item =
                    state.data.find(
                        row =>
                            String(
                                row[state.idField]
                            ) === String(id)
                    );

                if (!item) return;

                const entry =
                    createEntry(
                        form,
                        state,
                        item,
                        quantity
                    );

                list.append(entry);
            }
        );

        updateCharacterIds(
            form,
            state
        );

        renderOutput(
            form
        );
    }

    function createEntry(
        form,
        state,
        item,
        quantity
    ) {
        const entry =
            document.createElement(
                "div"
            );

        entry.className =
            "fa-entry";

        entry.dataset.value =
            item[state.idField];

        const label =
            document.createElement(
                "span"
            );

        label.className =
            "fa-label";

        label.textContent =
            item[state.labelField] ??
            item[state.idField];

        entry.append(label);

        const value =
            document.createElement(
                "span"
            );

        value.className =
            "fa-value";

        value.textContent =
            item[state.idField];

        entry.append(value);

        const amount =
            document.createElement(
                "span"
            );

        amount.className =
            "fa-cantidad";

        amount.textContent =
            quantity;

        entry.append(amount);

        const character =
            document.createElement(
                "span"
            );

        character.className =
            "fa-text";

        character.hidden = true;

        character.textContent =
            getCharacterId(form);

        entry.append(character);

        if (state.mode === "quantity") {
            const controls =
                document.createElement(
                    "span"
                );

            controls.className =
                "fa-shop-entry-controls";

            const minus =
                createButton(
                    "−",
                    () => {
                        const current =
                            state.selected.get(
                                item[state.idField]
                            ) || 0;

                        if (current <= 1) {
                            state.selected.delete(
                                item[state.idField]
                            );
                        } else {
                            state.selected.set(
                                item[state.idField],
                                current - 1
                            );
                        }

                        renderSelection(
                            form,
                            state
                        );
                    }
                );

            const plus =
                createButton(
                    "+",
                    () => {
                        const current =
                            state.selected.get(
                                item[state.idField]
                            ) || 0;

                        state.selected.set(
                            item[state.idField],
                            current + 1
                        );

                        renderSelection(
                            form,
                            state
                        );
                    }
                );

            controls.append(
                minus,
                plus
            );

            entry.append(controls);
        }

        const remove =
            createButton(
                "×",
                () => {
                    state.selected.delete(
                        item[state.idField]
                    );

                    renderSelection(
                        form,
                        state
                    );
                }
            );

        entry.append(remove);

        return entry;
    }

    function createButton(
        text,
        callback
    ) {
        const button =
            document.createElement(
                "button"
            );

        button.type = "button";
        button.textContent = text;

        button.addEventListener(
            "click",
            callback
        );

        return button;
    }

    function bindForm(
        form,
        state
    ) {
        const character =
            form.querySelector(
                "[name='personaje_id']"
            );

        if (character) {
            character.addEventListener(
                "input",
                () => {
                    updateCharacterIds(
                        form,
                        state
                    );

                    renderOutput(
                        form
                    );
                }
            );
        }

        const generate =
            form.querySelector(
                "[data-shop-generate]"
            );

        if (generate) {
            generate.addEventListener(
                "click",
                event => {
                    event.preventDefault();

                    if (!getCharacterId(form)) {
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
                    renderOutput(form);
                }
            );
        }

        const copy =
            form.querySelector(
                "[data-shop-copy]"
            );

        if (copy) {
            copy.addEventListener(
                "click",
                async event => {
                    event.preventDefault();

                    const output =
                        form.querySelector(
                            "[data-shop-output]"
                        );

                    if (!output) return;

                    try {
                        await navigator.clipboard.writeText(
                            output.value
                        );

                        const original =
                            copy.textContent;

                        copy.textContent =
                            "Copiado";

                        setTimeout(() => {
                            copy.textContent =
                                original;
                        }, 1500);

                    } catch (error) {
                        console.error(
                            "PixieShop: error al copiar.",
                            error
                        );
                    }
                }
            );
        }
    }

    function renderOutput(form) {
        const controller =
            form.__pixieShopController;

        if (!controller) return;

        controller.renderTemplate();

        const output =
            form.querySelector(
                "[data-shop-output]"
            );

        if (!output) return;

        output.hidden = false;
    }

    function updateCharacterIds(
        form,
        state
    ) {
        const characterId =
            getCharacterId(form);

        const repeat =
            form.querySelector(
                `.fa-repeat[data-repeat="${CSS.escape(
                    state.repeat
                )}"]`
            );

        if (!repeat) return;

        repeat
            .querySelectorAll(
                ".fa-entry .fa-text"
            )
            .forEach(element => {
                element.textContent =
                    characterId;
            });
    }

    function getCharacterId(form) {
        const input =
            form.querySelector(
                "[name='personaje_id']"
            );

        return input
            ? input.value.trim()
            : "";
    }

    function showError(
        form,
        message
    ) {
        const error =
            form.querySelector(
                ".fa-shop-error"
            );

        if (!error) return;

        error.textContent =
            message;

        error.hidden = false;
    }

    function clearError(form) {
        const error =
            form.querySelector(
                ".fa-shop-error"
            );

        if (!error) return;

        error.textContent = "";
        error.hidden = true;
    }

    function escapeHTML(value) {
        return value
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

    window.PixieShop =
        PixieShop;

})(window, document);
