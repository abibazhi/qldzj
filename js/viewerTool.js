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
  // 触屏双指缩放（带调试日志）
  // ==============================
  el.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

      pinchStart = {
        centerX: cx,
        centerY: cy,
        dist: dist,
        scale: currentScale,
        x: currentX,
        y: currentY
      };

      // 🟢 调试输出
      console.log("【TOUCH START】双指开始位置：", cx, cy);
      console.log("【TOUCH START】初始缩放：", currentScale);
      console.log("【TOUCH START】初始位移：", currentX, currentY);

      e.preventDefault();
    }
  });

  el.addEventListener("touchmove", (e) => {
    if (!pinchStart || e.touches.length !== 2) return;

    e.preventDefault();
    const t1 = e.touches[0];
    const t2 = e.touches[1];

    const currCX = (t1.clientX + t2.clientX) / 2;
    const currCY = (t1.clientY + t2.clientY) / 2;
    const currDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

    const scaleRatio = currDist / pinchStart.dist;
    const newScale = Math.max(minScale, Math.min(maxScale, pinchStart.scale * scaleRatio));

    // ==========================
    // 【核心公式】目前导致左上飘
    // ==========================
    const dx = pinchStart.x + (currCX - pinchStart.centerX) - pinchStart.centerX * (newScale - pinchStart.scale);
    const dy = pinchStart.y + (currCY - pinchStart.centerY) - pinchStart.centerY * (newScale - pinchStart.scale);

    currentX = dx;
    currentY = dy;
    currentScale = newScale;

    updateTransform(el);

    // 🟢 调试输出
    console.log("======================================");
    console.log("手指中心点：", currCX, currCY);
    console.log("旧缩放：", pinchStart.scale, "→ 新缩放：", newScale);
    console.log("计算位移：dx=", dx, " dy=", dy);
  });

  el.addEventListener("touchend", () => {
    pinchStart = null;
    isDragging = false;
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
