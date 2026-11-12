const body = document.body;
const panels = document.querySelectorAll(".panel");
const siteHeader = document.querySelector(".site-header");
const navLinks = document.querySelectorAll(".site-nav a");
const sections = document.querySelectorAll("main section[id]");
const heroMedia = document.querySelector(".hero-media");
const foregroundCopies = document.querySelectorAll(".foreground-copy");
const menuToggle = document.querySelector(".menu-toggle");
const showreelVideo = document.querySelector("[data-showreel-video]");
const showreelFullscreenButton = document.querySelector("[data-showreel-fullscreen]");
const lazyVideos = document.querySelectorAll("[data-lazy-video]");
const musicVideo = document.querySelector("[data-music-video]");
const musicVideoFullscreenButton = document.querySelector("[data-music-video-fullscreen]");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobilePointerQuery = window.matchMedia("(max-width: 760px), (hover: none) and (pointer: coarse)");
const navigationEntry = typeof performance.getEntriesByType === "function"
  ? performance.getEntriesByType("navigation")[0]
  : null;
const shouldStartAtTop =
  (!window.location.hash || window.location.hash === "#top") &&
  (!navigationEntry || navigationEntry.type !== "back_forward");

if (shouldStartAtTop && "scrollRestoration" in history) {
  history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
}

let isScrollEffectsTicking = false;

function initScrollTextDecode() {
  if (
    reducedMotionQuery.matches ||
    mobilePointerQuery.matches ||
    !("IntersectionObserver" in window)
  ) {
    return;
  }

  const scrambleCharacters = "!<>-_\\/[]{}=+*^?#";

  function decodeText(element, finalText) {
    const interactiveParent = element.closest("a, button, summary, [role]");
    const hadAriaHidden = element.hasAttribute("aria-hidden");
    const hadAriaLabel = element.hasAttribute("aria-label");
    const startedAt = performance.now();
    const duration = Math.min(2400, Math.max(1150, finalText.length * 30));

    if (interactiveParent && !hadAriaLabel) {
      element.setAttribute("aria-label", finalText);
    } else if (!interactiveParent && !hadAriaHidden) {
      element.setAttribute("aria-hidden", "true");
    }

    function finishAccessibilityState() {
      if (interactiveParent && !hadAriaLabel) {
        element.removeAttribute("aria-label");
      } else if (!interactiveParent && !hadAriaHidden) {
        element.removeAttribute("aria-hidden");
      }
    }

    function renderFrame(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const fixedCharacterCount = Math.floor(finalText.length * progress);
      let displayedText = finalText.slice(0, fixedCharacterCount);

      for (let index = fixedCharacterCount; index < finalText.length; index += 1) {
        const character = finalText[index];
        const keepsPosition = character === " " || character === "\n";

        displayedText += keepsPosition
          ? character
          : scrambleCharacters[Math.floor(Math.random() * scrambleCharacters.length)];
      }

      element.textContent = displayedText;

      if (progress < 1) {
        element._decodeFrame = window.requestAnimationFrame(renderFrame);
        return;
      }

      element.textContent = finalText;
      finishAccessibilityState();
    }

    if (element._decodeFrame) {
      window.cancelAnimationFrame(element._decodeFrame);
    }

    let initialScramble = "";

    for (let index = 0; index < finalText.length; index += 1) {
      const character = finalText[index];
      const keepsPosition = character === " " || character === "\n";

      initialScramble += keepsPosition
        ? character
        : scrambleCharacters[Math.floor(Math.random() * scrambleCharacters.length)];
    }

    element.textContent = initialScramble;
    element.classList.remove("text-decode-pending");
    element._decodeFrame = window.requestAnimationFrame(renderFrame);
  }

  const textObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        textObserver.unobserve(entry.target);
        const finalText = entry.target.textContent;

        if (!finalText.trim()) {
          return;
        }

        window.setTimeout(() => {
          decodeText(entry.target, finalText);
        }, Math.random() * 420);
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll("[data-hero-decode]").forEach((element) => {
    if (element.children.length) {
      return;
    }

    if (/^(SCRIPT|STYLE|NOSCRIPT|IFRAME|VIDEO|IMG|CANVAS|SVG|PATH|INPUT|TEXTAREA|SELECT|OPTION)$/.test(element.tagName)) {
      return;
    }

    if (element.classList.contains("sr-only")) {
      return;
    }

    const text = element.textContent;
    const fontSize = parseFloat(window.getComputedStyle(element).fontSize) || 0;

    if (!text.trim() || text.length > 600 || fontSize < 17) {
      return;
    }

    if (fontSize < 28 && element.closest("a, button, summary, [role='tab']")) {
      return;
    }

    element.classList.add("text-decode-pending");
    textObserver.observe(element);
  });
}

function markPageReady() {
  if (shouldStartAtTop) {
    window.scrollTo(0, 0);
  }

  body.classList.remove("is-loading");
  body.classList.add("is-ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    markPageReady();
  }, { once: true });
} else {
  markPageReady();
}

if (shouldStartAtTop) {
  window.addEventListener("load", () => {
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  }, { once: true });
}

initScrollTextDecode();

