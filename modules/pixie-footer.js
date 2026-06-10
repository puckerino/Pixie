const PixieFooter = PixieKit("Footer", function (_) {
  async function init() {
    const target = _.get("[data-pixie-footer]", { required: false });
    if (!target) return;

    const vars = await _.forumVars([
      "FORUMCOUNTPOST",
      "FORUMCOUNTUSER",
      "FORUMLASTUSER",
      "FORUMLASTUSERLINK"
    ]);

    target.innerHTML = `
      <ul class="pixie-footer-stats">
        <li>
          <strong>${vars.FORUMCOUNTUSER || 0}</strong>
          <span>usuarios</span>
        </li>

        <li>
          <strong>${vars.FORUMCOUNTPOST || 0}</strong>
          <span>mensajes</span>
        </li>

        <li>
          <span>Último usuario</span>
          <a href="${vars.FORUMLASTUSERLINK || "#"}">
            ${vars.FORUMLASTUSER || "-"}
          </a>
        </li>
      </ul>
    `;
  }

  _.ready(init);

  return { init };
});
