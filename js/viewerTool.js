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

// 双指缩放专用变量
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

  // ---------- 桌面鼠标拖拽 ----------
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

  // ---------- 移动端触屏：单指拖拽 + 双指缩放 ----------
  el.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      // 双指开始：记录初始状态
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

      pinchStart = {
        centerX,
        centerY,
        dist,
        scale: currentScale,
        x: currentX,
        y: currentY
      };
      e.preventDefault();
    } else if (e.touches.length === 1 && currentScale > 1) {
      // 单指拖拽
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
    if (e.touches.length === 2 && pinchStart) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currCenterX = (t1.clientX + t2.clientX) / 2;
      const currCenterY = (t1.clientY + t2.clientY) / 2;
      const currDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

      // 1. 计算新缩放
      const newScale = Math.max(minScale, Math.min(maxScale, pinchStart.scale * (currDist / pinchStart.dist)));

      // 2. 核心修复：保持「手指中心点」在屏幕上位置不变
      // 公式：新位移 = 旧位移 + 中心点偏移 × (1 - 缩放比例)
      currentX = pinchStart.x + (currCenterX - pinchStart.centerX) - pinchStart.centerX * (newScale - pinchStart.scale);
      currentY = pinchStart.y + (currCenterY - pinchStart.centerY) - pinchStart.centerY * (newScale - pinchStart.scale);

      currentScale = newScale;
      updateTransform(el);
    } else if (e.touches.length === 1 && isDragging) {
      // 单指拖拽
      e.preventDefault();
      const t = e.touches[0];
      currentX = startTX + (t.clientX - startX);
      currentY = startTY + (t.clientY - startY);
      updateTransform(el);
    }
  });

  el.addEventListener("touchend", () => {
    isDragging = false;
    pinchStart = null;
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
