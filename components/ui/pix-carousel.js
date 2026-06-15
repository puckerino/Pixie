export default class PixCarousel extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === "true") return;
    this.dataset.ready = "true";

    const items = [...this.children];
    const labelAnterior = this.getAttribute("prev") || "Anterior";
    const labelSiguiente = this.getAttribute("next") || "Siguiente";

    if (!items.length) return;

    const contenido = this.innerHTML;

    this.innerHTML = `
      <style>
        pix-carousel {
          display: block;
          position: relative;
        }

        pix-carousel .pix-carousel-viewport {
          overflow: hidden;
        }

        pix-carousel .pix-carousel-track {
          display: flex;
          transition: transform .35s ease;
        }

        pix-carousel .pix-carousel-slide {
          min-width: 100%;
        }

        pix-carousel .pix-carousel-controls {
          display: flex;
          justify-content: center;
          gap: var(--spacing-s);
          margin-top: var(--spacing);
        }

        pix-carousel .pix-carousel-dots {
          display: flex;
          justify-content: center;
          gap: var(--spacing-xs);
          margin-top: var(--spacing-s);
        }

        pix-carousel .pix-carousel-dot {
          inline-size: .6rem;
          block-size: .6rem;
          border-radius: 50%;
          border: 1px solid var(--mono-border2);
          background: transparent;
          cursor: pointer;
          padding: 0;
        }

        pix-carousel .pix-carousel-dot[active] {
          background: var(--mono-text1);
        }
      </style>

      <div class="pix-carousel-viewport">
        <div class="pix-carousel-track">
          ${items.map(item => `
            <div class="pix-carousel-slide">
              ${item.outerHTML}
            </div>
          `).join("")}
        </div>
      </div>

      <div class="pix-carousel-controls">
        <button type="button" class="pix-carousel-btn pix-carousel-prev">
          ${labelAnterior}
        </button>

        <button type="button" class="pix-carousel-btn pix-carousel-next">
          ${labelSiguiente}
        </button>
      </div>

      <div class="pix-carousel-dots">
        ${items.map((_, i) => `
          <button type="button" class="pix-carousel-dot" data-index="${i}" aria-label="Ir a slide ${i + 1}"></button>
        `).join("")}
      </div>
    `;

    let index = 0;

    const track = this.querySelector(".pix-carousel-track");
    const prev = this.querySelector(".pix-carousel-prev");
    const next = this.querySelector(".pix-carousel-next");
    const dots = [...this.querySelectorAll(".pix-carousel-dot")];

    const update = () => {
      track.style.transform = `translateX(-${index * 100}%)`;

      dots.forEach((dot, i) => {
        dot.toggleAttribute("active", i === index);
      });
    };

    prev.addEventListener("click", () => {
      index = index <= 0 ? items.length - 1 : index - 1;
      update();
    });

    next.addEventListener("click", () => {
      index = index >= items.length - 1 ? 0 : index + 1;
      update();
    });

    dots.forEach(dot => {
      dot.addEventListener("click", () => {
        index = Number(dot.dataset.index);
        update();
      });
    });

    update();
  }
}
