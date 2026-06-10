/*!
 * PixieTheme.js
 * Cambia entre tema claro y oscuro usando color-scheme
 * Requiere: pixiekit.js + lucide
 * Versión: 0.1.0
 */

const PixieTheme = PixieKit("Theme", function (_) {
  const config = {
    key: "pixie-theme",
    button: "#themeToggle",
    attr: "data-theme",

    light: {
      name: "light",
      icon: "sun",
      label: "Cambiar a modo oscuro"
    },

    dark: {
      name: "dark",
      icon: "moon",
      label: "Cambiar a modo claro"
    }
  };

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? config.dark.name
      : config.light.name;
  }

  function getTheme() {
    return localStorage.getItem(config.key) || systemTheme();
  }

  function setTheme(theme) {
    const next = theme === config.dark.name
      ? config.dark.name
      : config.light.name;

    document.documentElement.setAttribute(config.attr, next);
    document.documentElement.style.colorScheme = next;

    localStorage.setItem(config.key, next);

    updateButton(next);
  }

  function toggleTheme() {
    const current = getTheme();
    const next = current === config.dark.name
      ? config.light.name
      : config.dark.name;

    setTheme(next);
  }

  function updateButton(theme) {
    const btn = _.get(config.button, { required: false });
    if (!btn) return;

    const nextData = theme === config.dark.name
      ? config.dark
      : config.light;

    btn.innerHTML = `<i data-lucide="${nextData.icon}"></i>`;
    btn.setAttribute("aria-label", nextData.label);
    btn.setAttribute("tooltip", nextData.label);

    _.icons();
  }

  function bindButton() {
    const btn = _.get(config.button, { required: false });
    if (!btn) return;

    btn.addEventListener("click", toggleTheme);
  }

  function init() {
    const theme = getTheme();

    document.documentElement.setAttribute(config.attr, theme);
    document.documentElement.style.colorScheme = theme;

    updateButton(theme);
    bindButton();
  }

  _.ready(init);

  return {
    init,
    getTheme,
    setTheme,
    toggleTheme
  };
});