function setMenuOpen(isOpen) {
  if (!siteHeader || !menuToggle) {
    return;
  }

  siteHeader.classList.toggle("is-menu-open", isOpen);
  body.classList.toggle("is-menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
}

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    setMenuOpen(!isOpen);
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setMenuOpen(false);
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenuOpen(false);
  }
});

window.addEventListener("resize", () => {
  if (window.matchMedia("(min-width: 761px)").matches) {
    setMenuOpen(false);
  }
}, { passive: true });

const panelObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("panel-visible");
      }
    });
  },
  {
    threshold: 0.01,
    rootMargin: "0px 0px -5% 0px",
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

function updateScrollLayers() {
  if (mobilePointerQuery.matches) {
    isScrollEffectsTicking = false;
    return;
  }

  if (heroMedia) {
    const offset = Math.min(window.scrollY * 0.08, 36);
    heroMedia.style.transform = `scale(1.03) translateY(${offset}px)`;
  }

  if (foregroundCopies.length) {
    const isMobile = mobilePointerQuery.matches;
    const maximumShift = isMobile ? 2.5 : 4;
    const movementRatio = isMobile ? 0.006 : 0.008;
    const viewportCenter = window.innerHeight / 2;

    foregroundCopies.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      const elementCenter = bounds.top + bounds.height / 2;
      const shift = Math.max(
        -maximumShift,
        Math.min(maximumShift, (viewportCenter - elementCenter) * movementRatio)
      );

      element.style.setProperty("--foreground-shift", `${shift.toFixed(2)}px`);
    });
  }

  isScrollEffectsTicking = false;
}

window.addEventListener("scroll", () => {
  if (reducedMotionQuery.matches) {
    return;
  }

  if (isScrollEffectsTicking) {
    return;
  }

  isScrollEffectsTicking = true;
  window.requestAnimationFrame(updateScrollLayers);
}, { passive: true });

if (!reducedMotionQuery.matches) {
  window.requestAnimationFrame(updateScrollLayers);
}

function loadVideoSource(video) {
  if (!video || video.dataset.sourceLoaded === "true") {
    return;
  }

  if (video.dataset.src) {
    video.src = video.dataset.src;
  }

  video.querySelectorAll("source[data-src]").forEach((source) => {
    source.src = source.dataset.src;
  });

  video.dataset.sourceLoaded = "true";
  video.load();
}

function canAutoplayVideo(video) {
  const isDesktopOnly = video.dataset.videoAutoplay === "desktop";

  return (
    (!isDesktopOnly || window.matchMedia("(min-width: 761px)").matches) &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !(navigator.connection && navigator.connection.saveData)
  );
}

function shouldDeferAutomaticVideo(video) {
  const connection = navigator.connection;
  const isSlowConnection = connection && /(^|-)2g$/.test(connection.effectiveType || "");
  const isDesktopVideoOnMobile =
    video.dataset.videoAutoplay === "desktop" &&
    window.matchMedia("(max-width: 760px)").matches;

  return (
    video.dataset.sourceLoaded !== "true" &&
    (isDesktopVideoOnMobile || isSlowConnection || Boolean(connection && connection.saveData))
  );
}

if (lazyVideos.length) {
  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;

        if (!entry.isIntersecting) {
          video.pause();
          return;
        }

        if (shouldDeferAutomaticVideo(video)) {
          return;
        }

        loadVideoSource(video);

        if (video.hasAttribute("data-video-autoplay") && canAutoplayVideo(video)) {
          const playback = video.play();
          if (playback && typeof playback.catch === "function") {
            playback.catch(() => {});
          }
        }
      });
    },
    {
      rootMargin: window.matchMedia("(max-width: 760px)").matches ? "0px" : "240px 0px",
      threshold: 0.01,
    }
  );

  lazyVideos.forEach((video) => videoObserver.observe(video));
}

if (showreelVideo) {
  if (showreelFullscreenButton) {
    showreelFullscreenButton.addEventListener("click", async () => {
      loadVideoSource(showreelVideo);

      const playback = showreelVideo.play();
      if (playback && typeof playback.catch === "function") {
        playback.catch(() => {});
      }

      if (document.fullscreenElement === showreelVideo) {
        await document.exitFullscreen();
        return;
      }

      if (showreelVideo.requestFullscreen) {
        await showreelVideo.requestFullscreen();
      } else if (showreelVideo.webkitEnterFullscreen) {
        showreelVideo.webkitEnterFullscreen();
      }
    });
  }

}

if (musicVideo && musicVideoFullscreenButton) {
  musicVideoFullscreenButton.addEventListener("click", async () => {
    loadVideoSource(musicVideo);

    const playback = musicVideo.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {});
    }

    try {
      if (document.fullscreenElement === musicVideo) {
        await document.exitFullscreen();
      } else if (musicVideo.requestFullscreen) {
        await musicVideo.requestFullscreen();
      } else if (musicVideo.webkitEnterFullscreen) {
        musicVideo.webkitEnterFullscreen();
      }
    } catch (error) {
      // The browser can reject fullscreen requests outside a direct user gesture.
    }
  });
}
