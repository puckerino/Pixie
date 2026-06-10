/*!
 * PixieNavbar.js
 * Requiere: pixiekit.js + lucide
 * Versión: 0.2.0
 */

const PixieNavbar = PixieKit("Navbar", function (_) {

  const config = {
    originalNavbar: ".original-navbar",

    profileLink: ".link-perfil",
    avatarBox: ".avatar-nav",
    usernameBox: ".username",

    userNav: ".user-nav",
    adminNav: ".admin-nav",
    guestNav: ".guest-nav",

    inboxLink: '.user-nav a[href*="/privmsg"]',
    logoutLink: '.user-nav a[href*="logout"]',

    notifList: "#notif_list",
    notifTarget: "#notis"
  };

  function getOriginalLink(hrefPart) {
    const original = _.get(config.originalNavbar, {
      required: false
    });

    if (!original) return null;

    return _.get(
      `a[href*="${hrefPart}"]`,
      original,
      { required: false }
    );
  }

  function hydrateVisibility() {
    const userNav = _.get(config.userNav, {
      required: false
    });

    const adminNav = _.get(config.adminNav, {
      required: false
    });

    const guestNav = _.get(config.guestNav, {
      required: false
    });

    if (_.isLogged()) {

      if (userNav) userNav.hidden = false;
      if (guestNav) guestNav.hidden = true;

    } else {

      if (userNav) userNav.hidden = true;
      if (adminNav) adminNav.hidden = true;
      if (guestNav) guestNav.hidden = false;

    }
  }

  function hydrateUser() {

    const user = _.user();

    const profileLink = _.get(config.profileLink, {
      required: false
    });

    const avatarBox = _.get(config.avatarBox, {
      required: false
    });

    const usernameBox = _.get(config.usernameBox, {
      required: false
    });

    if (profileLink && user.id) {
      profileLink.href = `/u${user.id}`;
    }

    if (usernameBox && user.name) {
      usernameBox.textContent = user.name;
    }

    if (avatarBox && user.avatar) {

      avatarBox.innerHTML = `
        <img
          src="${user.avatar}"
          alt="${user.name}"
          loading="lazy"
        >
      `;
    }
  }

  function hydrateOriginalLinks() {

    const inboxOriginal = getOriginalLink("/privmsg");
    const logoutOriginal = getOriginalLink("logout");

    const inboxLink = _.get(config.inboxLink, {
      required: false
    });

    const logoutLink = _.get(config.logoutLink, {
      required: false
    });

    if (inboxOriginal && inboxLink) {
      inboxLink.href = inboxOriginal.href;
    }

    if (logoutOriginal && logoutLink) {
      logoutLink.href = logoutOriginal.href;
    }
  }

  function hydrateAdmin() {

    const adminNav = _.get(config.adminNav, {
      required: false
    });

    if (!adminNav) return;

    if (window._userdata?.user_level !== 1) {
      adminNav.remove();
      return;
    }

    if (adminNav.dataset.pixieReady === "true") return;

    adminNav.innerHTML = `
      <a href="/admin">
        <i data-lucide="shield"></i>
        ACP
      </a>

      <button
        popovertarget="menuamin"
        class="drawer left">

        <i data-lucide="wrench"></i>
        ADMIN

      </button>
    `;

    adminNav.dataset.pixieReady = "true";

    _.icons();
  }

  function moveNotifications() {

    _.waitFor(config.notifList, {
      timeout: 10000
    })

    .then(function (notifList) {

      const target = _.get(
        config.notifTarget,
        { required: false }
      );

      if (!target) return;

      target.appendChild(notifList);

    })

    .catch(function () {

      _.log(
        "No he encontrado la lista de notificaciones."
      );

    });

  }

  function init() {

    hydrateVisibility();

    if (_.isLogged()) {

      hydrateUser();
      hydrateOriginalLinks();
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
    hydrateOriginalLinks,
    hydrateAdmin,
    moveNotifications
  };

});
