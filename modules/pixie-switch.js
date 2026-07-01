(function () {
  window.PIXIE_SWITCH_VERSION = "PixieSwitch-v1.2";

  var PIXIE_SWITCH_STORAGE = "pixie_switch_accounts_v1";
  var PIXIE_SWITCH_PREFILL = "pixie_switch_prefill_username";

  var PIXIE_SWITCH_OPTIONS = {
    autoLogin: false,
    confirmSwitch: true
  };

  function loadAccounts() {
    try {
      var data = JSON.parse(localStorage.getItem(PIXIE_SWITCH_STORAGE) || "[]");
      if (!Array.isArray(data)) return [];

      return data
        .filter(function (account) {
          return account && typeof account.nick === "string" && account.nick.trim();
        })
        .map(function (account) {
          return {
            id: String(account.id || ""),
            nick: String(account.nick || "").trim(),
            avatar: String(account.avatar || ""),
            password: String(account.password || "")
          };
        });
    } catch (error) {
      return [];
    }
  }

  function saveAccounts(accounts) {
    try {
      localStorage.setItem(PIXIE_SWITCH_STORAGE, JSON.stringify(accounts || []));
      return true;
    } catch (error) {
      alert("No se pudo guardar la cuenta. Puede que el almacenamiento esté bloqueado o lleno.");
      return false;
    }
  }

  function normalizeUsername(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/bienvenido\/a\s*/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function encodePassword(password) {
    return btoa(unescape(encodeURIComponent(password)));
  }

  function decodePassword(password) {
    return decodeURIComponent(escape(atob(password)));
  }

  function getLogoutUrl() {
    var logout = document.getElementById("logout");

    if (
      logout &&
      logout.href &&
      logout.href.indexOf("logout=1") > -1 &&
      logout.href.indexOf("key=") > -1
    ) {
      return logout.href;
    }

    var links = document.getElementsByTagName("a");

    for (var i = 0; i < links.length; i++) {
      var href = links[i].href || "";

      if (
        href.indexOf("logout=1") > -1 &&
        href.indexOf("key=") > -1
      ) {
        return href;
      }
    }

    return "";
  }

  function getCurrentAccount() {
    var img = document.querySelector("#fa_usermenu img");
    var avatar = img && img.src ? img.src : "";

    var nickAlt = img && img.getAttribute
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
        avatar: avatar
      };
    }

    var welcome = document.getElementById("fa_welcome");
    if (!welcome) return null;

    var nickText = String(welcome.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/bienvenido\/a\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!nickText) return null;

    return {
      id: window._userdata && _userdata.user_id ? String(_userdata.user_id) : "",
      nick: nickText,
      avatar: avatar
    };
  }

  function prefillUsername() {
    var username = sessionStorage.getItem(PIXIE_SWITCH_PREFILL);
    if (!username) return;

    var input =
      document.querySelector('input[name="username"]') ||
      document.querySelector("input#username") ||
      document.querySelector('input[name="login_username"]');

    if (!input) return;

    input.value = username;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.focus();

    sessionStorage.removeItem(PIXIE_SWITCH_PREFILL);
  }

  function getDefaultAvatar() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23333'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23fff'%3E%3F%3C/text%3E%3C/svg%3E";
  }

  function getPixieSwitchUI() {
    return {
      root: document.getElementById("pixie-switch"),
      button: document.getElementById("pixie-switch-button"),
      panel: document.getElementById("pixie-switch-panel"),
      list: document.getElementById("pixie-switch-list"),
      loginForm: document.getElementById("pixie-switch-login-form"),
      accountTemplate: document.getElementById("pixie-switch-account-template"),
      emptyTemplate: document.getElementById("pixie-switch-empty-template"),
      saveButton: document.querySelector('[data-pixie-switch-action="save"]'),
      deleteCurrentButton: document.querySelector('[data-pixie-switch-action="delete-current"]')
    };
  }

  function hasRequiredUI(ui) {
    return (
      ui.root &&
      ui.button &&
      ui.panel &&
      ui.list &&
      ui.loginForm &&
      ui.accountTemplate &&
      ui.emptyTemplate
    );
  }

  function getAccountIdFromHtml(html) {
    var match = html.match(/_userdata\["user_id"\]\s*=\s*(\d+)/);
    return match ? match[1] : "";
  }

  function getAvatarFromHtml(html) {
    var match = html.match(/_userdata\["avatar"\]\s*=\s*"(.+?)";/);
    return match ? match[1].replace(/\\"/g, '"') : "";
  }

  function getUsernameFromHtml(html) {
    var match = html.match(/_userdata\["username"\]\s*=\s*"(.+?)";/);
    return match ? match[1].replace(/\\"/g, '"') : "";
  }

  function loginAccount(username, password) {
    var body = new URLSearchParams();

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
    }).then(function (response) {
      return response.text();
    });
  }

  function logoutAccount() {
    var logoutUrl = getLogoutUrl();

    if (!logoutUrl) {
      return Promise.resolve();
    }

    return fetch(logoutUrl, {
      method: "GET",
      credentials: "same-origin"
    });
  }

  function isCurrentAccountSaved(accounts, currentAccount) {
    var currentUsername = currentAccount ? normalizeUsername(currentAccount.nick) : "";
    var currentId = currentAccount && currentAccount.id ? String(currentAccount.id) : "";

    for (var i = 0; i < accounts.length; i++) {
      if (currentId && accounts[i].id === currentId) return true;
      if (normalizeUsername(accounts[i].nick) === currentUsername) return true;
    }

    return false;
  }

  function removeCurrentAccount(currentAccount) {
    var accounts = loadAccounts();
    var currentUsername = normalizeUsername(currentAccount.nick);
    var currentId = currentAccount.id ? String(currentAccount.id) : "";

    for (var i = 0; i < accounts.length; i++) {
      if (
        (currentId && accounts[i].id === currentId) ||
        normalizeUsername(accounts[i].nick) === currentUsername
      ) {
        accounts.splice(i, 1);
        saveAccounts(accounts);
        return true;
      }
    }

    return false;
  }

  function removeSavedAccount(account) {
    var accounts = loadAccounts();
    var targetUsername = normalizeUsername(account.nick);
    var targetId = String(account.id || "");
    var targetAvatar = String(account.avatar || "");

    for (var i = 0; i < accounts.length; i++) {
      if (
        (targetId && accounts[i].id === targetId) ||
        (
          normalizeUsername(accounts[i].nick) === targetUsername &&
          String(accounts[i].avatar || "") === targetAvatar
        )
      ) {
        accounts.splice(i, 1);
        break;
      }
    }

    saveAccounts(accounts);
  }

  function createEmptyState(isGuest, ui) {
    var item = ui.emptyTemplate.content.firstElementChild.cloneNode(true);
    var description = item.querySelector(".pixie-switch-sub");

    description.textContent = isGuest
      ? "Inicia sesión y guarda tus multicuentas."
      : "Pulsa “Guardar cuenta” para añadir la cuenta actual.";

    return item;
  }

  function createAccountCard(account, isActive, ui) {
    var item = ui.accountTemplate.content.firstElementChild.cloneNode(true);

    var avatar = item.querySelector(".pixie-switch-avatar");
    var username = item.querySelector(".pixie-switch-nick");
    var status = item.querySelector(".pixie-switch-sub");
    var deleteButton = item.querySelector(".pixie-switch-delete");

    avatar.src = account.avatar || getDefaultAvatar();
    username.textContent = account.nick;

    status.textContent = isActive
      ? "Activa"
      : PIXIE_SWITCH_OPTIONS.autoLogin && account.password
        ? "Cambiar automáticamente"
        : "Cerrar sesión y preparar login";

    deleteButton.setAttribute("aria-label", "Eliminar " + account.nick);

    if (isActive) {
      item.classList.add("pixie-switch-active");
    } else {
      item.addEventListener("click", function (event) {
        if (event.target === deleteButton) return;

        switchToAccount(account);
      });
    }

    deleteButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (!confirm("¿Eliminar esta cuenta?")) return;

      removeSavedAccount(account);
      renderAccounts();
    });

    return item;
  }

  function switchToAccount(account) {
    if (
      PIXIE_SWITCH_OPTIONS.confirmSwitch &&
      !confirm("¿Cambiar a " + account.nick + "?")
    ) {
      return;
    }

    if (PIXIE_SWITCH_OPTIONS.autoLogin && account.password) {
      logoutAccount()
        .then(function () {
          return loginAccount(account.nick, decodePassword(account.password));
        })
        .then(function (html) {
          var id = getAccountIdFromHtml(html);

          if (!id) {
            alert("No se pudo iniciar sesión con esa cuenta.");
            return;
          }

          window.location.reload();
        })
        .catch(function () {
          alert("No se pudo cambiar de cuenta.");
        });

      return;
    }

    sessionStorage.setItem(PIXIE_SWITCH_PREFILL, account.nick);

    var logoutUrl = getLogoutUrl();
    window.location.href = logoutUrl || "/login";
  }

  function renderAccounts() {
    var ui = getPixieSwitchUI();

    if (!hasRequiredUI(ui)) {
      console.warn("[PixieSwitch] Falta el HTML base o los templates.");
      return;
    }

    var currentAccount = getCurrentAccount();
    var isGuest = !currentAccount;
    var currentUsername = currentAccount
      ? normalizeUsername(currentAccount.nick)
      : "";
    var currentId = currentAccount && currentAccount.id
      ? String(currentAccount.id)
      : "";

    var accounts = loadAccounts();
    var isSaved = !isGuest && isCurrentAccountSaved(accounts, currentAccount);

    if (ui.saveButton) {
      ui.saveButton.hidden = isGuest && !PIXIE_SWITCH_OPTIONS.autoLogin;
    }

    if (ui.deleteCurrentButton) {
      ui.deleteCurrentButton.hidden = isGuest || !isSaved;
    }

    var activeIndex = -1;

    for (var i = 0; i < accounts.length; i++) {
      if (
        (currentId && accounts[i].id === currentId) ||
        (currentUsername && normalizeUsername(accounts[i].nick) === currentUsername)
      ) {
        activeIndex = i;
        break;
      }
    }

    var activeAccount = null;

    if (activeIndex > -1) {
      activeAccount = accounts.splice(activeIndex, 1)[0];
    }

    accounts.sort(function (a, b) {
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
      ui.list.appendChild(createEmptyState(isGuest, ui));
      return;
    }

    for (var j = 0; j < accounts.length; j++) {
      var account = accounts[j];

      var isActive =
        (currentId && account.id === currentId) ||
        (currentUsername && normalizeUsername(account.nick) === currentUsername);

      ui.list.appendChild(createAccountCard(account, isActive, ui));
    }
  }

  function saveCurrentAccount() {
    var currentAccount = getCurrentAccount();

    if (!currentAccount) {
      alert("Primero inicia sesión para poder guardar la cuenta.");
      return;
    }

    var accounts = loadAccounts();

    if (isCurrentAccountSaved(accounts, currentAccount)) {
      alert("Esa cuenta ya está guardada.");
      return;
    }

    accounts.push({
      id: currentAccount.id || "",
      nick: currentAccount.nick,
      avatar: currentAccount.avatar || "",
      password: ""
    });

    saveAccounts(accounts);
    renderAccounts();
  }

  function showLoginForm() {
    var ui = getPixieSwitchUI();

    if (!ui.loginForm) return;

    ui.loginForm.hidden = !ui.loginForm.hidden;

    if (!ui.loginForm.hidden) {
      var usernameInput = ui.loginForm.querySelector('input[name="username"]');
      if (usernameInput) usernameInput.focus();
    }
  }

  function saveAccountWithLogin(form) {
    var username = form.elements.username.value.trim();
    var password = form.elements.password.value;

    if (!username || !password) return;

    loginAccount(username, password)
      .then(function (html) {
        var id = getAccountIdFromHtml(html);
        var parsedUsername = getUsernameFromHtml(html) || username;
        var avatar = getAvatarFromHtml(html);

        if (!id) {
          alert("No se pudo iniciar sesión con esa cuenta.");
          return;
        }

        var accounts = loadAccounts();

        var alreadyExists = accounts.some(function (account) {
          return (
            account.id === id ||
            normalizeUsername(account.nick) === normalizeUsername(parsedUsername)
          );
        });

        if (alreadyExists) {
          alert("Esa cuenta ya está guardada.");
          return;
        }

        accounts.push({
          id: id,
          nick: parsedUsername,
          avatar: avatar,
          password: encodePassword(password)
        });

        saveAccounts(accounts);
        window.location.reload();
      })
      .catch(function () {
        alert("No se pudo iniciar sesión.");
      });
  }

  function deleteCurrentAccount() {
    var currentAccount = getCurrentAccount();

    if (!currentAccount) {
      alert("No hay sesión activa que borrar.");
      return;
    }

    if (!confirm("¿Borrar la cuenta actual de la lista?")) return;

    var deleted = removeCurrentAccount(currentAccount);

    if (!deleted) {
      alert("Esa cuenta no estaba guardada.");
    }

    renderAccounts();
  }

  function bindPixieSwitchEvents() {
    var ui = getPixieSwitchUI();

    if (!hasRequiredUI(ui)) {
      console.warn("[PixieSwitch] Falta el HTML base o los templates.");
      return false;
    }

    ui.button.addEventListener("click", function () {
      renderAccounts();
    });

    ui.panel.addEventListener("click", function (event) {
      var actionButton = event.target.closest
        ? event.target.closest("[data-pixie-switch-action]")
        : null;

      if (!actionButton) return;

      var action = actionButton.getAttribute("data-pixie-switch-action");

      if (action === "save") {
        if (PIXIE_SWITCH_OPTIONS.autoLogin) {
          showLoginForm();
        } else {
          saveCurrentAccount();
        }

        return;
      }

      if (action === "delete-current") {
        deleteCurrentAccount();
      }
    });

    ui.loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      saveAccountWithLogin(ui.loginForm);
    });

    return true;
  }

  function initPixieSwitch() {
    prefillUsername();

    if (!bindPixieSwitchEvents()) return;

    renderAccounts();
  }

  initPixieSwitch();
})();
