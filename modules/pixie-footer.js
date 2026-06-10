/*!
 * PixieFooter.js
 * Inserta estadísticas, usuarios conectados y grupos en el footer
 * Requiere: pixiekit.js
 * Versión: 0.4.0
 */

const PixieFooter = PixieKit("Footer", function (_) {

  const config = {
    target: "[data-pixie-footer]",
    source: "#footer-online",
    groups: ".group-legend",

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

  function cleanUserList(html, title) {
    if (!html) return "";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;

    wrapper.querySelectorAll("br").forEach(function (br) {
      br.remove();
    });

    let content = wrapper.innerHTML
      .replace(/^.*?:/i, "")
      .trim();

    content = content.replace(/,\s*/g, "");

    if (!content) return "";

    return `
      <div class="pixie-footer-users">
        <h4>${title}</h4>

        <div class="pixie-footer-user-list">
          ${content}
        </div>
      </div>
    `;
  }

  function getOnlineData() {
    return {
      stats: parseOnlineStats(),
      onlineUsers: cloneInner(`${config.source} #online_users`),
      lastConnected: cloneInner(`${config.source} #last_connected`)
    };
  }

  function getGroups() {
    const legend = _.get(config.groups, { required: false });
    if (!legend) return [];

    return _.getAll('a[href^="/g"]', legend).map(function (link) {
      const title = link.getAttribute("title") || "";
      const match = title.match(/Miembros del Grupo\s*:\s*(\d+)/i);

      const name = (link.textContent || "")
        .replace(/\s+/g, " ")
        .trim();

      return {
        name,
        href: link.href,
        color: link.style.color || "",
        count: match ? Number(match[1]) : null
      };
    });
  }

  function renderGroups(groups) {
    if (!groups.length) return "";

    return `
      <section class="pixie-footer-groups">
        <h4>GRUPOS</h4>

        <div class="pixie-footer-group-list">
          ${groups.map(function (group) {
            return `
              <a
                href="${group.href}"
                class="pixie-footer-group"
                style="${group.color ? `--group-color:${group.color};` : ""}"
              >
                <span>${group.name}</span>
                ${group.count !== null ? `<strong>${group.count}</strong>` : ""}
              </a>
            `;
          }).join("")}
        </div>
      </section>
    `;
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

        ${cleanUserList(
          data.onlineUsers,
          "CONECTADOS AHORA"
        )}

        ${cleanUserList(
          data.lastConnected,
          "CONECTADOS EN LAS ÚLTIMAS 24H"
        )}

      </section>
    `;
  }

  async function init() {
    const target = _.get(config.target, { required: false });
    if (!target) return;

    const vars = await _.forumVars(config.vars);
    const onlineData = getOnlineData();
    const groups = getGroups();

    target.innerHTML = `
      ${renderStats(vars)}
      ${renderOnline(onlineData)}
      ${renderGroups(groups)}
    `;
  }

  _.ready(init);

  return {
    init,
    getOnlineData,
    getGroups,
    renderStats,
    renderOnline,
    renderGroups,
    cleanUserList
  };

});
