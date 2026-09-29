/*!
 * Pixie Switcher
 * Autor: Puck
 * Versión: 2.0.0
 */

PixieKit("Switcher", (_) => {
  "use strict";

  const STORAGE = {
    accounts: _.storage("pixie:switcher:accounts"),
    pending: _.storage("pixie:switcher:pending")
  };

  let mode = null;

  const labels = {
    addCurrent: "Añadir cuenta actual",
    addSwitch: "Añadir y cambiar",
    search: "Buscar cuenta",
    noAccounts: "No hay cuentas guardadas",
    username: "Usuario",
    password: "Contraseña",
    submit: "Continuar",
    switch: "Cambiar cuenta",
    refresh: "Actualizar información",
    remove: "Eliminar cuenta"
  };

  /* -------------------------
     Templates
  ------------------------- */

  const templates = {
    layout: document.createElement("template"),
    account: document.createElement("template")
  };

  templates.layout.innerHTML = `
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

          <div class="pixie-switcher-dialog-header">

            <button
              type="button"
              class="pixie-switcher-close">

              <span class="material-symbols-outlined">
                close
              </span>

            </button>

          </div>

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

  templates.account.innerHTML = `
    <article class="pixie-switcher-account">

      <div class="pixie-switcher-avatar"></div>

      <div class="pixie-switcher-info">

        <a class="pixie-switcher-profile"></a>

        <span class="pixie-switcher-rank"></span>

      </div>

      <div class="pixie-switcher-actions"></div>

    </article>
  `;

  /* -------------------------
     Helpers
  ------------------------- */

  function user() {
    return {
      user_id: Number(_userdata?.user_id || 0),
      username: _userdata?.username || "",
      avatar:
        _userdata?.avatar_link ||
        _userdata?.avatar ||
        "",
      groupcolor:
        _userdata?.groupcolor || "",
      rank:
        window._lang?.rank_title || ""
    };
  }

  function getAccounts() {
    return STORAGE.accounts.get([]);
  }

  function saveAccounts(accounts) {
    STORAGE.accounts.set(accounts);
  }

  function accountExists(userId) {
    return getAccounts().some(
      account => Number(account.user_id) === Number(userId)
    );
  }

  function saveCurrentUser() {
    if (!_.isLogged()) return;

    const current = user();

    if (accountExists(current.user_id)) return;

    const accounts = getAccounts();

    accounts.push({
      ...current,
      addedAt: Date.now(),
      lastUsed: Date.now()
    });

    saveAccounts(accounts);
  }

  function updateLastUsed(userId) {
    const updated = getAccounts().map(account => {

      if (Number(account.user_id) !== Number(userId)) {
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
    const filtered = getAccounts().filter(
      account => Number(account.user_id) !== Number(userId)
    );

    saveAccounts(filtered);

    render();
  }

  function refreshAccount(userId) {
    const current = user();

    const updated = getAccounts().map(account => {

      if (Number(account.user_id) !== Number(userId)) {
        return account;
      }

      return {
        ...account,
        username: current.username,
        avatar: current.avatar,
        groupcolor: current.groupcolor,
        rank: current.rank
      };

    });

    saveAccounts(updated);

    render();
  }

  async function logoutThenLogin(username, password) {

    const logout = document.querySelector("#logout");

    if (!logout) {
      _.log("No encuentro el enlace de logout");
      return;
    }

    try {

      await fetch(logout.href, {
        credentials: "same-origin"
      });

      const body = new URLSearchParams();

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
        "Error durante el cambio de cuenta",
        error
      );

    }
  }

  function finalizePendingAccount() {

    if (!_.isLogged()) {
      STORAGE.pending.remove();
      return;
    }

    const pending =
      STORAGE.pending.get();

    if (!pending) return;

    if (pending !== user().username) {
      return;
    }

    saveCurrentUser();

    STORAGE.pending.remove();

  }

  /* -------------------------
     UI
  ------------------------- */

  function build() {

    const root = _.get(
      "#pixie-switcher",
      { required: false }
    );

    if (!root) return;

    root.replaceChildren(
      templates.layout.content.cloneNode(true)
    );

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

  function render() {

    const list =
      _.get(".pixie-switcher-list");

    if (!list) return;

    list.replaceChildren();

    const accounts =
      getAccounts()
        .sort(
          (a, b) =>
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
        templates.account.content.cloneNode(true);

      const card =
        node.querySelector(
          ".pixie-switcher-account"
        );

      card.dataset.userId =
        account.user_id;

      card.dataset.username =
        account.username;

      card.style.setProperty(
        "--pixie-user-color",
        `#${account.groupcolor}`
      );

      const avatar =
        node.querySelector(
          ".pixie-switcher-avatar"
        );

      avatar.innerHTML =
        account.avatar || "";

      const profile =
        node.querySelector(
          ".pixie-switcher-profile"
        );

      profile.textContent =
        account.username;

      profile.href =
        `/u${account.user_id}`;

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
        Number(user().user_id);

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

  /* -------------------------
     Dialog
  ------------------------- */

  function openDialog(
    username,
    full = false
  ) {

    mode = full
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

    const dialog =
      _.get(".pixie-switcher-dialog");

    _.get(
      ".pixie-switcher-username"
    ).value = "";

    _.get(
      ".pixie-switcher-password"
    ).value = "";

    dialog.close();

  }

  /* -------------------------
     Events
  ------------------------- */

  function bindEvents() {

    const root =
      _.get("#pixie-switcher");

    root.addEventListener(
      "click",
      event => {

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

          case "remove":
            removeAccount(userId);
            break;

          case "refresh":
            refreshAccount(userId);
            break;

          case "switch":
            updateLastUsed(userId);
            openDialog(username);
            break;

        }

      }
    );

    _.get(".pixie-switcher-close")
      .addEventListener(
        "click",
        closeDialog
      );

    _.get(".pixie-switcher-filter")
      .addEventListener(
        "input",
        event => {

          const value =
            event.target.value
              .toLowerCase()
              .trim();

          _.getAll(
            ".pixie-switcher-account"
          ).forEach(card => {

            const username =
              card.dataset.username
                .toLowerCase();

            card.hidden =
              !username.includes(
                value
              );

          });

        }
      );

    _.get(".pixie-switcher-form")
      .addEventListener(
        "submit",
        async event => {

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

            STORAGE.pending.set(
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

  /* -------------------------
     Plugin
  ------------------------- */

  const plugin = {

    init() {

      const root =
        _.get(
          "#pixie-switcher",
          { required: false }
        );

      if (!root) return;

      build();

      finalizePendingAccount();

      bindEvents();

      render();

      _.log("Inicializado");

    }

  };

  _.ready(() => plugin.init());

  return plugin;

});
