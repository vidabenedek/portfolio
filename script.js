const body = document.body;
const panels = document.querySelectorAll(".panel");
const siteHeader = document.querySelector(".site-header");
const navLinks = document.querySelectorAll(".site-nav a");
const sections = document.querySelectorAll("main section[id]");
const heroMedia = document.querySelector(".hero-media");
const foregroundCopies = document.querySelectorAll(".foreground-copy");
const menuToggle = document.querySelector(".menu-toggle");
const blobTracker = document.querySelector("[data-blob-tracker]");
const lazyVideos = document.querySelectorAll("[data-lazy-video]");
const controlledVideos = document.querySelectorAll("[data-video-controls]");
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

function initBlobTracker() {
  if (
    !blobTracker ||
    reducedMotionQuery.matches ||
    (navigator.connection && navigator.connection.saveData)
  ) {
    return;
  }

  const context = blobTracker.getContext("2d", { alpha: true });

  if (!context) {
    return;
  }

  const trackedSelector = [
    "a",
    "button",
    ".section-heading",
    ".work-card",
    ".fact-card",
    ".timeline-card",
    ".videoclip-shot",
    ".clip-frame",
    ".press-card",
  ].join(",");

  const pointer = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.5,
    active: false,
  };
  const blobPoints = [];
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const coarsePointerQuery = window.matchMedia("(hover: none) and (pointer: coarse)");
  let trackedCandidates = [];
  let trackedElements = [];
  let highlightedElement = null;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let time = 0;
  let lastScrollY = window.scrollY;
  let scrollVelocity = 0;
  let lastRenderTime = 0;
  let resizeTimer = 0;
  let animationFrameId = 0;
  let isRendering = false;

  function isMobileTracker() {
    return mobileQuery.matches || coarsePointerQuery.matches;
  }

  function refreshTrackedCandidates() {
    trackedCandidates = Array.from(document.querySelectorAll(trackedSelector));
  }

  function resizeCanvas() {
    const mobileTracker = isMobileTracker();
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, mobileTracker ? 1.15 : 1.75);
    blobTracker.width = Math.floor(width * pixelRatio);
    blobTracker.height = Math.floor(height * pixelRatio);
    blobTracker.style.width = `${width}px`;
    blobTracker.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function scheduleResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      refreshTrackedCandidates();
      resizeCanvas();
    }, isMobileTracker() ? 180 : 80);
  }

  function getVisibleTrackedElements() {
    const viewportCenterX = width / 2;
    const viewportCenterY = height / 2;

    return trackedCandidates
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const visible =
          rect.width > 24 &&
          rect.height > 18 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < height &&
          rect.left < width;

        return {
          element,
          rect,
          distance: Math.hypot(
            rect.left + rect.width / 2 - viewportCenterX,
            rect.top + rect.height / 2 - viewportCenterY
          ),
          visible,
        };
      })
      .filter((item) => item.visible)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, isMobileTracker() ? 1 : 3);
  }

  function easePoint(point, targetX, targetY, targetRadius, targetWeight) {
    point.x += (targetX - point.x) * 0.16;
    point.y += (targetY - point.y) * 0.16;
    point.radius += (targetRadius - point.radius) * 0.12;
    point.weight += (targetWeight - point.weight) * 0.12;
  }

  function setHighlightedElement(nextElement) {
    if (highlightedElement === nextElement) {
      return;
    }

    if (highlightedElement) {
      highlightedElement.classList.remove("is-blob-tracked");
    }

    highlightedElement = nextElement;

    if (highlightedElement) {
      highlightedElement.classList.add("is-blob-tracked");
    }
  }

  function rebuildBlobPoints() {
    const mobileTracker = isMobileTracker();
    const scrollDelta = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    scrollVelocity += Math.max(-80, Math.min(80, scrollDelta)) * (mobileTracker ? 0.04 : 0.08);
    trackedElements = getVisibleTrackedElements();

    const targetPoints = [];
    const pointerTarget = pointer.active
      ? pointer
      : {
          x: width * (0.5 + Math.sin(time * 0.018) * 0.28),
          y: height * (0.5 + Math.cos(time * 0.014) * 0.22),
        };

    targetPoints.push({
      x: pointerTarget.x,
      y: pointerTarget.y + scrollVelocity,
      radius: pointer.active ? (mobileTracker ? 38 : 54) : (mobileTracker ? 32 : 44),
      weight: pointer.active ? (mobileTracker ? 0.46 : 0.62) : (mobileTracker ? 0.28 : 0.38),
    });

    trackedElements.forEach(({ rect }, index) => {
      const phase = time * 0.032 + index * 1.7;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radius = Math.max(
        mobileTracker ? 18 : 24,
        Math.min(mobileTracker ? 54 : 76, Math.min(rect.width, rect.height) * (mobileTracker ? 0.2 : 0.24))
      );
      const driftUnit = mobileTracker ? 10 : 8;
      const driftX = Math.round(Math.sin(phase) * Math.min(12, rect.width * 0.04) / driftUnit) * driftUnit;
      const driftY = Math.round(Math.cos(phase * 0.8) * Math.min(10, rect.height * 0.05) / driftUnit) * driftUnit;

      targetPoints.push({
        x: centerX + driftX,
        y: centerY + driftY,
        radius,
        weight: 0.72,
      });

    });

    targetPoints.forEach((target, index) => {
      if (!blobPoints[index]) {
        blobPoints[index] = {
          x: target.x,
          y: target.y,
          radius: target.radius,
          weight: 0,
        };
      }

      easePoint(blobPoints[index], target.x, target.y, target.radius, target.weight);
    });

    blobPoints.splice(targetPoints.length);
    scrollVelocity *= 0.84;
  }

  function glitchNoise(x, y, seed) {
    return Math.sin(x * 0.041 + y * 0.067 + time * 0.42 + seed) *
      Math.cos(x * 0.026 - y * 0.049 + time * 0.34 + seed * 1.7);
  }

  function getAnimationMaskRects() {
    return Array.from(document.querySelectorAll("[data-animation-mask]"))
      .map((element) => element.getBoundingClientRect())
      .filter((rect) =>
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < height &&
        rect.left < width
      );
  }

  function isPointMasked(x, y, maskRects) {
    return maskRects.some((rect) =>
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    );
  }

  function doLinesIntersect(a, b, c, d) {
    const direction = (from, to, point) =>
      (point.x - from.x) * (to.y - from.y) - (point.y - from.y) * (to.x - from.x);
    const abToC = direction(a, b, c);
    const abToD = direction(a, b, d);
    const cdToA = direction(c, d, a);
    const cdToB = direction(c, d, b);

    return abToC * abToD <= 0 && cdToA * cdToB <= 0;
  }

  function doesSegmentCrossRect(fromPoint, toPoint, rect) {
    const paddedRect = {
      left: rect.left - 1,
      right: rect.right + 1,
      top: rect.top - 1,
      bottom: rect.bottom + 1,
    };
    const corners = [
      { x: paddedRect.left, y: paddedRect.top },
      { x: paddedRect.right, y: paddedRect.top },
      { x: paddedRect.right, y: paddedRect.bottom },
      { x: paddedRect.left, y: paddedRect.bottom },
    ];

    return corners.some((corner, index) =>
      doLinesIntersect(fromPoint, toPoint, corner, corners[(index + 1) % corners.length])
    );
  }

  function isSegmentMasked(fromPoint, toPoint, maskRects) {
    if (!maskRects.length) {
      return false;
    }

    const midX = (fromPoint.x + toPoint.x) / 2;
    const midY = (fromPoint.y + toPoint.y) / 2;

    return (
      isPointMasked(fromPoint.x, fromPoint.y, maskRects) ||
      isPointMasked(midX, midY, maskRects) ||
      isPointMasked(toPoint.x, toPoint.y, maskRects) ||
      maskRects.some((rect) => doesSegmentCrossRect(fromPoint, toPoint, rect))
    );
  }

  function fieldValue(x, y) {
    return blobPoints.reduce((sum, point) => {
      const dx = Math.abs(x - point.x);
      const dy = Math.abs(y - point.y);
      const boxDistance = Math.max(dx, dy * 0.96) + Math.min(dx, dy) * 0.06;
      const distanceSquared = boxDistance * boxDistance + 70;

      return sum + ((point.radius * point.radius) / distanceSquared) * point.weight;
    }, 0);
  }

  function interpolateEdge(a, b, threshold) {
    const range = b.value - a.value || 1;
    const amount = (threshold - a.value) / range;

    return {
      x: a.x + (b.x - a.x) * amount,
      y: a.y + (b.y - a.y) * amount,
    };
  }

  function drawBrokenSegment(fromPoint, toPoint, gridSize, textureScale = 1, maskRects = []) {
    if (isSegmentMasked(fromPoint, toPoint, maskRects)) {
      return;
    }

    const mobileTracker = isMobileTracker();
    const midX = (fromPoint.x + toPoint.x) / 2;
    const midY = (fromPoint.y + toPoint.y) / 2;
    const damage = glitchNoise(midX, midY, gridSize);

    if (damage < 0.12) {
      return;
    }

    const segmentCount = 1;
    const jitterStrength = ((mobileTracker ? 2.4 : 4.2) + Math.abs(damage) * (mobileTracker ? 5 : 8)) * textureScale;

    for (let index = 0; index < segmentCount; index += 1) {
      const startAmount = index / segmentCount;
      const endAmount = (index + 0.42 + glitchNoise(midX, midY, index) * 0.18) / segmentCount;

      if (endAmount <= startAmount || glitchNoise(midX, midY, index + 10) < -0.34) {
        continue;
      }

      const startX = fromPoint.x + (toPoint.x - fromPoint.x) * startAmount;
      const startY = fromPoint.y + (toPoint.y - fromPoint.y) * startAmount;
      const endX = fromPoint.x + (toPoint.x - fromPoint.x) * Math.min(endAmount, 1);
      const endY = fromPoint.y + (toPoint.y - fromPoint.y) * Math.min(endAmount, 1);
      const startJitter = glitchNoise(startX, startY, index) * jitterStrength;
      const endJitter = glitchNoise(endX, endY, index + 4) * jitterStrength;
      const wobble = Math.sin(time * 0.19 + midY * 0.03) * (mobileTracker ? 1.4 : 2.6);
      const grainOffset = glitchNoise(midX, midY, index + 19) * (mobileTracker ? 1.2 : 2.4) * textureScale;
      const isHorizontal = Math.abs(toPoint.x - fromPoint.x) > Math.abs(toPoint.y - fromPoint.y);

      context.moveTo(
        startX + (isHorizontal ? wobble : startJitter) + grainOffset,
        startY + (isHorizontal ? startJitter : 0) - grainOffset * 0.35
      );
      context.lineTo(
        endX + (isHorizontal ? wobble : endJitter) - grainOffset * 0.4,
        endY + (isHorizontal ? endJitter : 0) + grainOffset * 0.25
      );
    }
  }

  function drawContour(threshold, color, lineWidth, gridSize, options = {}) {
    const textureScale = options.textureScale || 1;
    const maskRects = options.maskRects || [];
    const edgePairs = {
      1: [[3, 0]],
      2: [[0, 1]],
      3: [[3, 1]],
      4: [[1, 2]],
      5: [[3, 2], [0, 1]],
      6: [[0, 2]],
      7: [[3, 2]],
      8: [[2, 3]],
      9: [[0, 2]],
      10: [[0, 3], [1, 2]],
      11: [[1, 2]],
      12: [[1, 3]],
      13: [[0, 1]],
      14: [[3, 0]],
    };

    context.beginPath();

    for (let y = -gridSize; y < height + gridSize; y += gridSize) {
      for (let x = -gridSize; x < width + gridSize; x += gridSize) {
        const corners = [
          { x, y, value: fieldValue(x, y) },
          { x: x + gridSize, y, value: fieldValue(x + gridSize, y) },
          { x: x + gridSize, y: y + gridSize, value: fieldValue(x + gridSize, y + gridSize) },
          { x, y: y + gridSize, value: fieldValue(x, y + gridSize) },
        ];
        const caseIndex =
          (corners[0].value > threshold ? 1 : 0) |
          (corners[1].value > threshold ? 2 : 0) |
          (corners[2].value > threshold ? 4 : 0) |
          (corners[3].value > threshold ? 8 : 0);
        const pairs = edgePairs[caseIndex];

        if (!pairs) {
          continue;
        }

        const edgePoints = [
          interpolateEdge(corners[0], corners[1], threshold),
          interpolateEdge(corners[1], corners[2], threshold),
          interpolateEdge(corners[2], corners[3], threshold),
          interpolateEdge(corners[3], corners[0], threshold),
        ];

        pairs.forEach(([from, to]) => {
          drawBrokenSegment(edgePoints[from], edgePoints[to], gridSize, textureScale, maskRects);
        });
      }
    }

    context.strokeStyle = color;
    context.lineWidth = lineWidth + Math.sin(time * 0.62) * 0.28;
    context.lineCap = "square";
    context.lineJoin = "miter";
    context.shadowColor = options.shadowColor || "transparent";
    context.shadowBlur = options.shadowBlur || 0;
    context.globalAlpha = options.alpha || 1;
    context.setLineDash(options.dash || [10 + Math.sin(time * 0.34) * 3, 8 + Math.cos(time * 0.48) * 4]);
    context.stroke();
    context.globalAlpha = 1;
    context.shadowBlur = 0;
    context.setLineDash([]);
  }

  function drawLineGrain(maskRects = []) {
    const mobileTracker = isMobileTracker();
    const grainCount = mobileTracker ? 14 : 34;

    context.save();

    blobPoints.forEach((point, pointIndex) => {
      for (let index = 0; index < grainCount; index += 1) {
        const seed = pointIndex * 37 + index * 11;
        const noise = glitchNoise(point.x + index * 13, point.y - index * 7, seed);

        if (noise < 0.22) {
          continue;
        }

        const angle = noise * Math.PI * 2 + index;
        const radius = point.radius * (0.28 + ((index * 29) % 100) / 100 * 0.82);
        const x = point.x + Math.cos(angle) * radius;
        const y = point.y + Math.sin(angle) * radius;
        const alpha = (mobileTracker ? 0.04 : 0.07) + noise * (mobileTracker ? 0.035 : 0.055);

        if (isPointMasked(x, y, maskRects)) {
          continue;
        }

        context.fillStyle = `rgba(253, 28, 3, ${alpha})`;
        context.fillRect(x, y, mobileTracker ? 1 : 1.4, 1);
      }
    });

    context.restore();
  }

  function drawTrackedBoxes(maskRects = []) {
    const mobileTracker = isMobileTracker();

    context.save();
    context.font = "600 10px League Spartan, Helvetica, Arial, sans-serif";
    context.textBaseline = "top";

    trackedElements.forEach(({ rect, element }, index) => {
      const isHot = element === highlightedElement;
      if (!isHot) {
        return;
      }

      if (isPointMasked(rect.left + rect.width / 2, rect.top + rect.height / 2, maskRects)) {
        return;
      }

      const lineDrift = glitchNoise(rect.left, rect.top, index) * 3;
      const alpha = isHot ? (mobileTracker ? 0.34 : 0.48) : (mobileTracker ? 0.05 : 0.1);

      context.strokeStyle = `rgba(253, 28, 3, ${alpha})`;
      context.lineWidth = isHot ? 1.2 : 0.7;
      context.setLineDash(isHot ? [16, 4, 3, 7] : [14, mobileTracker ? 16 : 10]);
      context.strokeRect(
        rect.left + lineDrift,
        rect.top - lineDrift * 0.5,
        rect.width,
        rect.height
      );
      context.setLineDash([]);

      if (isHot && !mobileTracker) {
        context.fillStyle = `rgba(253, 28, 3, ${alpha})`;
        context.fillText(`SIGNAL_${String(index + 1).padStart(2, "0")}`, rect.left + 8, rect.top + 8);
      }
    });

    context.restore();
  }

  function updateHighlightedElement() {
    if (isMobileTracker() && !pointer.active) {
      setHighlightedElement(null);
      return;
    }

    const element = document.elementFromPoint(pointer.x, pointer.y);
    const nextElement = element ? element.closest(trackedSelector) : null;
    setHighlightedElement(nextElement);
  }

  function queueRender() {
    animationFrameId = window.requestAnimationFrame(render);
  }

  function render(now = 0) {
    if (document.hidden) {
      isRendering = false;
      animationFrameId = 0;
      return;
    }

    const mobileTracker = isMobileTracker();

    if (now - lastRenderTime < (mobileTracker ? 50 : 34)) {
      queueRender();
      return;
    }

    lastRenderTime = now;
    time += 1;
    rebuildBlobPoints();
    updateHighlightedElement();
    context.clearRect(0, 0, width, height);
    const maskRects = getAnimationMaskRects();
    drawContour(
      1.02 + Math.sin(time * 0.12) * 0.025,
      mobileTracker ? "rgba(253, 28, 3, 0.18)" : "rgba(253, 28, 3, 0.24)",
      mobileTracker ? 3.2 : 4.8,
      mobileTracker ? 62 : 52,
      {
        alpha: mobileTracker ? 0.45 : 0.58,
        dash: [18, 14],
        shadowBlur: mobileTracker ? 7 : 12,
        shadowColor: "rgba(253, 28, 3, 0.42)",
        textureScale: 1.4,
        maskRects,
      }
    );
    drawContour(
      1.08 + Math.sin(time * 0.16) * 0.025,
      mobileTracker ? "rgba(253, 28, 3, 0.62)" : "rgba(253, 28, 3, 0.82)",
      mobileTracker ? 1.25 : 1.75,
      mobileTracker ? 58 : 48,
      { maskRects }
    );
    drawLineGrain(maskRects);
    drawTrackedBoxes(maskRects);

    queueRender();
  }

  function startRendering() {
    if (isRendering || document.hidden) {
      return;
    }

    isRendering = true;
    lastRenderTime = performance.now();
    queueRender();
  }

  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }, { passive: true });

  window.addEventListener("pointerdown", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }, { passive: true });

  window.addEventListener("pointerup", () => {
    if (isMobileTracker()) {
      window.setTimeout(() => {
        pointer.active = false;
      }, 420);
    }
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    pointer.active = false;
  });

  window.addEventListener("resize", scheduleResize, { passive: true });
  window.addEventListener("orientationchange", scheduleResize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = 0;
      isRendering = false;
      return;
    }

    startRendering();
  });

  refreshTrackedCandidates();
  resizeCanvas();
  startRendering();
}


