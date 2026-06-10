/*!
 * PixieKit.js
 * Mini toolkit para scripts de ForoActivo
 * Autor: Puck
 * Versión: 0.1.0
 */

(function (window, document) {
  "use strict";

  function PixieKit(name, factory) {
    const pixieStyle =
      "background:#c084fc;color:#fff;padding:6px 10px;border-radius:999px;font-weight:bold;";

    const _ = {
      name,

      log(message, data) {
        if (data !== undefined) {
          console.log(`%c🧚 PixieKit · ${name} · ${message}`, pixieStyle, data);
        } else {
          console.log(`%c🧚 PixieKit · ${name} · ${message}`, pixieStyle);
        }
      },

      ready(fn) {
        if (document.readyState !== "loading") fn();
        else document.addEventListener("DOMContentLoaded", fn);
      },

      get(selector, root = document, options = {}) {
        if (root && root.nodeType === undefined && typeof root === "object") {
          options = root;
          root = document;
        }

        const { required = true } = options;

        if (!root || !root.querySelector) {
          if (required) _.log(`Parent inválido para: ${selector}`);
          return null;
        }

        const el = root.querySelector(selector);

        if (!el && required) {
          _.log(`No encuentro: ${selector}`);
        }

        return el;
      },

      getAll(selector, root = document) {
        if (!root || !root.querySelectorAll) return [];
        return Array.from(root.querySelectorAll(selector));
      },

      create(tag, options = {}) {
        const el = document.createElement(tag);

        Object.entries(options).forEach(([key, value]) => {
          if (key === "class") el.className = value;
          else if (key === "text") el.textContent = value;
          else if (key === "html") el.innerHTML = value;
          else if (key === "attrs" && typeof value === "object") {
            Object.entries(value).forEach(([attr, attrValue]) => {
              el.setAttribute(attr, attrValue);
            });
          } else {
            el.setAttribute(key, value);
          }
        });

        return el;
      },

      icons() {
        if (!window.lucide) return;

        window.lucide.createIcons({
          attrs: {
            "stroke-width": 1.75
          }
        });
      },

      attr(el, name, value) {
        if (!el) return null;
        if (value === undefined) return el.getAttribute(name);
        el.setAttribute(name, value);
        return value;
      },

      addClass(el, className) {
        if (!el) return;
        el.classList.add(className);
      },

      removeClass(el, className) {
        if (!el) return;
        el.classList.remove(className);
      },

      toggleClass(el, className) {
        if (!el) return;
        el.classList.toggle(className);
      },

      isLogged() {
        return window._userdata?.session_logged_in === 1;
      },

      user() {
        return {
          id: window._userdata?.user_id || null,
          name: window._userdata?.username || "",
          avatar:
            window._userdata?.avatar_link ||
            window._userdata?.avatar ||
            "",
          color: window._userdata?.groupcolor || ""
        };
      },

      storage(key) {
        return {
          get(defaultValue = null) {
            try {
              const value = localStorage.getItem(key);
              return value ? JSON.parse(value) : defaultValue;
            } catch {
              return defaultValue;
            }
          },

          set(value) {
            try {
              localStorage.setItem(key, JSON.stringify(value));
            } catch {
              _.log(`No he podido guardar en localStorage: ${key}`);
            }
          },

          remove() {
            try {
              localStorage.removeItem(key);
            } catch {}
          },

          clear() {
            this.remove();
          }
        };
      },

      copy(text) {
        if (navigator.clipboard?.writeText) {
          return navigator.clipboard.writeText(text);
        }

        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();

        try {
          document.execCommand("copy");
        } finally {
          textarea.remove();
        }

        return Promise.resolve();
      },

      waitFor(selector, options = {}) {
        const {
          root = document,
          timeout = 5000,
          interval = 100
        } = options;

        return new Promise((resolve, reject) => {
          const found = root.querySelector(selector);

          if (found) {
            resolve(found);
            return;
          }

          const startedAt = Date.now();

          const timer = setInterval(() => {
            const el = root.querySelector(selector);

            if (el) {
              clearInterval(timer);
              resolve(el);
              return;
            }

            if (Date.now() - startedAt >= timeout) {
              clearInterval(timer);
              reject(new Error(`PixieKit: timeout esperando ${selector}`));
            }
          }, interval);
        });
      },

      popup(buttonSelector, panelSelector, options = {}) {
        const button = _.get(buttonSelector, { required: false });
        const panel = _.get(panelSelector, { required: false });

        if (!button || !panel) return;

        const {
          activeClass = "active",
          openClass = "open",
          closeOnOutside = true
        } = options;

        function open() {
          button.classList.add(activeClass);
          panel.classList.add(openClass);
        }

        function close() {
          button.classList.remove(activeClass);
          panel.classList.remove(openClass);
        }

        function toggle(event) {
          event.stopPropagation();
          button.classList.toggle(activeClass);
          panel.classList.toggle(openClass);
        }

        button.addEventListener("click", toggle);

        if (closeOnOutside) {
          document.addEventListener("click", function (event) {
            if (!button.contains(event.target) && !panel.contains(event.target)) {
              close();
            }
          });
        }

        return { open, close, toggle };
      },

      parseHTML(html) {
        return new DOMParser().parseFromString(html, "text/html");
      },

      getUserIdFromUrl(url) {
        try {
          const path = new URL(url, window.location.origin).pathname;
          const match = path.match(/\/u(\d+)(?:-|\/|$)/);
          return match ? Number(match[1]) : null;
        } catch {
          return null;
        }
      }
    };

    const plugin = factory(_);

    if (!plugin || typeof plugin !== "object") {
      _.log("El plugin no ha devuelto un objeto.");
      return {};
    }

    return plugin;
  }

  window.PixieKit = PixieKit;

})(window, document);
