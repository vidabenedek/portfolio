const body = document.body;
const panels = document.querySelectorAll(".panel");
const navLinks = document.querySelectorAll(".site-nav a");
const sections = document.querySelectorAll("main section[id]");
const heroMedia = document.querySelector(".hero-media");
const randomGallery = document.querySelector("[data-random-gallery]");
const frameButtons = document.querySelectorAll("[data-frame-trigger]");
const randomizeFramesButton = document.querySelector("[data-randomize-frames]");
const showreelVideo = document.querySelector("[data-showreel-video]");
const showreelPlayButton = document.querySelector("[data-showreel-toggle-play]");
const showreelMuteButton = document.querySelector("[data-showreel-toggle-mute]");
const showreelFullscreenButton = document.querySelector("[data-showreel-fullscreen]");

// All random music-video reference frames used by this section live here.
const clipFrameDirectory = randomGallery?.dataset.referenceFolder || "clip-stills/";
const clipFrameFiles = [
  "Képernyőfotó 2026-04-17 - 16.23.04.png",
  "Képernyőfotó 2026-04-17 - 16.23.40.png",
  "Képernyőfotó 2026-04-17 - 16.23.55.png",
  "Képernyőfotó 2026-04-17 - 16.24.25.png",
  "Képernyőfotó 2026-04-17 - 16.25.24.png",
  "Képernyőfotó 2026-04-17 - 16.25.41.png",
  "Képernyőfotó 2026-04-17 - 16.25.53.png",
  "Képernyőfotó 2026-04-17 - 16.26.36.png",
  "Képernyőfotó 2026-04-17 - 16.28.06.png",
  "Képernyőfotó 2026-04-17 - 16.28.13.png",
  "Képernyőfotó 2026-04-19 - 11.01.32.png",
  "Képernyőfotó 2026-04-19 - 11.02.04.png",
  "Képernyőfotó 2026-04-19 - 11.02.32.png",
  "Képernyőfotó 2026-04-19 - 11.03.11.png",
  "Képernyőfotó 2026-04-19 - 11.04.03.png",
  "Képernyőfotó 2026-04-19 - 11.04.18.png",
  "Képernyőfotó 2026-04-19 - 11.05.03.png",
  "Képernyőfotó 2026-04-19 - 11.05.17.png",
  "Képernyőfotó 2026-04-19 - 11.05.43.png",
  "Képernyőfotó 2026-04-19 - 11.06.01.png",
  "Képernyőfotó 2026-04-19 - 11.06.14.png",
  "Képernyőfotó 2026-04-19 - 11.06.45.png",
  "Képernyőfotó 2026-04-19 - 11.06.59.png",
  "Still 2025-10-06 150146_1.1.12.jpg",
  "Still 2025-10-06 150146_1.1.16.jpg",
  "Still 2025-10-06 150146_1.1.27.jpg",
  "Still 2025-10-06 150146_1.1.35.jpg",
  "Still 2025-10-06 150146_1.1.37.jpg",
  "Still 2026-04-17 161445_1.1.1.jpg",
  "Still 2026-04-17 161445_1.1.10.jpg",
  "Still 2026-04-17 161445_1.1.12.jpg",
  "Still 2026-04-17 161445_1.1.13.jpg",
  "Still 2026-04-17 161445_1.1.14.jpg",
  "Still 2026-04-17 161445_1.1.16.jpg",
  "Still 2026-04-17 161445_1.1.18.jpg",
  "Still 2026-04-17 161445_1.1.19.jpg",
  "Still 2026-04-17 161445_1.1.2.jpg",
  "Still 2026-04-17 161445_1.1.20.jpg",
  "Still 2026-04-17 161445_1.1.21.jpg",
  "Still 2026-04-17 161445_1.1.22.jpg",
  "Still 2026-04-17 161445_1.1.25.jpg",
  "Still 2026-04-17 161445_1.1.26.jpg",
  "Still 2026-04-17 161445_1.1.27.jpg",
  "Still 2026-04-17 161445_1.1.3.jpg",
  "Still 2026-04-17 161445_1.1.5.jpg",
  "Still 2026-04-17 161445_1.1.7.jpg",
  "Still 2026-04-17 161445_1.1.8.jpg",
];
const clipFrameSources = clipFrameFiles.map((fileName) => `${clipFrameDirectory}${fileName}`);

let currentFrameSelection = [];
let isSwitchingFrames = false;
let isHeroTicking = false;

function markPageReady() {
  body.classList.remove("is-loading");
  body.classList.add("is-ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", markPageReady, { once: true });
} else {
  markPageReady();
}

const panelObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("panel-visible");
      }
    });
  },
  {
    threshold: 0.18,
    rootMargin: "0px 0px -10% 0px",
  }
);

