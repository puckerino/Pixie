/*!
 * PixieSwitcher.js
 * Gestor de cuentas para ForoActivo
 * Requiere: pixiekit.js
 * Versión: 2.0.0
 */

const PixieSwitcher = PixieKit("Switcher", function (_) {

  const config = {
    target: "[data-pixie-switcher]"
  };

  const storage = {
    accounts: _.storage("pixie:switcher:accounts"),
    pending: _.storage("pixie:switcher:pending")
  };

  let mode = null;

  const labels = {
    addCurrent: "Añadir cuenta actual",
    addSwitch: "Añadir y cambiar",
    search: "Buscar cuenta",
    username: "Usuario",
    password: "Contraseña",
    submit: "Continuar",
    noAccounts: "No hay cuentas guardadas",
    refresh: "Actualizar información",
    remove: "Eliminar cuenta",
    switch: "Cambiar cuenta"
  };

  /* ==================================================
     Templates
  ================================================== */

  const accountTemplate = document.createElement("template");

  accountTemplate.innerHTML = `
    <article class="pixie-switcher-account">

      <div class="pixie-switcher-avatar"></div>

      <div class="pixie-switcher-info">

        <a class="pixie-switcher-profile"></a>

        <span class="pixie-switcher-rank"></span>

      </div>

      <div class="pixie-switcher-actions"></div>

    </article>
  `;

  /* ==================================================
     Helpers
  ================================================== */

  function user() {

    return {
      id: Number(window._userdata?.user_id || 0),
      username: window._userdata?.username || "",
      avatar:
        window._userdata?.avatar_link ||
        "",
      color:
        normalizeColor(
          window._userdata?.groupcolor || ""
        ),
      rank:
        window._lang?.rank_title || ""
    };

  }

  function normalizeColor(color) {

    if (!color) return "";

    return color.startsWith("#")
      ? color
      : `#${color}`;

  }

  function isLogged() {
    return _.isLogged();
  }

  function getAccounts() {
    return storage.accounts.get([]);
  }

  function saveAccounts(accounts) {
    storage.accounts.set(accounts);
  }

  function getPendingAccount() {
    return storage.pending.get(null);
  }

  function setPendingAccount(username) {
    storage.pending.set(username);
  }

  function clearPendingAccount() {
    storage.pending.remove();
  }

  function accountExists(userId) {

    return getAccounts().some(account =>
      Number(account.user_id) === Number(userId)
    );

  }

  function saveCurrentUser() {

    if (!isLogged()) return;

    const current = user();

    if (accountExists(current.id)) {
      return;
    }

    const accounts = getAccounts();

    accounts.push({
      user_id: current.id,
      username: current.username,
      avatar: current.avatar,
      groupcolor: current.color,
      rank: current.rank,
      addedAt: Date.now(),
      lastUsed: Date.now()
    });

    saveAccounts(accounts);

  }

  function updateLastUsed(userId) {

    const updated = getAccounts().map(account => {

      if (
        Number(account.user_id) !== Number(userId)
      ) {
        return account;
      }

      return {
        ...account,
        lastUsed: Date.now()
      };

    });

    saveAccounts(updated);

  }

  function removeAccount(userId) {

    const filtered = getAccounts().filter(account =>
      Number(account.user_id) !== Number(userId)
    );

    saveAccounts(filtered);

    renderAccounts();

  }

  function refreshAccount(userId) {

    const current = user();

    const updated = getAccounts().map(account => {

      if (
        Number(account.user_id) !== Number(userId)
      ) {
        return account;
      }

      return {
        ...account,
        username: current.username,
        avatar: current.avatar,
        groupcolor: current.color,
        rank: current.rank
      };

    });

    saveAccounts(updated);

    renderAccounts();

  }

  function finalizePendingAccount() {

    if (!isLogged()) {

      clearPendingAccount();

      return;
    }

    const pending = getPendingAccount();

    if (!pending) return;

    if (pending !== user().username) {
      return;
    }

    saveCurrentUser();

    clearPendingAccount();

  }

  function getLogoutLink() {

    return (
      document.querySelector(
        'a[href*="logout"]'
      ) ||
      document.querySelector("#logout")
    );

  }

  async function logoutThenLogin(
    username,
    password
  ) {

    const logout =
      getLogoutLink();

    if (!logout) {

      _.log(
        "No encuentro el enlace de logout"
      );

      return;
    }

    try {

      await fetch(logout.href, {
        credentials: "same-origin"
      });

      const body =
        new URLSearchParams();

      body.append("login", "1");
      body.append("username", username);
      body.append("password", password);
      body.append("autologin", "1");

      await fetch("/login", {

        method: "POST",

        credentials: "same-origin",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },

        body

      });

      location.reload();

    } catch (error) {

      _.log(
        "Error cambiando de cuenta",
        error
      );

    }

  }

  /* ==================================================
     Render
  ================================================== */

  function renderLayout() {

    return `
      <div class="pixie-switcher">

        <div class="pixie-switcher-toolbar">

          <button
            type="button"
            class="pixie-btn"
            data-action="add-current">

            <span class="material-symbols-outlined">
              person_add
            </span>

            ${labels.addCurrent}

          </button>

          <button
            type="button"
            class="pixie-btn"
            data-action="add-switch">

            <span class="material-symbols-outlined">
              manage_accounts
            </span>

            ${labels.addSwitch}

          </button>

        </div>

        <div class="pixie-switcher-search">

          <span class="material-symbols-outlined">
            search
          </span>

          <input
            type="search"
            class="pixie-switcher-filter"
            placeholder="${labels.search}">

        </div>

        <div class="pixie-switcher-list"></div>

        <dialog class="pixie-switcher-dialog">

          <form class="pixie-switcher-form">

            <button
              type="button"
              class="pixie-switcher-close">

              <span class="material-symbols-outlined">
                close
              </span>

            </button>

            <input
              type="text"
              class="pixie-switcher-username"
              placeholder="${labels.username}">

            <input
              type="password"
              class="pixie-switcher-password"
              placeholder="${labels.password}">

            <button
              type="submit"
              class="pixie-switcher-submit">

              ${labels.submit}

            </button>

          </form>

        </dialog>

      </div>
    `;

  }

  function createActionButton(
    action,
    icon,
    title
  ) {

    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "pixie-switcher-action";

    button.dataset.action =
      action;

    button.title =
      title;

    button.innerHTML = `
      <span class="material-symbols-outlined">
        ${icon}
      </span>
    `;

    return button;

  }

  function renderAccounts() {

    const list = _.get(
      ".pixie-switcher-list"
    );

    if (!list) return;

    list.replaceChildren();

    const accounts =
      getAccounts()
        .sort((a, b) =>
          b.lastUsed - a.lastUsed
        );

    if (!accounts.length) {

      list.innerHTML = `
        <div class="pixie-switcher-empty">
          ${labels.noAccounts}
        </div>
      `;

      return;
    }

    accounts.forEach(account => {

      const node =
        accountTemplate.content.cloneNode(true);

      const card =
        node.querySelector(
          ".pixie-switcher-account"
        );

      card.dataset.userId =
        account.user_id;

      card.dataset.username =
        account.username;

      const avatar =
        node.querySelector(
          ".pixie-switcher-avatar"
        );

      if (account.avatar) {

        const img =
          document.createElement("img");

        img.src =
          account.avatar;

        img.alt =
          account.username;

        avatar.append(img);

      }

      const profile =
        node.querySelector(
          ".pixie-switcher-profile"
        );

      profile.href =
        `/u${account.user_id}`;

      profile.textContent =
        account.username;

      if (account.groupcolor) {
        profile.style.color =
          account.groupcolor;
      }

      node.querySelector(
        ".pixie-switcher-rank"
      ).textContent =
        account.rank || "";

      const actions =
        node.querySelector(
          ".pixie-switcher-actions"
        );

      const active =
        Number(account.user_id) ===
        user().id;

      if (active) {

        actions.append(
          createActionButton(
            "refresh",
            "refresh",
            labels.refresh
          )
        );

      } else {

        actions.append(
          createActionButton(
            "switch",
            "swap_horiz",
            labels.switch
          )
        );

      }

      actions.append(
        createActionButton(
          "remove",
          "delete",
          labels.remove
        )
      );

      list.append(node);

    });

  }

  /* ==================================================
     Dialog
  ================================================== */

  function openDialog(
    username,
    full = false
  ) {

    mode =
      full
        ? "full"
        : "confirm";

    const dialog =
      _.get(".pixie-switcher-dialog");

    const usernameInput =
      _.get(".pixie-switcher-username");

    const passwordInput =
      _.get(".pixie-switcher-password");

    usernameInput.hidden =
      !full;

    usernameInput.value =
      full ? "" : username;

    passwordInput.value =
      "";

    dialog.showModal();

    passwordInput.focus();

  }

  function closeDialog() {

    _.get(
      ".pixie-switcher-username"
    ).value = "";

    _.get(
      ".pixie-switcher-password"
    ).value = "";

    _.get(
      ".pixie-switcher-dialog"
    ).close();

  }

  /* ==================================================
     Events
  ================================================== */

  function bindEvents() {

    const root = _.get(
      config.target
    );

    root.addEventListener(
      "click",
      function (event) {

        const button =
          event.target.closest(
            "[data-action]"
          );

        if (!button) return;

        const action =
          button.dataset.action;

        if (action === "add-current") {

          openDialog(
            user().username
          );

          return;
        }

        if (action === "add-switch") {

          openDialog(
            "",
            true
          );

          return;
        }

        const card =
          button.closest(
            ".pixie-switcher-account"
          );

        if (!card) return;

        const userId =
          Number(card.dataset.userId);

        const username =
          card.dataset.username;

        switch (action) {

          case "switch":

            updateLastUsed(userId);

            openDialog(username);

            break;

          case "refresh":

            refreshAccount(userId);

            break;

          case "remove":

            removeAccount(userId);

            break;

        }

      }
    );

    _.get(
      ".pixie-switcher-close"
    ).addEventListener(
      "click",
      closeDialog
    );

    _.get(
      ".pixie-switcher-filter"
    ).addEventListener(
      "input",
      function (event) {

        const value =
          event.target.value
            .toLowerCase()
            .trim();

        _.getAll(
          ".pixie-switcher-account"
        ).forEach(function (card) {

          card.hidden =
            !card.dataset.username
              .toLowerCase()
              .includes(value);

        });

      }
    );

    _.get(
      ".pixie-switcher-form"
    ).addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();

        const username =
          _.get(
            ".pixie-switcher-username"
          ).value;

        const password =
          _.get(
            ".pixie-switcher-password"
          ).value;

        if (!password) return;

        if (mode === "confirm") {

          saveCurrentUser();

        }

        if (mode === "full") {

          setPendingAccount(
            username
          );

        }

        await logoutThenLogin(
          username,
          password
        );

      }
    );

  }

  /* ==================================================
     Init
  ================================================== */

  async function init() {

    const target =
      _.get(
        config.target,
        { required: false }
      );

    if (!target) return;

    target.innerHTML =
      renderLayout();

    finalizePendingAccount();

    bindEvents();

    renderAccounts();

    _.log(
      "Pixie Switcher inicializado"
    );

  }

  _.ready(init);

  return {
    init,
    renderAccounts
  };

});
