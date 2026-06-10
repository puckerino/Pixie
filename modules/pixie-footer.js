/*!
 * PixieFooter.js
 * Inserta estadísticas y usuarios conectados en el footer
 * Requiere: pixiekit.js
 * Versión: 0.2.0
 */

const PixieFooter = PixieKit("Footer", function (_) {

  const config = {
    target: "[data-pixie-footer]",
    source: "#footer-online",

    vars: [
      "FORUMCOUNTUSER",
      "FORUMCOUNTPOST",
      "FORUMLASTUSER",
      "FORUMLASTUSERLINK",
      "FORUMONLINEUSER"
    ]
  };

  function cloneInner(selector) {
    const el = _.get(selector, { required: false });
    return el ? el.innerHTML.trim() : "";
  }

  function parseOnlineStats() {
    const total = _.get(`${config.source} #total_users`, { required: false });
    if (!total) return null;

    const text = total.textContent || "";

    const numbers = text.match(/\d+/g) || [];

    return {
      html: total.innerHTML.trim(),
      total: Number(numbers[0] || 0),
      registered: Number(numbers[1] || 0),
      invisible: Number(numbers[2] || 0),
      guests: Number(numbers[3] || 0)
    };
  }

  function getOnlineData() {
    return {
      stats: parseOnlineStats(),
      onlineUsers: cloneInner(`${config.source} #online_users`),
      lastConnected: cloneInner(`${config.source} #last_connected`)
    };
  }

  function renderStats(vars) {
    return `
      <ul class="pixie-footer-stats">
        <li class="pixie-footer-stat">
          <strong>${vars.FORUMCOUNTUSER || 0}</strong>
          <span>usuarios</span>
        </li>

        <li class="pixie-footer-stat">
          <strong>${vars.FORUMCOUNTPOST || 0}</strong>
          <span>mensajes</span>
        </li>

        <li class="pixie-footer-stat">
          <strong>${vars.FORUMONLINEUSER || 0}</strong>
          <span>récord online</span>
        </li>

        <li class="pixie-footer-stat pixie-footer-lastuser">
          <span>Último usuario</span>
          <a href="${vars.FORUMLASTUSERLINK || "#"}">
            ${vars.FORUMLASTUSER || "-"}
          </a>
        </li>
      </ul>
    `;
  }

  function renderOnline(data) {
    if (!data.stats && !data.onlineUsers && !data.lastConnected) return "";

    return `
      <section class="pixie-footer-online">

        ${data.stats ? `
          <div class="pixie-footer-online-summary">
            <span>
              <strong>${data.stats.total}</strong>
              usuarios online
            </span>

            <span>
              <strong>${data.stats.registered}</strong>
              registrados
            </span>

            <span>
              <strong>${data.stats.invisible}</strong>
              ocultos
            </span>

            <span>
              <strong>${data.stats.guests}</strong>
              invitados
            </span>
          </div>
        ` : ""}

        ${data.onlineUsers ? `
          <div class="pixie-footer-online-users">
            ${data.onlineUsers}
          </div>
        ` : ""}

        ${data.lastConnected ? `
          <div class="pixie-footer-last-connected">
            ${data.lastConnected}
          </div>
        ` : ""}

      </section>
    `;
  }

  async function init() {
    const target = _.get(config.target, { required: false });
    if (!target) return;

    const vars = await _.forumVars(config.vars);
    const onlineData = getOnlineData();

    target.innerHTML = `
      ${renderStats(vars)}
      ${renderOnline(onlineData)}
    `;
  }

  _.ready(init);

  return {
    init,
    getOnlineData,
    renderStats,
    renderOnline
  };

});