initBlobTracker();

function initScrollTextDecode() {
  if (
    reducedMotionQuery.matches ||
    !("IntersectionObserver" in window)
  ) {
    return;
  }

  const decodeTargets = mobilePointerQuery.matches
    ? document.querySelectorAll(".hero h1 [data-hero-decode]")
    : document.querySelectorAll("[data-hero-decode]");

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

  decodeTargets.forEach((element) => {
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

function formatVideoTime(value) {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function initVideoControls(video) {
  const player = video.closest("[data-video-player]");
  if (!player || player.querySelector(".video-controls")) {
    return;
  }

  const controls = document.createElement("div");
  controls.className = "video-controls";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Video controls");
  controls.innerHTML = `
    <label class="video-seek-label">
      <span class="sr-only">Seek video</span>
      <input class="video-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek video">
    </label>
    <div class="video-control-row">
      <button class="video-control video-toggle" type="button" aria-label="Play video" title="Play / pause">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path class="video-play-icon" d="M8 5v14l11-7z"/><path class="video-pause-icon" d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>
      </button>
      <span class="video-time" aria-live="off"><span data-video-current>0:00</span><span aria-hidden="true"> / </span><span data-video-duration>0:00</span></span>
      <button class="video-control video-mute" type="button" aria-label="Unmute video" title="Mute / unmute">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a3.5 3.5 0 0 0-2-3.15v6.3A3.5 3.5 0 0 0 16.5 12z"/><path class="video-muted-mark" d="m18 9 4 6m0-6-4 6"/></svg>
      </button>
      <button class="video-control video-fullscreen" type="button" aria-label="Open video fullscreen" title="Fullscreen">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5"/></svg>
      </button>
    </div>`;
  video.removeAttribute("controls");
  player.appendChild(controls);

  const toggle = controls.querySelector(".video-toggle");
  const mute = controls.querySelector(".video-mute");
  const fullscreen = controls.querySelector(".video-fullscreen");
  const seek = controls.querySelector(".video-seek");
  const current = controls.querySelector("[data-video-current]");
  const duration = controls.querySelector("[data-video-duration]");
  let isSeeking = false;

  const ensureSource = () => loadVideoSource(video);
  const updatePlayState = () => {
    const isPlaying = !video.paused && !video.ended;
    player.classList.toggle("is-video-playing", isPlaying);
    toggle.setAttribute("aria-label", isPlaying ? "Pause video" : "Play video");
  };
  const updateMuteState = () => {
    player.classList.toggle("is-video-muted", video.muted || video.volume === 0);
    mute.setAttribute("aria-label", video.muted || video.volume === 0 ? "Unmute video" : "Mute video");
  };
  const updateTimeline = () => {
    const videoDuration = Number.isFinite(video.duration) ? video.duration : 0;
    const progress = videoDuration ? video.currentTime / videoDuration : 0;
    if (!isSeeking) {
      seek.value = Math.round(progress * 1000);
    }
    seek.style.setProperty("--video-progress", `${progress * 100}%`);
    current.textContent = formatVideoTime(video.currentTime);
    duration.textContent = formatVideoTime(videoDuration);
  };
  const togglePlayback = () => {
    ensureSource();
    if (video.paused) {
      const playback = video.play();
      if (playback && typeof playback.catch === "function") playback.catch(() => {});
    } else {
      video.pause();
    }
  };

  toggle.addEventListener("click", togglePlayback);
  video.addEventListener("click", togglePlayback);
  video.addEventListener("dblclick", () => fullscreen.click());
  video.addEventListener("play", updatePlayState);
  video.addEventListener("pause", updatePlayState);
  video.addEventListener("volumechange", updateMuteState);
  video.addEventListener("loadedmetadata", updateTimeline);
  video.addEventListener("durationchange", updateTimeline);
  video.addEventListener("timeupdate", updateTimeline);

  seek.addEventListener("input", () => {
    isSeeking = true;
    ensureSource();
    const videoDuration = Number.isFinite(video.duration) ? video.duration : 0;
    const previewTime = videoDuration * (Number(seek.value) / 1000);
    seek.style.setProperty("--video-progress", `${Number(seek.value) / 10}%`);
    current.textContent = formatVideoTime(previewTime);
  });
  seek.addEventListener("change", () => {
    const videoDuration = Number.isFinite(video.duration) ? video.duration : 0;
    if (videoDuration) video.currentTime = videoDuration * (Number(seek.value) / 1000);
    isSeeking = false;
    updateTimeline();
  });

  mute.addEventListener("click", () => {
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 1;
  });

  fullscreen.addEventListener("click", async () => {
    ensureSource();
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (player.requestFullscreen) {
        await player.requestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    } catch (error) {
      // Some browsers only allow fullscreen from a direct user gesture.
    }
  });

  video.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "k") {
      event.preventDefault();
      togglePlayback();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      ensureSource();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + direction * 5));
    } else if (event.key.toLowerCase() === "f") {
      fullscreen.click();
    }
  });

  updatePlayState();
  updateMuteState();
  updateTimeline();
}

