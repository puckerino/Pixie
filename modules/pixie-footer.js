/*!
 * PixieFooter.js
 * Inserta estadísticas básicas del foro en el footer
 * Requiere: pixiekit.js
 * Versión: 0.1.0
 */

const PixieFooter = PixieKit("Footer", function (_) {

  const config = {
    target: "[data-pixie-footer]",

    vars: [
      "FORUMCOUNTUSER",
      "FORUMCOUNTPOST",
      "FORUMLASTUSER",
      "FORUMLASTUSERLINK",
      "FORUMONLINEUSER"
    ]
  };

  function render(vars) {
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

  async function init() {
    const target = _.get(config.target, { required: false });
    if (!target) return;

    const vars = await _.forumVars(config.vars);

    target.innerHTML = render(vars);
  }

  _.ready(init);

  return {
    init,
    render
  };

});
