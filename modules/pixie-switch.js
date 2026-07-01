const PixieSwitch = PixieKit("PixieSwitch", function ({
  ready,
  get,
  warn,
  mergeOptions
}) {
  const defaults = {
    autoLogin: false,
    confirmSwitch: true
  };

  const options = mergeOptions(defaults);

  const storage = {
    accounts: "pixie_switch_accounts_v1",
    prefill: "pixie_switch_prefill_username",
    pendingLogin: "pixie_switch_pending_login"
  };

  window.PIXIE_SWITCH_VERSION = "PixieSwitch-v1.6";

  const AccountManager = {
    load() {
      try {
        const data = JSON.parse(localStorage.getItem(storage.accounts) || "[]");
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

    save(accounts) {
      try {
        localStorage.setItem(storage.accounts, JSON.stringify(accounts || []));
        return true;
      } catch (error) {
        alert("No se pudo guardar la cuenta. Puede que el almacenamiento esté bloqueado o lleno.");
        return false;
      }
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

    getLogoutUrl() {
      const logout = get("#logout");

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
      const img = get("#fa_usermenu img");
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
          id: window._userdata && _userdata.user_id ? String(_userdata.user_id) : "",
          nick: nickAlt,
          avatar
        };
      }

      const welcome = get("#fa_welcome");
      if (!welcome) return null;

      const nickText = String(welcome.textContent || "")
        .replace(/\u00a0/g, " ")
        .replace(/bienvenido\/a\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!nickText) return null;

      return {
        id: window._userdata && _userdata.user_id ? String(_userdata.user_id) : "",
        nick: nickText,
        avatar
      };
    },

    prefillUsername() {
      const username = sessionStorage.getItem(storage.prefill);
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

      sessionStorage.removeItem(storage.prefill);
    },

    submitPendingLogin() {
      const raw = sessionStorage.getItem(storage.pendingLogin);
      if (!raw) return;

      let pending;

      try {
        pending = JSON.parse(raw);
      } catch (error) {
        sessionStorage.removeItem(storage.pendingLogin);
        return;
      }

      if (!pending || !pending.nick || !pending.password) {
        sessionStorage.removeItem(storage.pendingLogin);
        return;
      }

      const form = document.createElement("form");
      form.method = "post";
      form.action = "/login";
      form.style.display = "none";

      const username = document.createElement("input");
      username.type = "text";
      username.name = "username";
      username.value = pending.nick;

      const password = document.createElement("input");
      password.type = "password";
      password.name = "password";
      password.value = this.decodePassword(pending.password);

      const autologin = document.createElement("input");
      autologin.type = "checkbox";
      autologin.name = "autologin";
      autologin.checked = true;
      autologin.value = "on";

      const login = document.createElement("input");
      login.type = "submit";
      login.name = "login";
      login.value = "Conectarse";

      form.appendChild(username);
      form.appendChild(password);
      form.appendChild(autologin);
      form.appendChild(login);

      document.body.appendChild(form);
      sessionStorage.removeItem(storage.pendingLogin);

      form.submit();
    },

    getAccountIdFromHtml(html) {
      const match = html.match(/_userdata\["user_id"\]\s*=\s*(\d+)/);
      return match ? match[1] : "";
    },

    getAvatarFromHtml(html) {
      const match = html.match(/_userdata\["avatar"\]\s*=\s*"(.+?)";/);
      return match ? match[1].replace(/\\"/g, '"') : "";
    },

    getUsernameFromHtml(html) {
      const match = html.match(/_userdata\["username"\]\s*=\s*"(.+?)";/);
      return match ? match[1].replace(/\\"/g, '"') : "";
    },

    login(username, password) {
      const body = new URLSearchParams();

      body.set("username", username);
      body.set("password", password);
      body.set("autologin", "on");
      body.set("login", "Conectarse");

      return fetch("/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      }).then((response) => response.text());
    },

    isCurrentSaved(accounts, currentAccount) {
      const currentUsername = currentAccount
        ? this.normalizeUsername(currentAccount.nick)
        : "";

      const currentId = currentAccount && currentAccount.id
        ? String(currentAccount.id)
        : "";

      return accounts.some((account) => {
        return (
          (currentId && account.id === currentId) ||
          this.normalizeUsername(account.nick) === currentUsername
        );
      });
    },

    findActiveIndex(accounts, currentAccount) {
      if (!currentAccount) return -1;

      const currentUsername = this.normalizeUsername(currentAccount.nick);
      const currentId = currentAccount.id ? String(currentAccount.id) : "";

      return accounts.findIndex((account) => {
        return (
          (currentId && account.id === currentId) ||
          (currentUsername && this.normalizeUsername(account.nick) === currentUsername)
        );
      });
    },

    removeCurrent() {
      const currentAccount = this.getCurrent();

      if (!currentAccount) {
        alert("No hay sesión activa que borrar.");
        return false;
      }

      const accounts = this.load();
      const currentUsername = this.normalizeUsername(currentAccount.nick);
      const currentId = currentAccount.id ? String(currentAccount.id) : "";

      const filtered = accounts.filter((account) => {
        return !(
          (currentId && account.id === currentId) ||
          this.normalizeUsername(account.nick) === currentUsername
        );
      });

      if (filtered.length === accounts.length) {
        alert("Esa cuenta no estaba guardada.");
        return false;
      }

      this.save(filtered);
      return true;
    },

    removeSaved(account) {
      const accounts = this.load();
      const targetUsername = this.normalizeUsername(account.nick);
      const targetId = String(account.id || "");
      const targetAvatar = String(account.avatar || "");

      const filtered = accounts.filter((savedAccount) => {
        return !(
          (targetId && savedAccount.id === targetId) ||
          (
            this.normalizeUsername(savedAccount.nick) === targetUsername &&
            String(savedAccount.avatar || "") === targetAvatar
          )
        );
      });

      this.save(filtered);
    },

    saveCurrent() {
      const currentAccount = this.getCurrent();

      if (!currentAccount) {
        alert("Primero inicia sesión para poder guardar la cuenta.");
        return false;
      }

      const accounts = this.load();

      if (this.isCurrentSaved(accounts, currentAccount)) {
        alert("Esa cuenta ya está guardada.");
        return false;
      }

      accounts.push({
        id: currentAccount.id || "",
        nick: currentAccount.nick,
        avatar: currentAccount.avatar || "",
        password: ""
      });

      this.save(accounts);
      return true;
    },

    saveWithLogin(form) {
      const username = form.elements.username.value.trim();
      const password = form.elements.password.value;

      if (!username || !password) return;

      this.login(username, password)
        .then((html) => {
          const id = this.getAccountIdFromHtml(html);
          const parsedUsername = this.getUsernameFromHtml(html) || username;
          const avatar = this.getAvatarFromHtml(html);

          if (!id) {
            alert("No se pudo iniciar sesión con esa cuenta.");
            return;
          }

          const accounts = this.load();

          const alreadyExists = accounts.some((account) => {
            return (
              account.id === id ||
              this.normalizeUsername(account.nick) === this.normalizeUsername(parsedUsername)
            );
          });

          if (alreadyExists) {
            alert("Esa cuenta ya está guardada.");
            return;
          }

          accounts.push({
            id,
            nick: parsedUsername,
            avatar,
            password: this.encodePassword(password)
          });

          this.save(accounts);
          window.location.reload();
        })
        .catch(() => {
          alert("No se pudo iniciar sesión.");
        });
    },

    switchTo(account) {
      if (
        options.confirmSwitch &&
        !confirm("¿Cambiar a " + account.nick + "?")
      ) {
        return;
      }

      if (options.autoLogin && account.password) {
        sessionStorage.setItem(
          storage.pendingLogin,
          JSON.stringify({
            nick: account.nick,
            password: account.password
          })
        );

        const logoutUrl = this.getLogoutUrl();
        window.location.href = logoutUrl || "/login";
        return;
      }

      sessionStorage.setItem(storage.prefill, account.nick);

      const logoutUrl = this.getLogoutUrl();
      window.location.href = logoutUrl || "/login";
    }
  };

  const SwitchUI = {
    get() {
      return {
        button: get("#pixie-switch-button"),
        panel: get("#pixie-switch-panel"),
        list: get("#pixie-switch-list"),
        loginForm: get("#pixie-switch-login-form"),
        accountTemplate: get("#pixie-switch-account-template"),
        emptyTemplate: get("#pixie-switch-empty-template"),
        saveButton: get('[data-pixie-switch-action="save"]'),
        deleteCurrentButton: get('[data-pixie-switch-action="delete-current"]')
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

    getDefaultAvatar() {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23333'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23fff'%3E%3F%3C/text%3E%3C/svg%3E";
    },

    createEmptyState(isGuest, ui) {
      const item = ui.emptyTemplate.content.firstElementChild.cloneNode(true);
      const description = item.querySelector(".pixie-switch-sub");

      description.textContent = isGuest
        ? "Inicia sesión y guarda tus multicuentas."
        : "Pulsa “Guardar cuenta” para añadir la cuenta actual.";

      return item;
    },

    createAccountCard(account, isActive, ui) {
      const item = ui.accountTemplate.content.firstElementChild.cloneNode(true);

      const avatar = item.querySelector(".pixie-switch-avatar");
      const username = item.querySelector(".pixie-switch-nick");
      const status = item.querySelector(".pixie-switch-sub");
      const deleteButton = item.querySelector(".pixie-switch-delete");

      avatar.src = account.avatar || this.getDefaultAvatar();
      username.textContent = account.nick;

      status.textContent = isActive
        ? "Activa"
        : options.autoLogin && account.password
          ? "Cambiar automáticamente"
          : "Cerrar sesión y preparar login";

      deleteButton.setAttribute("aria-label", "Eliminar " + account.nick);

      if (isActive) {
        item.classList.add("pixie-switch-active");
      } else {
        item.addEventListener("click", (event) => {
          if (event.target === deleteButton) return;
          AccountManager.switchTo(account);
        });
      }

      deleteButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!confirm("¿Eliminar esta cuenta?")) return;

        AccountManager.removeSaved(account);
        this.render();
      });

      return item;
    },

    render() {
      const ui = this.get();

      if (!this.hasRequired(ui)) {
        warn("Falta el HTML base o los templates de PixieSwitch.");
        return;
      }

      const currentAccount = AccountManager.getCurrent();
      const isGuest = !currentAccount;
      const accounts = AccountManager.load();
      const isSaved = !isGuest && AccountManager.isCurrentSaved(accounts, currentAccount);

      if (ui.saveButton) {
        ui.saveButton.hidden = isGuest && !options.autoLogin;
        ui.saveButton.textContent = options.autoLogin
          ? "Añadir cuenta"
          : "Guardar cuenta";
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

    bindEvents() {
      const ui = this.get();

      if (!this.hasRequired(ui)) {
        warn("Falta el HTML base o los templates de PixieSwitch.");
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
          if (options.autoLogin) {
            this.showLoginForm();
          } else {
            if (AccountManager.saveCurrent()) this.render();
          }

          return;
        }

        if (action === "delete-current") {
          if (!confirm("¿Borrar la cuenta actual de la lista?")) return;
          if (AccountManager.removeCurrent()) this.render();
        }
      });

      ui.loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        AccountManager.saveWithLogin(ui.loginForm);
      });

      return true;
    },

    init() {
      AccountManager.submitPendingLogin();
      AccountManager.prefillUsername();

      if (!this.bindEvents()) return;

      this.render();
    }
  };

  ready(() => SwitchUI.init());
});
