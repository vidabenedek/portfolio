const body = document.body;
const panels = document.querySelectorAll(".panel");
const siteHeader = document.querySelector(".site-header");
const navLinks = document.querySelectorAll(".site-nav a");
const sections = document.querySelectorAll("main section[id]");
const heroMedia = document.querySelector(".hero-media");
const menuToggle = document.querySelector(".menu-toggle");
const randomGallery = document.querySelector("[data-random-gallery]");
const frameButtons = document.querySelectorAll("[data-frame-trigger]");
const randomizeFramesButton = document.querySelector("[data-randomize-frames]");
const showreelVideo = document.querySelector("[data-showreel-video]");
const showreelFullscreenButton = document.querySelector("[data-showreel-fullscreen]");
const blobTracker = document.querySelector("[data-blob-tracker]");
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

// All random music-video reference frames used by this section live here.
const clipFrameDirectory = randomGallery && randomGallery.dataset.referenceFolder
  ? randomGallery.dataset.referenceFolder
  : "clip-stills-mobile/";
const clipFrameFiles = Array.from(
  { length: 64 },
  (_, index) => `frame-${String(index + 1).padStart(3, "0")}.jpg`
);
const clipFrameSources = clipFrameFiles.map((fileName) => `${clipFrameDirectory}${fileName}`);

let currentFrameSelection = [];
let isSwitchingFrames = false;
let isHeroTicking = false;

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

function markPageReady() {
  if (shouldStartAtTop) {
    window.scrollTo(0, 0);
  }

  body.classList.remove("is-loading");
  body.classList.add("is-ready");
}