controlledVideos.forEach(initVideoControls);

function initPressCarousel(carousel) {
  const track = carousel.querySelector("[data-press-track]");
  const cards = Array.from(carousel.querySelectorAll("[data-press-card]"));
  const currentLabel = carousel.querySelector("[data-press-current]");
  const progress = carousel.querySelector("[data-press-progress]");

  if (!track || !cards.length) return;

  let activeIndex = 0;
  let scrollFrame = 0;
  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragDistance = 0;
  let isDragging = false;
  let isTouchTracking = false;

  function getClosestCardIndex() {
    const trackLeft = track.getBoundingClientRect().left;
    let closestIndex = 0;
    let closestDistance = Infinity;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  function updateCarousel(index = getClosestCardIndex()) {
    activeIndex = Math.max(0, Math.min(cards.length - 1, index));
    cards.forEach((card, cardIndex) => {
      card.classList.toggle("is-active", cardIndex === activeIndex);
    });

    if (currentLabel) currentLabel.textContent = String(activeIndex + 1).padStart(2, "0");
    if (progress) progress.style.transform = `scaleX(${(activeIndex + 1) / cards.length})`;
  }

  function showCard(index) {
    const nextIndex = Math.max(0, Math.min(cards.length - 1, index));
    cards[nextIndex].scrollIntoView({
      behavior: reducedMotionQuery.matches ? "auto" : "smooth",
      block: "nearest",
      inline: "start",
    });
    updateCarousel(nextIndex);
  }

  track.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    showCard(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
  });

  track.addEventListener("scroll", () => {
    window.cancelAnimationFrame(scrollFrame);
    scrollFrame = window.requestAnimationFrame(() => updateCarousel());
  }, { passive: true });

  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") {
      isTouchTracking = true;
      dragStartX = event.clientX;
      dragDistance = 0;
      return;
    }

    if (event.button !== 0) return;
    isDragging = true;
    dragStartX = event.clientX;
    dragStartScroll = track.scrollLeft;
    dragDistance = 0;
  });

  track.addEventListener("pointermove", (event) => {
    if (isTouchTracking) {
      dragDistance = event.clientX - dragStartX;
      return;
    }

    if (!isDragging) return;
    dragDistance = event.clientX - dragStartX;

    if (Math.abs(dragDistance) > 6 && !track.classList.contains("is-dragging")) {
      track.classList.add("is-dragging");
      track.setPointerCapture(event.pointerId);
    }

    if (!track.classList.contains("is-dragging")) return;
    track.scrollLeft = dragStartScroll - dragDistance;
  });

  function finishDrag(event) {
    if (isTouchTracking) {
      isTouchTracking = false;
      return;
    }

    if (!isDragging) return;
    const wasDragged = Math.abs(dragDistance) > 8;
    isDragging = false;
    track.classList.remove("is-dragging");
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    if (wasDragged) {
      showCard(getClosestCardIndex());
    } else {
      dragDistance = 0;
    }
  }

  track.addEventListener("pointerup", finishDrag);
  track.addEventListener("pointercancel", (event) => {
    isTouchTracking = false;
    dragDistance = 0;
    finishDrag(event);
  });
  track.addEventListener("click", (event) => {
    const wasDragged = Math.abs(dragDistance) > 8;

    if (wasDragged) {
      event.preventDefault();
      event.stopPropagation();
    }

    dragDistance = 0;
  }, true);

  updateCarousel(0);
}

document.querySelectorAll("[data-press-carousel]").forEach(initPressCarousel);

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