panels.forEach((panel) => {
  panelObserver.observe(panel);
});

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      navLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${entry.target.id}`;
        link.classList.toggle("is-active", isActive);
      });
    });
  },
  {
    threshold: 0.45,
    rootMargin: "-10% 0px -40% 0px",
  }
);

sections.forEach((section) => {
  navObserver.observe(section);
});

window.addEventListener("scroll", () => {
  if (!heroMedia) {
    return;
  }

  if (isHeroTicking) {
    return;
  }

  isHeroTicking = true;

  window.requestAnimationFrame(() => {
    const offset = Math.min(window.scrollY * 0.08, 36);
    heroMedia.style.transform = `scale(1.03) translateY(${offset}px)`;
    isHeroTicking = false;
  });
}, { passive: true });

function shuffleArray(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function getFrameLabel(source) {
  const fileName = source.split("/").pop() || "still";
  const readableName = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `Clip still ${readableName}`;
}

function getNextFrameSelection() {
  const currentSet = new Set(currentFrameSelection);
  const availableSources = clipFrameSources.filter((source) => !currentSet.has(source));
  const selectionPool = availableSources.length >= frameButtons.length ? availableSources : clipFrameSources;
  const nextSelection = shuffleArray(selectionPool).slice(0, frameButtons.length);

  if (nextSelection.length < frameButtons.length) {
    return shuffleArray(clipFrameSources).slice(0, frameButtons.length);
  }

  return nextSelection;
}

function applyFrameSelection(nextSelection) {
  frameButtons.forEach((button, index) => {
    const image = button.querySelector("img");
    const nextSource = nextSelection[index];

    if (!image || !nextSource) {
      return;
    }

    button.classList.add("is-swapping");

    window.setTimeout(() => {
      image.src = nextSource;
      image.alt = getFrameLabel(nextSource);
      button.setAttribute("aria-label", `Show another random music video frame. Current image: ${image.alt}`);
    }, 140);

    window.setTimeout(() => {
      button.classList.remove("is-swapping");
    }, 320);
  });

  currentFrameSelection = nextSelection;
}

function randomizeFrames() {
  if (!frameButtons.length || isSwitchingFrames) {
    return;
  }

  isSwitchingFrames = true;
  const nextSelection = getNextFrameSelection();
  applyFrameSelection(nextSelection);

  window.setTimeout(() => {
    isSwitchingFrames = false;
  }, 340);
}

if (frameButtons.length) {
  currentFrameSelection = shuffleArray(clipFrameSources).slice(0, frameButtons.length);
  applyFrameSelection(currentFrameSelection);

  frameButtons.forEach((button) => {
    button.addEventListener("click", randomizeFrames);
  });

  if (randomizeFramesButton) {
    randomizeFramesButton.addEventListener("click", randomizeFrames);
  }
}

function syncShowreelControls() {
  if (!showreelVideo) {
    return;
  }

  if (showreelPlayButton) {
    showreelPlayButton.textContent = showreelVideo.paused ? "PLAY" : "PAUSE";
  }

  if (showreelMuteButton) {
    showreelMuteButton.textContent = showreelVideo.muted ? "SOUND OFF" : "SOUND ON";
  }
}

if (showreelVideo) {
  syncShowreelControls();

  const canAutoplayShowreel =
    window.matchMedia("(min-width: 761px)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !navigator.connection?.saveData;

  if (canAutoplayShowreel) {
    const startPlayback = showreelVideo.play();
    if (startPlayback && typeof startPlayback.catch === "function") {
      startPlayback.catch(() => {});
    }
  }

  if (showreelPlayButton) {
    showreelPlayButton.addEventListener("click", async () => {
      if (showreelVideo.paused) {
        try {
          await showreelVideo.play();
        } catch (error) {
          return;
        }
      } else {
        showreelVideo.pause();
      }

      syncShowreelControls();
    });
  }

  if (showreelMuteButton) {
    showreelMuteButton.addEventListener("click", () => {
      showreelVideo.muted = !showreelVideo.muted;
      syncShowreelControls();
    });
  }

  if (showreelFullscreenButton) {
    showreelFullscreenButton.addEventListener("click", async () => {
      if (document.fullscreenElement === showreelVideo) {
        await document.exitFullscreen();
        return;
      }

      if (showreelVideo.requestFullscreen) {
        await showreelVideo.requestFullscreen();
      }
    });
  }

  showreelVideo.addEventListener("play", syncShowreelControls);
  showreelVideo.addEventListener("pause", syncShowreelControls);
  showreelVideo.addEventListener("volumechange", syncShowreelControls);
}