function initHeroPixelate() {
  const nameLines = Array.from(document.querySelectorAll(".name-line[data-glitch-text]"));

  if (!nameLines.length) {
    return;
  }

  if (reducedMotionQuery.matches) {
    nameLines.forEach((line) => line.classList.add("is-pixelated"));
    return;
  }

  nameLines.forEach((line) => {
    const rect = line.getBoundingClientRect();
    const style = window.getComputedStyle(line);
    const fontSize = Number.parseFloat(style.fontSize);
    const width = Math.ceil(window.innerWidth);
    const height = Math.ceil(window.innerHeight);
    const canvas = document.createElement("canvas");
    const source = document.createElement("canvas");
    const outputContext = canvas.getContext("2d");
    const sourceContext = source.getContext("2d", { willReadFrequently: true });

    if (!outputContext || !sourceContext || !width || !height) {
      line.classList.add("is-pixelated");
      return;
    }

    canvas.className = "pixelate-text-canvas";
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.visibility = "hidden";
    source.width = width;
    source.height = height;

    sourceContext.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    sourceContext.textBaseline = "alphabetic";
    sourceContext.fillStyle = style.color;

    if ("letterSpacing" in sourceContext) {
      sourceContext.letterSpacing = style.letterSpacing;
    }

    sourceContext.fillText(line.textContent.trim(), rect.left, rect.top + rect.height * 0.82);

    const sampleStep = Math.max(2, Math.round(fontSize / 55));
    const targetPoints = [];

    const sampleLeft = Math.max(0, Math.floor(rect.left));
    const sampleRight = Math.min(width, Math.ceil(rect.right));
    const sampleTop = Math.max(0, Math.floor(rect.top));
    const sampleBottom = Math.min(height, Math.ceil(rect.bottom));
    const sampleWidth = Math.max(1, sampleRight - sampleLeft);
    const sampleHeight = Math.max(1, sampleBottom - sampleTop);
    const sourcePixels = sourceContext.getImageData(
      sampleLeft,
      sampleTop,
      sampleWidth,
      sampleHeight
    ).data;

    for (let y = sampleTop; y < sampleBottom; y += sampleStep) {
      for (let x = sampleLeft; x < sampleRight; x += sampleStep) {
        const localX = x - sampleLeft;
        const localY = y - sampleTop;

        if (sourcePixels[(localY * sampleWidth + localX) * 4 + 3] > 96) {
          targetPoints.push({ x, y });
        }
      }
    }

    const isMobileAnimation = mobilePointerQuery.matches;
    const isLowPowerDevice =
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4);
    const particleLimit = isMobileAnimation
      ? (isLowPowerDevice ? 2200 : 3400)
      : (isLowPowerDevice ? 4200 : 7000);
    const frameInterval = isMobileAnimation ? (isLowPowerDevice ? 1000 / 24 : 1000 / 30) : 0;
    const pointSkip = Math.max(1, Math.ceil(targetPoints.length / particleLimit));
    const particles = targetPoints
      .filter((_, pointIndex) => pointIndex % pointSkip === 0)
      .map((target) => {
        const entryEdge = Math.floor(Math.random() * 4);
        let originX;
        let originY;

        if (entryEdge === 0) {
          originX = Math.random() * width;
          originY = -8 - Math.random() * height * 0.12;
        } else if (entryEdge === 1) {
          originX = width + 8 + Math.random() * width * 0.12;
          originY = Math.random() * height;
        } else if (entryEdge === 2) {
          originX = Math.random() * width;
          originY = height + 8 + Math.random() * height * 0.12;
        } else {
          originX = -8 - Math.random() * width * 0.12;
          originY = Math.random() * height;
        }

        const normalizedX = target.x / width;
        const normalizedY = target.y / height;
        const flowAngle =
          Math.sin(normalizedX * 11.7 + normalizedY * 7.1) * Math.PI
          + Math.cos(normalizedY * 13.3 - normalizedX * 5.4) * 1.4;
        const flowStrength = width * (0.08 + Math.random() * 0.34);
        const distanceX = target.x - originX;
        const distanceY = target.y - originY;
        const distance = Math.max(1, Math.hypot(distanceX, distanceY));

        return {
          targetX: target.x,
          targetY: target.y,
          offsetX: originX - target.x + Math.cos(flowAngle) * flowStrength * 0.16,
          offsetY: originY - target.y + Math.sin(flowAngle) * flowStrength * 0.16,
          waveX: width * (0.008 + Math.random() * 0.045),
          waveY: height * (0.018 + Math.random() * 0.09),
          frequencyX: 0.8 + Math.random() * 3.6,
          frequencyY: 0.7 + Math.random() * 4.1,
          phase: Math.random() * Math.PI * 2,
          phaseTwo: Math.random() * Math.PI * 2,
          perpendicularX: -distanceY / distance,
          perpendicularY: distanceX / distance,
          meander: width * (0.018 + Math.random() * 0.075),
          streamFrequency: 0.8 + Math.random() * 2.8,
          arrivalDelay: Math.random() * 0.34,
          settlePower: 2.2 + Math.random() * 2.4,
        };
      });

    const duration = 2280;
    const startDelay = 420;
    let startTime = 0;
    let lastFrameTime = 0;

    document.body.appendChild(canvas);
    line.classList.add("is-pixelating");

    function renderPixelate(timestamp) {
      if (!startTime) {
        startTime = timestamp + startDelay;
      }

      if (timestamp < startTime) {
        window.requestAnimationFrame(renderPixelate);
        return;
      }

      if (document.hidden) {
        line.classList.remove("is-pixelating", "is-settling");
        line.classList.add("is-pixelated");
        canvas.remove();
        return;
      }

      if (frameInterval && timestamp - lastFrameTime < frameInterval) {
        window.requestAnimationFrame(renderPixelate);
        return;
      }

      lastFrameTime = timestamp;

      canvas.style.visibility = "visible";
      const progress = Math.min(1, (timestamp - startTime) / duration);
      const finalBlendRaw = Math.max(0, Math.min(1, (progress - 0.72) / 0.28));
      const finalBlend = finalBlendRaw * finalBlendRaw * (3 - 2 * finalBlendRaw);

      if (finalBlend > 0) {
        line.classList.add("is-settling");
      }

      outputContext.clearRect(0, 0, width, height);
      outputContext.imageSmoothingEnabled = false;
      outputContext.fillStyle = "#fd1c03";
      outputContext.globalAlpha = Math.pow(1 - finalBlend, 1.35);

      const timeSpin = progress * Math.PI * 2;

      particles.forEach((particle) => {
        const particleProgress = Math.max(
          0,
          Math.min(1, (progress - particle.arrivalDelay) / (1 - particle.arrivalDelay))
        );
        const settle = 1 - Math.pow(1 - particleProgress, particle.settlePower);
        const chaos = 1 - settle;
        const streamWave = Math.sin(
          particleProgress * Math.PI * 2 * particle.streamFrequency + particle.phase
        ) * particle.meander * chaos;
        const flowingX = particle.offsetX * chaos
          + Math.sin(timeSpin * particle.frequencyX + particle.phase) * particle.waveX * chaos
          + particle.perpendicularX * streamWave;
        const flowingY = particle.offsetY * chaos
          + Math.cos(timeSpin * particle.frequencyY + particle.phaseTwo) * particle.waveY * chaos
          + particle.perpendicularY * streamWave;
        const microNoiseX = Math.sin(timeSpin * 9.7 + particle.phaseTwo * 2.1) * 2.5 * chaos;
        const microNoiseY = Math.cos(timeSpin * 8.3 + particle.phase * 2.4) * 2.5 * chaos;
        const x = particle.targetX + flowingX + microNoiseX;
        const y = particle.targetY + flowingY + microNoiseY;

        outputContext.fillRect(Math.round(x), Math.round(y), 1, 1);
      });

      outputContext.globalAlpha = 1;

      if (progress < 1) {
        window.requestAnimationFrame(renderPixelate);
        return;
      }

      line.classList.remove("is-pixelating", "is-settling");
      line.classList.add("is-pixelated");
      canvas.remove();
    }

    window.requestAnimationFrame(renderPixelate);
  });
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

