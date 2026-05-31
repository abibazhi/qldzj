// 🔥 终极通用看图引擎：桌面鼠标 + 手机触屏 100% 自动适配
export let currentScale = 1;
export const scaleStep = 0.2;
export const minScale = 1;
export const maxScale = 5;

export let currentX = 0;
export let currentY = 0;

let isDragging = false;
let startX = 0;
let startY = 0;
let startTX = 0;
let startTY = 0;

let targetEl = null;

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

export function applyTransform(el, scale) {
  currentScale = Math.max(minScale, Math.min(maxScale, scale));
  currentX = 0;
  currentY = 0;
  el.style.transformOrigin = "center";
  el.style.transform = `scale(${currentScale}) translate(0, 0)`;
}

// 统一渲染
function updateTransform(el) {
  el.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;
}

// 初始化拖拽 + 触屏（自动识别设备）
export function initDrag(el) {
  targetEl = el;
  el.style.willChange = "transform";

  // ======================
  // 桌面端：鼠标拖拽
  // ======================
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

  // ======================
  // 移动端：触屏 + 双指缩放
  // ======================
  let touch1, touch2, startDist, startScaleVal;

  el.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      // 双指开始缩放
      touch1 = e.touches[0];
      touch2 = e.touches[1];
      startDist = getDist(touch1, touch2);
      startScaleVal = currentScale;
      e.preventDefault();
    } else if (e.touches.length === 1 && currentScale > 1) {
      // 单指开始拖拽
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
    if (e.touches.length === 2) {
      // 双指缩放
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = getDist(t1, t2);
      const scale = startScaleVal * (dist / startDist);
      applyTransform(el, scale);
      e.preventDefault();
    } else if (e.touches.length === 1 && isDragging) {
      // 单指拖拽
      const t = e.touches[0];
      currentX = startTX + (t.clientX - startX);
      currentY = startTY + (t.clientY - startY);
      updateTransform(el);
      e.preventDefault();
    }
  });

  el.addEventListener("touchend", () => {
    isDragging = false;
  });

  function getDist(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  }
}

// 红色自动消失提示
let tipTimer = null;
export function showTempTip(text) {
  const tip = document.getElementById("floatTip");
  if (!tip) return;
  clearTimeout(tipTimer);
  tip.textContent = text;
  tip.style.display = "block";
  tipTimer = setTimeout(() => (tip.style.display = "none"), 1500);
}
