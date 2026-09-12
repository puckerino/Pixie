/*!
 * PixieShop.js
 * Tienda basada en PixieFormCore.
 *
 * Requiere:
 * - PixieFormCore.js
 */

(function (window, document) {
    "use strict";

    if (window.PixieShop) return;

    const Core = window.PixieFormCore;

    if (!Core) {
        console.error("[PixieShop] PixieFormCore no está disponible.");
        return;
    }

    const SUPABASE_URL = "https://udnotovrosokbdahlqaf.supabase.co";
    const SUPABASE_KEY = "TU_PUBLISHABLE_KEY";

    const state = {
        items: [],
        rewards: [],
        cart: [],
        selectedRewards: []
    };

    let shop;
    let itemsController;
    let rewardsController;

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function fetchSupabase(table) {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/${table}?select=*`,
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `[PixieShop] Error cargando ${table}: ${response.status}`
            );
        }

        return response.json();
    }

    function getItem(id) {
        return state.items.find(
            item => Number(item.id) === Number(id)
        );
    }

    function getReward(id) {
        return state.rewards.find(
            reward => Number(reward.id) === Number(id)
        );
    }

    function addToCart(itemId) {
        const existing = state.cart.find(
            entry =>
                entry.item_id === Number(itemId) &&
                entry.movimiento === "suma"
        );

        if (existing) {
            existing.cantidad++;
        } else {
            state.cart.push({
                item_id: Number(itemId),
                cantidad: 1,
                movimiento: "suma"
            });
        }

        renderCart();
        syncItemsRepeater();
    }

    function removeFromCart(itemId) {
        const existing = state.cart.find(
            entry =>
                entry.item_id === Number(itemId) &&
                entry.movimiento === "resta"
        );

        if (existing) {
            existing.cantidad++;
        } else {
            state.cart.push({
                item_id: Number(itemId),
                cantidad: 1,
                movimiento: "resta"
            });
        }

        renderCart();
        syncItemsRepeater();
    }

    function changeQuantity(index, amount) {
        const entry = state.cart[index];

        if (!entry) return;

        entry.cantidad += amount;

        if (entry.cantidad <= 0) {
            state.cart.splice(index, 1);
        }

        renderCart();
        syncItemsRepeater();
    }

    function deleteCartEntry(index) {
        state.cart.splice(index, 1);

        renderCart();
        syncItemsRepeater();
    }

    function toggleReward(rewardId) {
        rewardId = Number(rewardId);

        const index = state.selectedRewards.indexOf(rewardId);

        if (index === -1) {
            state.selectedRewards.push(rewardId);
        } else {
            state.selectedRewards.splice(index, 1);
        }

        renderRewards();
        syncRewardsRepeater();
    }

    function renderItems() {
        const container = shop.querySelector("[data-shop-items]");

        container.innerHTML = state.items
            .map(item => `
                <article
                    class="shop-item"
                    data-item-id="${item.id}"
                >

                    ${item.imagen
                        ? `<img
                            src="${escapeHTML(item.imagen)}"
                            alt=""
                            class="shop-item-image"
                        >`
                        : ""
                    }

                    <div class="shop-item-content">

                        <h3>
                            ${escapeHTML(item.titulo || item.nombre)}
                        </h3>

                        ${item.descripcion
                            ? `<p>${escapeHTML(item.descripcion)}</p>`
                            : ""
                        }

                        ${item.efecto
                            ? `<div class="shop-item-effect">
                                ${escapeHTML(item.efecto)}
                            </div>`
                            : ""
                        }

                        <div class="shop-item-footer">

                            <strong>
                                ${escapeHTML(item.precio ?? 0)}
                            </strong>

                            <div class="shop-item-actions">

                                <button
                                    type="button"
                                    data-shop-buy="${item.id}"
                                >
                                    Comprar
                                </button>

                                <button
                                    type="button"
                                    data-shop-remove="${item.id}"
                                >
                                    Retirar
                                </button>

                            </div>

                        </div>

                    </div>

                </article>
            `)
            .join("");
    }

    function renderCart() {
        const container = shop.querySelector("[data-shop-cart]");

        if (!state.cart.length) {
            container.innerHTML = "<p>El carrito está vacío.</p>";
            return;
        }

        container.innerHTML = state.cart
            .map((entry, index) => {

                const item = getItem(entry.item_id);

                if (!item) return "";

                const action =
                    entry.movimiento === "suma"
                        ? "Comprar"
                        : "Retirar";

                return `
                    <div
                        class="shop-cart-entry"
                        data-cart-index="${index}"
                    >

                        <span class="shop-cart-name">
                            ${escapeHTML(item.titulo || item.nombre)}
                        </span>

                        <span class="shop-cart-action">
                            ${action}
                        </span>

                        <div class="shop-cart-quantity">

                            <button
                                type="button"
                                data-cart-minus="${index}"
                            >
                                −
                            </button>

                            <span>
                                ${entry.cantidad}
                            </span>

                            <button
                                type="button"
                                data-cart-plus="${index}"
                            >
                                +
                            </button>

                        </div>

                        <button
                            type="button"
                            data-cart-delete="${index}"
                        >
                            ×
                        </button>

                    </div>
                `;
            })
            .join("");
    }

    function renderRewards() {
        const container = shop.querySelector("[data-shop-rewards]");

        if (!state.rewards.length) {
            container.innerHTML = "<p>No hay recompensas disponibles.</p>";
            return;
        }

        container.innerHTML = state.rewards
            .map(reward => {

                const selected =
                    state.selectedRewards.includes(Number(reward.id));

                return `
                    <label class="shop-reward">

                        <input
                            type="checkbox"
                            data-shop-reward="${reward.id}"
                            ${selected ? "checked" : ""}
                        >

                        <span>
                            ${escapeHTML(reward.nombre)}
                        </span>

                    </label>
                `;
            })
            .join("");
    }

    function createEntry({
        label = "",
        value = "",
        cantidad = "",
        text = "",
        extra = ""
    }) {
        const entry = document.createElement("div");

        entry.className = "fa-entry";

        entry.innerHTML = `
            <input
                class="fa-label"
                type="hidden"
                value="${escapeHTML(label)}"
            >

            <input
                class="fa-value"
                type="hidden"
                value="${escapeHTML(value)}"
            >

            <input
                class="fa-cantidad"
                type="hidden"
                value="${escapeHTML(cantidad)}"
            >

            <input
                class="fa-text"
                type="hidden"
                value="${escapeHTML(text)}"
            >

            <input
                class="fa-extra"
                type="hidden"
                value="${escapeHTML(extra)}"
            >
        `;

        return entry;
    }

    function syncItemsRepeater() {
        const list = document.querySelector(
            '[data-id="tienda-items"] [data-repeat="items"] .fa-repeat-list'
        );

        if (!list) return;

        list.innerHTML = "";

        const personajeId =
            shop.querySelector("[data-shop-personaje]")?.value || "";

        state.cart.forEach(entry => {

            const item = getItem(entry.item_id);

            if (!item) return;

            list.appendChild(
                createEntry({
                    label: item.titulo || item.nombre,
                    value: entry.item_id,
                    cantidad: entry.cantidad,
                    text: personajeId,
                    extra: entry.movimiento
                })
            );
        });
    }

    function syncRewardsRepeater() {
        const list = document.querySelector(
            '[data-id="tienda-recompensas"] [data-repeat="recompensas"] .fa-repeat-list'
        );

        if (!list) return;

        list.innerHTML = "";

        const personajeId =
            shop.querySelector("[data-shop-personaje]")?.value || "";

        state.selectedRewards.forEach(rewardId => {

            const reward = getReward(rewardId);

            if (!reward) return;

            list.appendChild(
                createEntry({
                    label: reward.nombre,
                    value: reward.id,
                    text: personajeId
                })
            );
        });
    }

    function syncRepeaters() {
        syncItemsRepeater();
        syncRewardsRepeater();
    }

    function generate() {
        const personajeInput =
            shop.querySelector("[data-shop-personaje]");

        const personajeId = Number(personajeInput.value);

        if (!personajeId) {
            personajeInput.reportValidity();
            personajeInput.focus();
            return;
        }

        syncRepeaters();

        const itemsOutput =
            itemsController.renderTemplate().trim();

        const rewardsOutput =
            rewardsController.renderTemplate().trim();

        shop.querySelector(
            "[data-shop-items-output]"
        ).value = itemsOutput;

        shop.querySelector(
            "[data-shop-rewards-output]"
        ).value = rewardsOutput;

        shop.querySelector(
            "[data-shop-output]"
        ).hidden = false;

        window.dispatchEvent(
            new CustomEvent("pixie:shop-form-generated", {
                detail: {
                    personajeId,
                    items: itemsOutput,
                    recompensas: rewardsOutput
                }
            })
        );
    }

    async function copyOutput(selector) {
        const textarea = shop.querySelector(selector);

        if (!textarea?.value) return;

        await navigator.clipboard.writeText(textarea.value);
    }

    function bindEvents() {

        shop.addEventListener("click", event => {

            const buy = event.target.closest("[data-shop-buy]");

            if (buy) {
                addToCart(buy.dataset.shopBuy);
                return;
            }

            const remove = event.target.closest("[data-shop-remove]");

            if (remove) {
                removeFromCart(remove.dataset.shopRemove);
                return;
            }

            const plus = event.target.closest("[data-cart-plus]");

            if (plus) {
                changeQuantity(
                    Number(plus.dataset.cartPlus),
                    1
                );
                return;
            }

            const minus = event.target.closest("[data-cart-minus]");

            if (minus) {
                changeQuantity(
                    Number(minus.dataset.cartMinus),
                    -1
                );
                return;
            }

            const del = event.target.closest("[data-cart-delete]");

            if (del) {
                deleteCartEntry(
                    Number(del.dataset.cartDelete)
                );
                return;
            }

            const generateButton =
                event.target.closest("[data-shop-generate]");

            if (generateButton) {
                generate();
                return;
            }

            const copyItems =
                event.target.closest("[data-shop-copy-items]");

            if (copyItems) {
                copyOutput("[data-shop-items-output]");
                return;
            }

            const copyRewards =
                event.target.closest("[data-shop-copy-rewards]");

            if (copyRewards) {
                copyOutput("[data-shop-rewards-output]");
            }
        });

        shop.addEventListener("change", event => {

            const reward =
                event.target.closest("[data-shop-reward]");

            if (reward) {
                toggleReward(reward.dataset.shopReward);
                return;
            }

            if (
                event.target.matches(
                    "[data-shop-personaje]"
                )
            ) {
                syncRepeaters();
            }
        });

        shop.addEventListener("input", event => {

            if (
                event.target.matches(
                    "[data-shop-personaje]"
                )
            ) {
                syncRepeaters();
            }
        });
    }

    async function init() {

        shop = document.querySelector("[data-shop]");

        if (!shop) return;

        if (!document.querySelector(".fa-generated-shop-form")) {
            console.error(
                "[PixieShop] No se encontraron los formularios internos."
            );
            return;
        }

        itemsController = Core.initGeneratedForm(
            document.querySelector(
                '[data-id="tienda-items"]'
            )
        );

        rewardsController = Core.initGeneratedForm(
            document.querySelector(
                '[data-id="tienda-recompensas"]'
            )
        );

        const [items, rewards] = await Promise.all([
            fetchSupabase("items"),
            fetchSupabase("recompensas")
        ]);

        state.items = items.filter(
            item => item.visible !== false
        );

        state.rewards = rewards.filter(
            reward => reward.visible !== false
        );

        renderItems();
        renderCart();
        renderRewards();
        syncRepeaters();
        bindEvents();

        window.dispatchEvent(
            new CustomEvent("pixie:shop-form-ready", {
                detail: {
                    items: state.items,
                    recompensas: state.rewards
                }
            })
        );
    }

    window.PixieShop = {
        init,
        state
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );
    } else {
        init();
    }

})(window, document);