initBlobTracker();

function setMenuOpen(isOpen) {
  if (!siteHeader || !menuToggle) {
    return;
  }

  siteHeader.classList.toggle("is-menu-open", isOpen);
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

window.addEventListener("scroll", () => {
  if (!heroMedia || reducedMotionQuery.matches) {
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

  return `Music video still ${readableName} from Vida Benedek's directing portfolio`;
}

function getClipFrameSources() {
  return clipFrameSources;
}

function getNextFrameSelection() {
  const activeFrameSources = getClipFrameSources();
  const currentSet = new Set(currentFrameSelection);
  const availableSources = activeFrameSources.filter((source) => !currentSet.has(source));
  const selectionPool = availableSources.length >= frameButtons.length ? availableSources : activeFrameSources;
  const nextSelection = shuffleArray(selectionPool).slice(0, frameButtons.length);

  if (nextSelection.length < frameButtons.length) {
    return shuffleArray(activeFrameSources).slice(0, frameButtons.length);
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
  currentFrameSelection = getClipFrameSources().slice(0, frameButtons.length);

  frameButtons.forEach((button, index) => {
    const image = button.querySelector("img");
    if (image) {
      button.setAttribute("aria-label", `Show another random music video frame. Current image: ${image.alt}`);
    }
  });

  frameButtons.forEach((button) => {
    button.addEventListener("click", randomizeFrames);
  });

  if (randomizeFramesButton) {
    randomizeFramesButton.addEventListener("click", randomizeFrames);
  }
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

if (lazyVideos.length) {
  const videoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;

        if (!entry.isIntersecting) {
          video.pause();
          return;
        }

        const deferDesktopVideoOnMobile =
          video.dataset.videoAutoplay === "desktop" &&
          window.matchMedia("(max-width: 760px)").matches &&
          video.dataset.sourceLoaded !== "true";

        if (deferDesktopVideoOnMobile) {
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
