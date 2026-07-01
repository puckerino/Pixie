const PixieSwitch = PixieKit("PixieSwitch", function ({
  ready,
  get,
  storage,
  user,
  isLogged,
  log
}) {
  const KEYS = Object.freeze({
    accounts: "pixie_switch_accounts_v1",
    prefill: "pixie_switch_prefill_username"
  });

  const SELECTORS = Object.freeze({
    button: "#pixie-switch-button",
    panel: "#pixie-switch-panel",
    list: "#pixie-switch-list",
    accountTemplate: "#pixie-switch-account-template",
    emptyTemplate: "#pixie-switch-empty-template",
    saveButton: '[data-pixie-switch-action="save"]',
    deleteCurrentButton: '[data-pixie-switch-action="delete-current"]',
    logout: "#logout",
    toolbarAvatar: "#fa_usermenu img",
    welcome: "#fa_welcome"
  });

  const TEXT = Object.freeze({
    save: "Guardar cuenta",
    active: "Activa",
    switch: "Cerrar sesión y preparar login",
    emptyTitle: "Sin cuentas guardadas",
    emptyGuest: "Inicia sesión y guarda tus multicuentas.",
    emptyUser: "Pulsa “Guardar cuenta” para añadir la cuenta actual.",
    alreadySaved: "Esa cuenta ya está guardada.",
    loginRequired: "Primero inicia sesión para poder guardar la cuenta.",
    noActiveSession: "No hay sesión activa que borrar.",
    notSaved: "Esa cuenta no estaba guardada.",
    confirmDelete: "¿Eliminar esta cuenta?",
    confirmDeleteCurrent: "¿Borrar la cuenta actual de la lista?",
    missingHtml: "Falta el HTML base de PixieSwitch."
  });

  const DEFAULT_AVATAR =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23333'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23fff'%3E%3F%3C/text%3E%3C/svg%3E";

  const accountStore = storage(KEYS.accounts);

  function normalize(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/bienvenido\/a\s*/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  const Accounts = {
    load() {
      const accounts = accountStore.get([]);
      if (!Array.isArray(accounts)) return [];

      return accounts
        .filter((account) => account && account.nick)
        .map((account) => ({
          id: String(account.id || ""),
          nick: String(account.nick || "").trim(),
          avatar: String(account.avatar || "")
        }));
    },

    save(accounts) {
      accountStore.set(accounts || []);
    },

    current() {
      if (isLogged()) {
        const currentUser = user();

        if (currentUser && currentUser.name) {
          return {
            id: currentUser.id ? String(currentUser.id) : "",
            nick: currentUser.name,
            avatar: currentUser.avatar || ""
          };
        }
      }

      const img = get(SELECTORS.toolbarAvatar, { required: false });
      const avatar = img && img.src ? img.src : "";

      const alt = img && img.getAttribute
        ? String(img.getAttribute("alt") || "")
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        : "";

      if (alt) {
        return {
          id: "",
          nick: alt,
          avatar
        };
      }

      const welcome = get(SELECTORS.welcome, { required: false });

      if (!welcome) return null;

      const nick = String(welcome.textContent || "")
        .replace(/\u00a0/g, " ")
        .replace(/bienvenido\/a\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!nick) return null;

      return {
        id: "",
        nick,
        avatar
      };
    },

    isSame(a, b) {
      if (!a || !b) return false;

      const idA = String(a.id || "");
      const idB = String(b.id || "");

      if (idA && idB && idA === idB) return true;

      return normalize(a.nick) === normalize(b.nick);
    },

    exists(account) {
      return this.load().some((saved) => this.isSame(saved, account));
    },

    addCurrent() {
      const current = this.current();

      if (!current) {
        alert(TEXT.loginRequired);
        return false;
      }

      if (this.exists(current)) {
        alert(TEXT.alreadySaved);
        return false;
      }

      const accounts = this.load();

      accounts.push({
        id: current.id || "",
        nick: current.nick,
        avatar: current.avatar || ""
      });

      this.save(accounts);
      return true;
    },

    remove(account) {
      const accounts = this.load();
      const filtered = accounts.filter((saved) => !this.isSame(saved, account));
      this.save(filtered);
    },

    removeCurrent() {
      const current = this.current();

      if (!current) {
        alert(TEXT.noActiveSession);
        return false;
      }

      const accounts = this.load();
      const filtered = accounts.filter((saved) => !this.isSame(saved, current));

      if (filtered.length === accounts.length) {
        alert(TEXT.notSaved);
        return false;
      }

      this.save(filtered);
      return true;
    },

    activeIndex(accounts, current) {
      if (!current) return -1;
      return accounts.findIndex((account) => this.isSame(account, current));
    }
  };

  const Auth = {
    logoutUrl() {
      const logout = get(SELECTORS.logout, { required: false });

      if (
        logout &&
        logout.href &&
        logout.href.includes("logout=1") &&
        logout.href.includes("key=")
      ) {
        return logout.href;
      }

      const links = Array.from(document.getElementsByTagName("a"));

      const found = links.find((link) => {
        const href = link.href || "";
        return href.includes("logout=1") && href.includes("key=");
      });

      return found ? found.href : "";
    },

    switchTo(account) {
      sessionStorage.setItem(KEYS.prefill, account.nick);

      const logoutUrl = this.logoutUrl();

      window.location.href = logoutUrl || "/login";
    },

    prefillLogin() {
      const username = sessionStorage.getItem(KEYS.prefill);

      if (!username) return;

      const input =
        get('input[name="username"]', { required: false }) ||
        get("#username", { required: false }) ||
        get('input[name="login_username"]', { required: false });

      if (!input) return;

      input.value = username;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.focus();

      sessionStorage.removeItem(KEYS.prefill);
    }
  };

  const UI = {
    get() {
      return {
        button: get(SELECTORS.button, { required: false }),
        panel: get(SELECTORS.panel, { required: false }),
        list: get(SELECTORS.list, { required: false }),
        accountTemplate: get(SELECTORS.accountTemplate, { required: false }),
        emptyTemplate: get(SELECTORS.emptyTemplate, { required: false }),
        saveButton: get(SELECTORS.saveButton, { required: false }),
        deleteCurrentButton: get(SELECTORS.deleteCurrentButton, { required: false })
      };
    },

    hasRequired(ui) {
      return (
        ui.button &&
        ui.panel &&
        ui.list &&
        ui.accountTemplate &&
        ui.emptyTemplate
      );
    },

    emptyItem(isGuest, ui) {
      const item = ui.emptyTemplate.content.firstElementChild.cloneNode(true);

      const title = item.querySelector(".pixie-switch-nick");
      const sub = item.querySelector(".pixie-switch-sub");

      if (title) title.textContent = TEXT.emptyTitle;
      if (sub) sub.textContent = isGuest ? TEXT.emptyGuest : TEXT.emptyUser;

      return item;
    },

    accountItem(account, isActive, ui) {
      const item = ui.accountTemplate.content.firstElementChild.cloneNode(true);

      const avatar = item.querySelector(".pixie-switch-avatar");
      const nick = item.querySelector(".pixie-switch-nick");
      const sub = item.querySelector(".pixie-switch-sub");
      const deleteButton = item.querySelector(".pixie-switch-delete");

      if (avatar) {
        avatar.src = account.avatar || DEFAULT_AVATAR;
        avatar.alt = "";
      }

      if (nick) nick.textContent = account.nick;
      if (sub) sub.textContent = isActive ? TEXT.active : TEXT.switch;

      if (deleteButton) {
        deleteButton.setAttribute("aria-label", "Eliminar " + account.nick);

        deleteButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (!confirm(TEXT.confirmDelete)) return;

          Accounts.remove(account);
          this.render();
        });
      }

      if (isActive) {
        item.classList.add("pixie-switch-active");
      } else {
        item.addEventListener("click", (event) => {
          if (event.target === deleteButton) return;
          Auth.switchTo(account);
        });
      }

      return item;
    },

    render() {
      const ui = this.get();

      if (!this.hasRequired(ui)) {
        log(TEXT.missingHtml);
        return;
      }

      const current = Accounts.current();
      const isGuest = !current;
      const isCurrentSaved = current ? Accounts.exists(current) : false;

      if (ui.saveButton) {
        ui.saveButton.textContent = TEXT.save;
        ui.saveButton.hidden = isGuest || isCurrentSaved;
      }

      if (ui.deleteCurrentButton) {
        ui.deleteCurrentButton.hidden = isGuest || !isCurrentSaved;
      }

      const accounts = Accounts.load();
      const activeIndex = Accounts.activeIndex(accounts, current);

      if (activeIndex > -1) {
        const active = accounts.splice(activeIndex, 1)[0];

        accounts.sort((a, b) =>
          String(a.nick).localeCompare(String(b.nick), "es", { sensitivity: "base" })
        );

        accounts.unshift(active);
      } else {
        accounts.sort((a, b) =>
          String(a.nick).localeCompare(String(b.nick), "es", { sensitivity: "base" })
        );
      }

      ui.list.innerHTML = "";

      if (!accounts.length) {
        ui.list.appendChild(this.emptyItem(isGuest, ui));
        return;
      }

      accounts.forEach((account) => {
        ui.list.appendChild(
          this.accountItem(account, current && Accounts.isSame(account, current), ui)
        );
      });
    },

    bind() {
      const ui = this.get();

      if (!this.hasRequired(ui)) {
        log(TEXT.missingHtml);
        return false;
      }

      ui.button.addEventListener("click", () => {
        this.render();
      });

      ui.panel.addEventListener("click", (event) => {
        const actionButton = event.target.closest
          ? event.target.closest("[data-pixie-switch-action]")
          : null;

        if (!actionButton) return;

        const action = actionButton.getAttribute("data-pixie-switch-action");

        if (action === "save") {
          if (Accounts.addCurrent()) this.render();
          return;
        }

        if (action === "delete-current") {
          if (!confirm(TEXT.confirmDeleteCurrent)) return;
          if (Accounts.removeCurrent()) this.render();
        }
      });

      return true;
    },

    init() {
      Auth.prefillLogin();

      if (!this.bind()) return;

      this.render();
    }
  };

  ready(() => UI.init());

  return {
    init() {
      UI.init();
    },

    render() {
      UI.render();
    },

    getAccounts() {
      return Accounts.load();
    },

    clearAccounts() {
      Accounts.save([]);
      UI.render();
    }
  };
});
