const PixieSwitch = PixieKit("PixieSwitch", function ({
  ready,
  get,
  warn
}) {
  const DEFAULTS = Object.freeze({
    autoLogin: false,
    confirmSwitch: true
  });

  let OPTIONS = Object.assign({}, DEFAULTS);

  const STORAGE = Object.freeze({
    ACCOUNTS: "pixie_switch_accounts_v1",
    PREFILL: "pixie_switch_prefill_username",
    PENDING_LOGIN: "pixie_switch_pending_login",
    PENDING_SAVE: "pixie_switch_pending_save"
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
    avatar: "#fa_usermenu img",
    welcome: "#fa_welcome",
    logout: "#logout"
  });

  const TEXT = Object.freeze({
    save: "Guardar cuenta",
    add: "Añadir cuenta",
    active: "Activa",
    autoSwitch: "Cambiar automáticamente",
    prefillSwitch: "Cerrar sesión y preparar login",
    emptyTitle: "Sin cuentas guardadas",
    emptyGuest: "Inicia sesión y guarda tus multicuentas.",
    emptyUser: "Pulsa “Guardar cuenta” para añadir la cuenta actual.",
    confirmSwitch: "¿Cambiar a {username}?",
    confirmDelete: "¿Eliminar esta cuenta?",
    confirmDeleteCurrent: "¿Borrar la cuenta actual de la lista?",
    saveError: "No se pudo guardar la cuenta. Puede que el almacenamiento esté bloqueado o lleno.",
    loginRequired: "Primero inicia sesión para poder guardar la cuenta.",
    noActiveSession: "No hay sesión activa que borrar.",
    alreadySaved: "Esa cuenta ya está guardada.",
    notSaved: "Esa cuenta no estaba guardada.",
    loginFailed: "No se pudo iniciar sesión con esa cuenta.",
    missingHtml: "Falta el HTML base o los templates de PixieSwitch."
  });

  const DEFAULT_AVATAR =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23333'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23fff'%3E%3F%3C/text%3E%3C/svg%3E";

  const Utils = {
    format(text, values) {
      return String(text || "").replace(/\{(\w+)\}/g, function (_, key) {
        return values && values[key] != null ? values[key] : "";
      });
    },

    normalizeUsername(value) {
      return String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/bienvenido\/a\s*/i, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    },

    encodePassword(password) {
      return btoa(unescape(encodeURIComponent(password)));
    },

    decodePassword(password) {
      return decodeURIComponent(escape(atob(password)));
    },

    getUserId() {
      return window._userdata && _userdata.user_id
        ? String(_userdata.user_id)
        : "";
    }
  };

  const StorageManager = {
    loadAccounts() {
      try {
        const data = JSON.parse(localStorage.getItem(STORAGE.ACCOUNTS) || "[]");

        if (!Array.isArray(data)) return [];

        return data
          .filter((account) => account && typeof account.nick === "string" && account.nick.trim())
          .map((account) => ({
            id: String(account.id || ""),
            nick: String(account.nick || "").trim(),
            avatar: String(account.avatar || ""),
            password: String(account.password || "")
          }));
      } catch (error) {
        return [];
      }
    },

    saveAccounts(accounts) {
      try {
        localStorage.setItem(STORAGE.ACCOUNTS, JSON.stringify(accounts || []));
        return true;
      } catch (error) {
        alert(TEXT.saveError);
        return false;
      }
    },

    getSessionItem(key) {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;

      try {
        return JSON.parse(raw);
      } catch (error) {
        sessionStorage.removeItem(key);
        return null;
      }
    },

    setSessionItem(key, value) {
      sessionStorage.setItem(key, JSON.stringify(value));
    },

    clearSessionItem(key) {
      sessionStorage.removeItem(key);
    },

    setPrefillUsername(username) {
      sessionStorage.setItem(STORAGE.PREFILL, username);
    },

    getPrefillUsername() {
      return sessionStorage.getItem(STORAGE.PREFILL);
    },

    clearPrefillUsername() {
      sessionStorage.removeItem(STORAGE.PREFILL);
    }
  };

  const AccountManager = {
    getLogoutUrl() {
      const logout = get(SELECTORS.logout);

      if (
        logout &&
        logout.href &&
        logout.href.includes("logout=1") &&
        logout.href.includes("key=")
      ) {
        return logout.href;
      }

      const links = document.getElementsByTagName("a");

      for (let i = 0; i < links.length; i++) {
        const href = links[i].href || "";

        if (href.includes("logout=1") && href.includes("key=")) {
          return href;
        }
      }

      return "";
    },

    getCurrent() {
      const img = get(SELECTORS.avatar);
      const avatar = img && img.src ? img.src : "";

      let nickAlt = img && img.getAttribute
        ? img.getAttribute("alt") || ""
        : "";

      nickAlt = String(nickAlt || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (nickAlt) {
        return {
          id: Utils.getUserId(),
          nick: nickAlt,
          avatar
        };
      }

      const welcome = get(SELECTORS.welcome);
      if (!welcome) return null;

      const nickText = String(welcome.textContent || "")
        .replace(/\u00a0/g, " ")
        .replace(/bienvenido\/a\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!nickText) return null;

      return {
        id: Utils.getUserId(),
        nick: nickText,
        avatar
      };
    },

    isCurrentSaved(accounts, currentAccount) {
      if (!currentAccount) return false;

      const currentUsername = Utils.normalizeUsername(currentAccount.nick);
      const currentId = currentAccount.id ? String(currentAccount.id) : "";

      return accounts.some((account) => {
        return (
          (currentId && account.id === currentId) ||
          Utils.normalizeUsername(account.nick) === currentUsername
        );
      });
    },

    findActiveIndex(accounts, currentAccount) {
      if (!currentAccount) return -1;

      const currentUsername = Utils.normalizeUsername(currentAccount.nick);
      const currentId = currentAccount.id ? String(currentAccount.id) : "";

      return accounts.findIndex((account) => {
        return (
          (currentId && account.id === currentId) ||
          (currentUsername && Utils.normalizeUsername(account.nick) === currentUsername)
        );
      });
    },

    saveCurrent(password) {
      const currentAccount = this.getCurrent();

      if (!currentAccount) {
        alert(TEXT.loginRequired);
        return false;
      }

      const accounts = StorageManager.loadAccounts();

      if (this.isCurrentSaved(accounts, currentAccount)) {
        alert(TEXT.alreadySaved);
        return false;
      }

      accounts.push({
        id: currentAccount.id || "",
        nick: currentAccount.nick,
        avatar: currentAccount.avatar || "",
        password: password ? Utils.encodePassword(password) : ""
      });

      return StorageManager.saveAccounts(accounts);
    },

    removeCurrent() {
      const currentAccount = this.getCurrent();

      if (!currentAccount) {
        alert(TEXT.noActiveSession);
        return false;
      }

      const accounts = StorageManager.loadAccounts();
      const currentUsername = Utils.normalizeUsername(currentAccount.nick);
      const currentId = currentAccount.id ? String(currentAccount.id) : "";

      const filtered = accounts.filter((account) => {
        return !(
          (currentId && account.id === currentId) ||
          Utils.normalizeUsername(account.nick) === currentUsername
        );
      });

      if (filtered.length === accounts.length) {
        alert(TEXT.notSaved);
        return false;
      }

      return StorageManager.saveAccounts(filtered);
    },

    removeSaved(account) {
      const accounts = StorageManager.loadAccounts();
      const targetUsername = Utils.normalizeUsername(account.nick);
      const targetId = String(account.id || "");
      const targetAvatar = String(account.avatar || "");

      const filtered = accounts.filter((savedAccount) => {
        return !(
          (targetId && savedAccount.id === targetId) ||
          (
            Utils.normalizeUsername(savedAccount.nick) === targetUsername &&
            String(savedAccount.avatar || "") === targetAvatar
          )
        );
      });

      return StorageManager.saveAccounts(filtered);
    },

    submitLoginForm(username, encodedPassword) {
      const passwordValue = Utils.decodePassword(encodedPassword);

      const form = document.createElement("form");
      form.method = "post";
      form.action = "/login";
      form.style.display = "none";

      const usernameInput = document.createElement("input");
      usernameInput.type = "text";
      usernameInput.name = "username";
      usernameInput.value = username;

      const passwordInput = document.createElement("input");
      passwordInput.type = "password";
      passwordInput.name = "password";
      passwordInput.value = passwordValue;

      const autologinInput = document.createElement("input");
      autologinInput.type = "checkbox";
      autologinInput.name = "autologin";
      autologinInput.checked = true;
      autologinInput.value = "on";

      const loginInput = document.createElement("input");
      loginInput.type = "submit";
      loginInput.name = "login";
      loginInput.value = "Conectarse";

      form.appendChild(usernameInput);
      form.appendChild(passwordInput);
      form.appendChild(autologinInput);
      form.appendChild(loginInput);

      document.body.appendChild(form);
      form.submit();
    },

    saveWithLogin(form) {
      const username = form.elements.username.value.trim();
      const password = form.elements.password.value;

      if (!username || !password) return;

      const encodedPassword = Utils.encodePassword(password);

      StorageManager.setSessionItem(STORAGE.PENDING_SAVE, {
        username,
        password: encodedPassword
      });

      this.submitLoginForm(username, encodedPassword);
    },

    handlePendingSave() {
      const pending = StorageManager.getSessionItem(STORAGE.PENDING_SAVE);

      if (!pending || !pending.username || !pending.password) {
        StorageManager.clearSessionItem(STORAGE.PENDING_SAVE);
        return;
      }

      const currentAccount = this.getCurrent();

      if (!currentAccount) {
        alert(TEXT.loginFailed);
        StorageManager.clearSessionItem(STORAGE.PENDING_SAVE);
        return;
      }

      const accounts = StorageManager.loadAccounts();

      if (this.isCurrentSaved(accounts, currentAccount)) {
        StorageManager.clearSessionItem(STORAGE.PENDING_SAVE);
        return;
      }

      accounts.push({
        id: currentAccount.id || "",
        nick: currentAccount.nick,
        avatar: currentAccount.avatar || "",
        password: pending.password
      });

      StorageManager.saveAccounts(accounts);
      StorageManager.clearSessionItem(STORAGE.PENDING_SAVE);
    },

    switchTo(account) {
      const confirmed =
        !OPTIONS.confirmSwitch ||
        confirm(Utils.format(TEXT.confirmSwitch, { username: account.nick }));

      if (!confirmed) return;

      if (OPTIONS.autoLogin && account.password) {
        StorageManager.setSessionItem(STORAGE.PENDING_LOGIN, {
          username: account.nick,
          password: account.password
        });

        const logoutUrl = this.getLogoutUrl();
        window.location.href = logoutUrl || "/login";
        return;
      }

      StorageManager.setPrefillUsername(account.nick);

      const logoutUrl = this.getLogoutUrl();
      window.location.href = logoutUrl || "/login";
    },

    submitPendingLogin() {
      const pending = StorageManager.getSessionItem(STORAGE.PENDING_LOGIN);

      if (!pending || !pending.username || !pending.password) {
        StorageManager.clearSessionItem(STORAGE.PENDING_LOGIN);
        return;
      }

      StorageManager.clearSessionItem(STORAGE.PENDING_LOGIN);
      this.submitLoginForm(pending.username, pending.password);
    },

    prefillUsername() {
      const username = StorageManager.getPrefillUsername();
      if (!username) return;

      const input =
        get('input[name="username"]') ||
        get("#username") ||
        get('input[name="login_username"]');

      if (!input) return;

      input.value = username;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.focus();

      StorageManager.clearPrefillUsername();
    }
  };

  const SwitchUI = {
    get() {
      return {
        button: get(SELECTORS.button),
        panel: get(SELECTORS.panel),
        list: get(SELECTORS.list),
        loginForm: get(SELECTORS.loginForm),
        accountTemplate: get(SELECTORS.accountTemplate),
        emptyTemplate: get(SELECTORS.emptyTemplate),
        saveButton: get(SELECTORS.saveButton),
        deleteCurrentButton: get(SELECTORS.deleteCurrentButton)
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

    createEmptyState(isGuest, ui) {
      const item = ui.emptyTemplate.content.firstElementChild.cloneNode(true);
      const title = item.querySelector(".pixie-switch-nick");
      const description = item.querySelector(".pixie-switch-sub");

      if (title) title.textContent = TEXT.emptyTitle;

      if (description) {
        description.textContent = isGuest
          ? TEXT.emptyGuest
          : TEXT.emptyUser;
      }

      return item;
    },

    createAccountCard(account, isActive, ui) {
      const item = ui.accountTemplate.content.firstElementChild.cloneNode(true);

      const avatar = item.querySelector(".pixie-switch-avatar");
      const username = item.querySelector(".pixie-switch-nick");
      const status = item.querySelector(".pixie-switch-sub");
      const deleteButton = item.querySelector(".pixie-switch-delete");

      if (avatar) avatar.src = account.avatar || DEFAULT_AVATAR;
      if (username) username.textContent = account.nick;

      if (status) {
        status.textContent = isActive
          ? TEXT.active
          : OPTIONS.autoLogin && account.password
            ? TEXT.autoSwitch
            : TEXT.prefillSwitch;
      }

      if (deleteButton) {
        deleteButton.setAttribute("aria-label", "Eliminar " + account.nick);
      }

      if (isActive) {
        item.classList.add("pixie-switch-active");
      } else {
        item.addEventListener("click", (event) => {
          if (event.target === deleteButton) return;
          AccountManager.switchTo(account);
        });
      }

      if (deleteButton) {
        deleteButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (!confirm(TEXT.confirmDelete)) return;

          AccountManager.removeSaved(account);
          this.render();
        });
      }

      return item;
    },

    render() {
      const ui = this.get();

      if (!this.hasRequired(ui)) {
        warn(TEXT.missingHtml);
        return;
      }

      const currentAccount = AccountManager.getCurrent();
      const isGuest = !currentAccount;
      const accounts = StorageManager.loadAccounts();
      const isSaved = !isGuest && AccountManager.isCurrentSaved(accounts, currentAccount);

      if (ui.saveButton) {
        ui.saveButton.hidden = isGuest && !OPTIONS.autoLogin;
        ui.saveButton.textContent = OPTIONS.autoLogin ? TEXT.add : TEXT.save;
      }

      if (ui.deleteCurrentButton) {
        ui.deleteCurrentButton.hidden = isGuest || !isSaved;
      }

      const activeIndex = AccountManager.findActiveIndex(accounts, currentAccount);
      let activeAccount = null;

      if (activeIndex > -1) {
        activeAccount = accounts.splice(activeIndex, 1)[0];
      }

      accounts.sort((a, b) => {
        return String(a.nick || "").localeCompare(
          String(b.nick || ""),
          "es",
          { sensitivity: "base" }
        );
      });

      if (activeAccount) {
        accounts.unshift(activeAccount);
      }

      ui.list.innerHTML = "";

      if (!accounts.length) {
        ui.list.appendChild(this.createEmptyState(isGuest, ui));
        return;
      }

      accounts.forEach((account) => {
        const isActive = AccountManager.findActiveIndex([account], currentAccount) > -1;
        ui.list.appendChild(this.createAccountCard(account, isActive, ui));
      });
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

    bindEvents(ui) {
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
          } else if (AccountManager.saveCurrent()) {
            this.render();
          }

          return;
        }

        if (action === "delete-current") {
          if (!confirm(TEXT.confirmDeleteCurrent)) return;

          if (AccountManager.removeCurrent()) {
            this.render();
          }
        }
      });

      ui.loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        AccountManager.saveWithLogin(ui.loginForm);
      });
    },

    init() {
      AccountManager.handlePendingSave();
      AccountManager.submitPendingLogin();
      AccountManager.prefillUsername();

      const ui = this.get();

      if (!this.hasRequired(ui)) {
        warn(TEXT.missingHtml);
        return;
      }

      this.bindEvents(ui);
      this.render();
    }
  };

  return function initPixieSwitch(userOptions) {
    OPTIONS = Object.assign({}, DEFAULTS, userOptions || {});
    ready(() => SwitchUI.init());
  };
});
