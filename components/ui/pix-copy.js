export default class PixCopy extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready === "true") return;
    this.dataset.ready = "true";

    const label = this.getAttribute("label") || "Copiar";
    const copiedLabel = this.getAttribute("copied") || "Copiado";
    const contenido = this.innerHTML;

    this.innerHTML = `
      <style>
        pix-copy {
          display: block;
          position: relative;
          border: 1px solid var(--mono-border1);
          border-radius: var(--br);
          background: var(--mono-surface2);
          overflow: clip;
        }

        pix-copy .pix-copy-header {
          display: flex;
          justify-content: flex-end;
          padding: var(--spacing-xs);
          border-bottom: 1px solid var(--mono-border1);
        }

        pix-copy .pix-copy-content {
          padding: var(--spacing);
          white-space: pre-wrap;
        }
      </style>

      <div class="pix-copy-header">
        <button type="button" class="pix-copy-btn">
          ${label}
        </button>
      </div>

      <div class="pix-copy-content">
        ${contenido}
      </div>
    `;

    const button = this.querySelector(".pix-copy-btn");
    const content = this.querySelector(".pix-copy-content");

    button.addEventListener("click", async () => {
      const text = content.innerText.trim();

      try {
        await navigator.clipboard.writeText(text);
        button.textContent = copiedLabel;
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.append(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();

        button.textContent = copiedLabel;
      }

      setTimeout(() => {
        button.textContent = label;
      }, 1500);
    });
  }
}
