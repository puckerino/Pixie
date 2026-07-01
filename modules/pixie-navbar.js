/*!
 * PixieNavbar.js
 * Requiere: pixiekit.js + lucide
 * Versión: 0.2.2
 */

const PixieNavbar = PixieKit("Navbar", function (_) {

  const config = {
    profileLink: ".link-perfil",
    avatarBox: ".avatar-nav",
    usernameBox: ".username",

    userNav: ".user-nav",
    adminNav: ".admin-nav",

    notifList: "#notif_list",
    notifTarget: "#notis"
  };

  function hydrateVisibility() {
    const userNav = _.get(config.userNav, { required: false });
    const adminNav = _.get(config.adminNav, { required: false });

    if (!_.isLogged()) {
      if (userNav) userNav.hidden = true;
      if (adminNav) adminNav.hidden = true;
      return;
    }

    if (userNav) userNav.hidden = false;
  }

  function hydrateUser() {
    const user = _.user();

    const profileLink = _.get(config.profileLink, { required: false });
    const avatarBox = _.get(config.avatarBox, { required: false });
    const usernameBox = _.get(config.usernameBox, { required: false });

    if (profileLink && user.id) {
      profileLink.href = `/u${user.id}`;
    }

    if (usernameBox) {
      usernameBox.textContent = user.name ?? "";
    }

    if (avatarBox) {
      avatarBox.innerHTML = user.avatar
        ? `
          <img
            src="${user.avatar}"
            alt="${user.name ?? ""}"
            loading="lazy"
          >
        `
        : "";
    }
  }

  function hydrateAdmin() {
    const adminNav = _.get(config.adminNav, { required: false });

    if (!adminNav) return;

    if (window._userdata?.user_level !== 1) {
      adminNav.remove();
      return;
    }

    if (adminNav.dataset.pixieReady === "true") return;

    adminNav.innerHTML = `
      <a href="/admin" tooltip="Panel de administración">
        <i data-lucide="shield"></i>
        ACP
      </a>
    `;

    adminNav.hidden = false;
    adminNav.dataset.pixieReady = "true";

    _.icons();
  }

  function moveNotifications() {
    _.waitFor(config.notifList, { timeout: 10000 })

      .then(function (notifList) {
        const target = _.get(config.notifTarget, { required: false });

        if (!target) return;

        target.appendChild(notifList);
      })

      .catch(function () {
        _.log("No he encontrado la lista de notificaciones.");
      });
  }

  function init() {
    hydrateVisibility();

    if (_.isLogged()) {
      hydrateUser();
      hydrateAdmin();
      moveNotifications();
    }

    _.icons();
  }

  _.ready(init);

  return {
    init,
    hydrateVisibility,
    hydrateUser,
    hydrateAdmin,
    moveNotifications
  };

});
