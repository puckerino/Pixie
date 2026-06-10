/*!
 * PixieIcons.js
 * Sustituye imágenes/iconos clásicos de ForoActivo por texto o Lucide
 * Requiere: pixiekit.js + lucide
 * Versión: 0.1.0
 */

const PixieIcons = PixieKit("Icons", function (_) {

  const rules = [
    {
      selector: "img.i_icon_quote, img#i_icon_quote",
      target: "a",
      text: "CITAR"
    },
    {
      selector: "img#add_username",
      target: "self",
      text: "AÑADIR USUARIO"
    },
    {
      selector: "img.i_icon_edit",
      target: "a",
      text: "EDITAR"
    },
    {
      selector: "img.i_icon_ip",
      target: "a",
      text: "IP"
    },
    {
      selector: "img.i_icon_delete",
      target: "a",
      text: "BORRAR"
    },

    {
      selector: 'img[src="https://2img.net/i.imgur.com/TU5WzW4.jpeg"]',
      target: "a",
      tooltip: "Ficha",
      icon: "folder"
    },
    {
      selector: 'img[src="https://2img.net/i.imgur.com/bENGR4Q.jpeg"]',
      target: "a",
      tooltip: "Baúl",
      icon: "archive"
    },
    {
      selector: 'img[src="https://2img.net/i.imgur.com/scOn0X7.jpeg"]',
      target: "a",
      tooltip: "Búsquedas",
      icon: "search"
    },

    {
      selector: 'img[src="https://2img.net/i/fa/subsilver/topic_delete.gif"]',
      target: "a",
      text: "BORRAR TEMA"
    },
    {
      selector: 'img[src="https://2img.net/i/fa/subsilver/topic_move.gif"]',
      target: "a",
      text: "MOVER TEMA"
    },
    {
      selector: 'img[src="https://2img.net/i/fa/subsilver/topic_lock.gif"]',
      target: "a",
      text: "CERRAR TEMA"
    },
    {
      selector: 'img[src="https://2img.net/i/fa/subsilver/topic_unlock.gif"]',
      target: "a",
      text: "ABRIR TEMA"
    },
    {
      selector: 'img[src="https://2img.net/i/fa/subsilver/topic_split.gif"]',
      target: "a",
      text: "DIVIDIR TEMA"
    },
    {
      selector: 'img[src="https://2img.net/i/fa/subsilver/topic_merge.gif"]',
      target: "a",
      text: "JUNTAR TEMA"
    },
    {
      selector: 'img[src="https://2img.net/i/fa/subsilver/topic_trashcan.gif"]',
      target: "a",
      text: "MOVER A PAPELERA"
    },

    {
      selector: "img.i_icon_pm",
      target: "a",
      tooltip: "Enviar Mensaje Privado",
      icon: "mail"
    },
    {
      selector: "img.i_icon_profile, img#i_icon_profile",
      target: "a",
      tooltip: "Ver Perfil",
      icon: "user"
    },

    {
      selector: "img.i_msg_newpost",
      target: "a",
      text: "NUEVO MP"
    },

    {
      selector: '.pm .icon img[src="https://2img.net/i/fa/prosilver/topic_read.gif"]',
      target: ".icon",
      icon: "mail"
    },
    {
      selector: '.pm .icon img[src="https://2img.net/i/fa/prosilver/topic_unread.gif"]',
      target: ".icon",
      icon: "mail-warning"
    },

    {
      selector: 'img[src="https://2img.net/i/fa/prosilver/button_topic_reply_en.png"]',
      target: "a",
      text: "CONTESTAR"
    },

    {
      selector: 'img[src="https://2img.net/i/fa/prosilver/topic_read_locked.gif"]',
      target: ".icon",
      icon: "lock"
    }
  ];

  function icon(name) {
    return `<i data-lucide="${name}"></i>`;
  }

  function getTarget(img, targetSelector) {
    if (targetSelector === "self") return img;

    if (!targetSelector) return img.parentElement;

    return img.closest(targetSelector) || img.parentElement;
  }

  function applyRule(rule) {
    const images = _.getAll(rule.selector);

    images.forEach(function (img) {
      const target = getTarget(img, rule.target);
      if (!target) return;

      if (target.dataset.pixieIconReady === "true") return;

      if (rule.tooltip) {
        target.setAttribute("tooltip", rule.tooltip);
        target.setAttribute("aria-label", rule.tooltip);
      }

      if (rule.text) {
        target.textContent = rule.text;
      }

      if (rule.icon) {
        target.innerHTML = icon(rule.icon);
      }

      target.classList.add("pixie-icon-replaced");
      target.dataset.pixieIconReady = "true";
    });
  }

  function replaceIcons() {
    rules.forEach(applyRule);
    _.icons();
  }

  function init() {
    replaceIcons();
  }

  _.ready(init);

  return {
    init,
    replaceIcons
  };

});
