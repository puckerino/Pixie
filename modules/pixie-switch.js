const PixieSwitch = PixieKit("PixieSwitch", function ({
  ready,
  get,
  create,
  storage,
  user,
  isLogged,
  log
}) {
  const OPTIONS = Object.freeze({
    autoLogin: true,
    confirmSwitch: true
  });

  const KEYS = Object.freeze({
    accounts: "pixie_switch_accounts_v2",
    pendingAuth: "pixie_switch_pending_auth",
    prefill: "pixie_switch_prefill_username"
  });

  const SELECTORS = Object.freeze({
    button: "#pixie-switch-button",
    panel: "#pixie-switch-panel",
    list: "#pixie-switch-list",
    loginForm: "#pixie-switch-login-form",
    accountTemplate: "#pixie-switch-account-template",
    emptyTemplate: "#pixie-switch-empty-template",
    saveButton: '[data-pixie-switch-action="save"]',
    deleteCurrentButton: '[data-pixie-switch-action="delete-current"]',
    logout: "#logout"
  });

  const TEXT = Object.freeze({
    add: "Añadir cuenta",
    save: "Guardar cuenta",
    active: "Activa",
    autoSwitch: "Cambiar automáticamente",
    prefillSwitch: "Cerrar sesión y preparar login",
    emptyTitle: "Sin cuentas guardadas",
    emptyGuest: "Añade una cuenta para usar PixieSwitch.",
    emptyUser: "Pulsa “Guardar cuenta” para añadir la cuenta actual.",
    alreadySaved: "Esa cuenta ya está guardada.",
    loginFailed: "No se pudo iniciar sesión con esa cuenta.",
    missingHtml: "Falta el HTML base de PixieSwitch.",
    confirmSwitch: "¿Cambiar a {username}?",
    confirmDelete: "¿Eliminar esta cuenta?",
    confirmDeleteCurrent: "¿Borrar la cuenta actual de la lista?"
  });

  const DEFAULT_AVATAR =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23333'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23fff'%3E%3F%3C/text%3E%3C/svg%3E";

  const accountStore = storage(KEYS.accounts);

  const Utils = {
    normalize(value) {
      return String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    },

    format(text, values) {
      return String(text).replace(/\{(\w+)\}/g, function (_, key) {
        return values && values[key] != null ? values[key] : "";
      });
    },

    encodePassword(password) {
      return btoa(unescape(encodeURIComponent(password)));
    },

    decodePassword(password) {
      return decodeURIComponent(escape(atob(password)));
    }
  };

  const Session = {
    get(key) {
      try {
        const raw = sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        sessionStorage.removeItem(key);
        return null;
      }
    },

    set(key, value) {
      sessionStorage.setItem(key, JSON.stringify(value));
    },

    remove(key) {
      sessionStorage.removeItem(key);
    }
  };

  const Accounts = {
    load() {
      const accounts = accountStore.get([]);

      if (!Array.isArray(accounts)) return [];

      return accounts
        .filter((account) => account && account.nick)
        .map((account) => ({
          id: String(account.id || ""),
          nick: String(account.nick || "").trim(),
          avatar: String(account.avatar || ""),
          password: String(account.password || "")
        }));
    },

    save(accounts) {
      accountStore.set(accounts || []);
    },

    current() {
      if (!isLogged()) return null;

      const currentUser = user();

      if (!currentUser || !currentUser.name) return null;

      return {
        id: currentUser.id ? String(currentUser.id) : "",
        nick: currentUser.name,
        avatar: currentUser.avatar || ""
      };
    },

    isSame(a, b) {
      if (!a || !b) return false;

      const idA = String(a.id || "");
      const idB = String(b.id || "");

      if (idA && idB && idA === idB) return true;

      return Utils.normalize(a.nick) === Utils.normalize(b.nick);
    },

    exists(account) {
      return this.load().some((saved) => this.isSame(saved, account));
    },

    add(account) {
      if (!account || !account.nick) return false;

      const accounts = this.load();

      if (accounts.some((saved) => this.isSame(saved, account))) {
        alert(TEXT.alreadySaved);
        return false;
      }

      accounts.push(account);
      this.save(accounts);
      return true;
    },

    remove(account) {
      const accounts = this.load();
      const filtered = accounts.filter((saved) => !this.isSame(saved, account));

      this.save(filtered);
    },

    addCurrent(encodedPassword = "") {
      const current = this.current();

      if (!current) return false;

      return this.add({
        id: current.id || "",
        nick: current.nick,
        avatar: current.avatar || "",
        password: encodedPassword || ""
      });
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

    submitLogin(username, encodedPassword) {
      const form = create("form", {
        attrs: {
          method: "post",
          action: "/login"
        }
      });

      form.style.display = "none";

      const usernameInput = create("input", {
        attrs: {
          type: "text",
          name: "username",
          value: username
        }
      });

      const passwordInput = create("input", {
        attrs: {
          type: "password",
          name: "password",
          value: Utils.decodePassword(encodedPassword)
        }
      });

      const autologinInput = create("input", {
        attrs: {
          type: "checkbox",
          name: "autologin",
          value: "on"
        }
      });

      autologinInput.checked = true;

      const loginInput = create("input", {
        attrs: {
          type: "submit",
          name: "login",
          value: "Conectarse"
        }
      });

      form.append(usernameInput, passwordInput, autologinInput, loginInput);
      document.body.appendChild(form);
      form.submit();
    },

    start(action, username, encodedPassword) {
      Session.set(KEYS.pendingAuth, {
        action,
        username,
        password: encodedPassword,
        attempted: false
      });

      if (isLogged()) {
        window.location.href = this.logoutUrl() || "/login";
        return;
      }

      this.continue();
    },

    continue() {
      const pending = Session.get(KEYS.pendingAuth);

      if (!pending || !pending.username || !pending.password) {
        Session.remove(KEYS.pendingAuth);
        return;
      }

      if (isLogged()) {
        if (pending.action === "save") {
          Accounts.addCurrent(pending.password);
        }

        Session.remove(KEYS.pendingAuth);
        return;
      }

      if (pending.attempted) {
        Session.remove(KEYS.pendingAuth);
        alert(TEXT.loginFailed);
        return;
      }

      pending.attempted = true;
      Session.set(KEYS.pendingAuth, pending);

      this.submitLogin(pending.username, pending.password);
    }
  };

  const UI = {
    get() {
      return {
        button: get(SELECTORS.button, { required: false }),
        panel: get(SELECTORS.panel, { required: false }),
        list: get(SELECTORS.list, { required: false }),
        loginForm: get(SELECTORS.loginForm, { required: false }),
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
        ui.loginForm &&
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

      if (avatar) avatar.src = account.avatar || DEFAULT_AVATAR;
      if (nick) nick.textContent = account.nick;

      if (sub) {
        sub.textContent = isActive
          ? TEXT.active
          : OPTIONS.autoLogin && account.password
            ? TEXT.autoSwitch
            : TEXT.prefillSwitch;
      }

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
          this.switchTo(account);
        });
      }

      return item;
    },

    switchTo(account) {
      if (
        OPTIONS.confirmSwitch &&
        !confirm(Utils.format(TEXT.confirmSwitch, { username: account.nick }))
      ) {
        return;
      }

      if (OPTIONS.autoLogin && account.password) {
        Auth.start("switch", account.nick, account.password);
        return;
      }

      sessionStorage.setItem(KEYS.prefill, account.nick);
      window.location.href = Auth.logoutUrl() || "/login";
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
    },

    showLoginForm() {
      const ui = this.get();

      if (!ui.loginForm) return;

      ui.loginForm.hidden = !ui.loginForm.hidden;

      if (!ui.loginForm.hidden) {
        const usernameInput = ui.loginForm.querySelector('input[name="username"]');
        if (usernameInput) usernameInput.focus();
      }
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
        ui.saveButton.textContent = OPTIONS.autoLogin ? TEXT.add : TEXT.save;
        ui.saveButton.hidden = isGuest && !OPTIONS.autoLogin;
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
          if (OPTIONS.autoLogin) {
            this.showLoginForm();
          } else {
            Accounts.addCurrent("");
            this.render();
          }

          return;
        }

        if (action === "delete-current") {
          if (!confirm(TEXT.confirmDeleteCurrent)) return;

          const current = Accounts.current();

          if (current) {
            Accounts.remove(current);
            this.render();
          }
        }
      });

      ui.loginForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const username = ui.loginForm.elements.username.value.trim();
        const password = ui.loginForm.elements.password.value;

        if (!username || !password) return;

        Auth.start("save", username, Utils.encodePassword(password));
      });

      return true;
    },

    init() {
      Auth.continue();
      this.prefillLogin();

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
    },

    options: OPTIONS
  };
});
