export default class PixTabs extends HTMLElement {

  connectedCallback() {

    const tabs =
      [...this.querySelectorAll("pix-tab")];

    if (!tabs.length) return;

    tabs.forEach((tab, i) => {

      tab.dataset.index = i;

      if (i !== 0) {
        tab.hidden = true;
      }

    });

    const nav = document.createElement("menu");
    nav.className = "pix-tabs-nav";

    tabs.forEach((tab, i) => {

      const button =
        document.createElement("button");

      button.className = "pix-tab-button";

      button.textContent =
        tab.getAttribute("titulo") ||
        `Tab ${i + 1}`;

      if (i === 0) {
        button.setAttribute("active", "");
      }

      button.addEventListener("click", () => {

        tabs.forEach(t => {
          t.hidden = true;
        });

        nav
          .querySelectorAll(".pix-tab-button")
          .forEach(b => {
            b.removeAttribute("active");
          });

        tab.hidden = false;

        button.setAttribute("active", "");

      });

      nav.append(button);

    });

    this.prepend(nav);

    if (!this.querySelector("style")) {

      const style =
        document.createElement("style");

      style.textContent = `

        pix-tabs {
          display: block;
        }

        pix-tabs .pix-tabs-nav {
          display: flex;
          gap: var(--spacing-s);
          border-bottom:
            1px solid var(--mono-border1);

          padding-bottom:
            var(--spacing-s);

          margin-bottom:
            var(--spacing-l);
        }

        pix-tabs .pix-tab-button {
          border: none;
          background: none;
          cursor: pointer;
          padding:var(--spacing-2xs) var(--spacing);
          border-radius:var(--br-pill);
          color:var(--mono-text2);
          font:var(--f-s) var(--f-display-sans);
          text-transform:uppercase;
          transition: .2s ease;

        }

        pix-tabs .pix-tab-button:hover {
          background:var(--mono-component1);
        }

        pix-tabs .pix-tab-button[active] {
          background: var(--mono-component2);
          color: var(--mono-text2);
        }

        pix-tab:not([hidden]) {
          display: block;
        }

        pix-tab[hidden] {
          display: none;
        }

      `;

      this.prepend(style);

    }

  }

}
