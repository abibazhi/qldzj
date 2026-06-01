// 看图引擎：鼠标+触屏双指缩放/拖拽
export let currentScale = 1;
export const scaleStep = 0.2;
export const minScale = 1;
export const maxScale = 5;

export let currentX = 0;
export let currentY = 0;

let isDragging = false;
let startX = 0, startY = 0;
let startTX = 0, startTY = 0;

let targetEl = null;
let pinchStart = null;

export function resetView(el) {
  currentScale = 1;
  currentX = 0;
  currentY = 0;
  el.style.transformOrigin = "center";
  el.style.transform = `scale(1) translate(0, 0)`;
}

export function stepZoom(el, isIncrease) {
  el.style.transformOrigin = "center";
  if (isIncrease) {
    currentScale += scaleStep;
    if (currentScale > maxScale) currentScale = maxScale;
  } else {
    currentScale -= scaleStep;
    if (currentScale < minScale) currentScale = minScale;
  }
  el.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;
}

function updateTransform(el) {
  el.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;
}

export function applyTransform(el, scale) {
  currentScale = Math.max(minScale, Math.min(maxScale, scale));
  currentX = 0;
  currentY = 0;
  el.style.transformOrigin = "center";
  updateTransform(el);
}

export function applyTransformAtOrigin(el, scale, originX, originY) {
  currentScale = scale;
  currentX = 0;
  currentY = 0;
  el.style.transformOrigin = `${originX} ${originY}`;
  updateTransform(el);
}

export function initDrag(el) {
  targetEl = el;
  el.style.willChange = "transform";

  // 鼠标拖拽
  el.addEventListener("mousedown", (e) => {
    if (currentScale <= 1) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startTX = currentX;
    startTY = currentY;
    el.style.cursor = "grab";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging || currentScale <= 1) return;
    currentX = startTX + (e.clientX - startX);
    currentY = startTY + (e.clientY - startY);
    updateTransform(targetEl);
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      targetEl.style.cursor = "auto";
    }
  });

  // ==============================
  // ✅ 终极正确双指缩放（带日志）
  // ==============================
  el.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const cx = (t1.clientX + t2.clientX) * 0.5;
      const cy = (t1.clientY + t2.clientY) * 0.5;
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

      pinchStart = {
        centerX: cx,
        centerY: cy,
        dist: dist,
        scale: currentScale,
        x: currentX,
        y: currentY
      };

      console.log("[START]捏合点:", cx, cy);
      console.log("[START]初始scale:", currentScale);
      console.log("[START]初始x,y:", currentX, currentY);

      e.preventDefault();
    } else if (e.touches.length === 1 && currentScale > 1) {
      isDragging = true;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startTX = currentX;
      startTY = currentY;
      e.preventDefault();
    }
  });

  el.addEventListener("touchmove", (e) => {
    if (!pinchStart || e.touches.length !== 2) return;
    e.preventDefault();

    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const currDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const scaleRatio = currDist / pinchStart.dist;
    const newScale = Math.max(minScale, Math.min(maxScale, pinchStart.scale * scaleRatio));

    // ==========================
    // 🎯 【终极正确公式】
    // 符号已经彻底修复！！！
    // ==========================
    const calcX = pinchStart.x + (pinchStart.centerX * scaleRatio - pinchStart.centerX);
    const calcY = pinchStart.y + (pinchStart.centerY * scaleRatio - pinchStart.centerY);

    currentX = calcX;
    currentY = calcY;
    currentScale = newScale;
    updateTransform(el);

    console.log("======================================");
    console.log("捏合点:", pinchStart.centerX, pinchStart.centerY);
    console.log("scaleRatio:", scaleRatio);
    console.log("newScale:", newScale);
    console.log("currentX:", currentX);
    console.log("currentY:", currentY);
  });

  el.addEventListener("touchend", () => {
    pinchStart = null;
    isDragging = false;
    console.log("[END] 捏合结束");
  });
}

// 红色提示
let tipTimer = null;
export function showTempTip(text) {
  const tip = document.getElementById("floatTip");
  if (!tip) return;
  clearTimeout(tipTimer);
  tip.textContent = text;
  tip.style.display = "block";
  tipTimer = setTimeout(() => (tip.style.display = "none"), 1500);
}
