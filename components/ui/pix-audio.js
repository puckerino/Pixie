export default class PixAudio extends HTMLElement {
  connectedCallback() {

    if (this.dataset.ready === "true") return;
    this.dataset.ready = "true";

    const youtube =
      this.getAttribute("youtube") || "";

    const titulo =
      this.getAttribute("titulo") || "Audio";

    const videoId =
      this.getVideoId(youtube);

    if (!videoId) {

      this.innerHTML = `
        <p>Video no válido</p>
      `;

      return;

    }

    const origin =
      encodeURIComponent(location.origin);

    this.innerHTML = `

      <style>

        pix-audio {
          display: block;
        }

        pix-audio .pix-audio {

          display: flex;

          align-items: center;

          gap: var(--spacing);

          padding: var(--spacing);

          border:
            1px solid var(--mono-border1);

          border-radius:
            var(--br);

          background:
            var(--mono-surface2);

        }

        pix-audio .pix-audio-button {

          width: 3rem;
          height: 3rem;

          flex-shrink: 0;

          border:
            1px solid var(--mono-border1);

          border-radius:
            50%;

          background:
            var(--mono-component1);

          color:
            var(--mono-text1);

          cursor: pointer;

          display: grid;
          place-items: center;

          font-size: 1rem;

          transition:
            background .2s ease,
            border-color .2s ease,
            color .2s ease;

        }

        pix-audio .pix-audio-button:hover {

          background:
            var(--mono-component2);

          border-color:
            var(--mono-border2);

        }

        pix-audio .pix-audio-content {

          display: grid;

          gap: .25rem;

          min-width: 0;

          flex-grow: 1;

        }

        pix-audio .pix-audio-title {

          font:
            var(--f-m)
            var(--f-display-sans);

        }

        pix-audio .pix-audio-status {

          font:
            var(--f-s)
            var(--f-mono);

          text-transform:
            uppercase;

          color:
            var(--mono-text2);

        }

        pix-audio iframe {

          position: absolute;

          width: 1px;
          height: 1px;

          opacity: 0;

          pointer-events: none;

          border: 0;

        }

      </style>

      <article class="pix-audio">

        <button
          class="pix-audio-button"
          type="button"
          aria-label="Reproducir audio"
        >

          <i class="bi bi-play-fill"></i>

        </button>

        <div class="pix-audio-content">

          <div class="pix-audio-title">

            ${titulo}

          </div>

          <div class="pix-audio-status">

            detenido

          </div>

        </div>

        <iframe
          allow="autoplay; encrypted-media"
          src="
https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${origin}&playsinline=1&controls=0
"
        ></iframe>

      </article>

    `;

    this.button =
      this.querySelector(
        ".pix-audio-button"
      );

    this.status =
      this.querySelector(
        ".pix-audio-status"
      );

    this.iframe =
      this.querySelector("iframe");

    this.playing = false;

    this.button.addEventListener(
      "click",
      () => {

        this.toggle();

      }
    );

  }

  toggle() {

    if (
      !this.iframe ||
      !this.iframe.contentWindow
    ) return;

    // PLAY
    if (!this.playing) {

      this.sendCommand(
        "playVideo"
      );

      this.playing = true;

      this.button.innerHTML =
        '<i class="bi bi-pause-fill"></i>';

      this.button.setAttribute(
        "aria-label",
        "Pausar audio"
      );

      this.status.innerHTML =
        "reproduciendo";

    }

    // PAUSE
    else {

      this.sendCommand(
        "pauseVideo"
      );

      this.playing = false;

      this.button.innerHTML =
        '<i class="bi bi-play-fill"></i>';

      this.button.setAttribute(
        "aria-label",
        "Reproducir audio"
      );

      this.status.innerHTML =
        "detenido";

    }

  }

  sendCommand(command) {

    this.iframe.contentWindow.postMessage(
      JSON.stringify({

        event: "command",

        func: command,

        args: []

      }),
      "*"
    );

  }

  getVideoId(url) {

    // ya es un id
    if (
      /^[a-zA-Z0-9_-]{11}$/.test(url)
    ) {

      return url;

    }

    try {

      const parsed =
        new URL(url);

      // youtube.com/watch?v=
      if (
        parsed.hostname.includes(
          "youtube.com"
        )
      ) {

        return (
          parsed.searchParams.get("v")
          || ""
        );

      }

      // youtu.be/
      if (
        parsed.hostname.includes(
          "youtu.be"
        )
      ) {

        return parsed.pathname.replace(
          "/",
          ""
        );

      }

    }

    catch (err) {}

    return "";

  }

}
