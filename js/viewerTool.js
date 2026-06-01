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

// ======================
// 🔥 桌面双击专用：指定位置放大（你原来的完美效果）
// ======================
export function applyTransformAtOrigin(el, scale, originX, originY) {
  currentScale = scale;
  currentX = 0;
  currentY = 0;
  el.style.transformOrigin = `${originX} ${originY}`;
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
  let touchStartData = null;

  el.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      // ==============================================
      // 双指开始缩放：记录手指中心点、初始缩放、初始位移
      // ==============================================
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

      touchStartData = {
        centerX,
        centerY,
        startDist: dist,
        startScale: currentScale,
        startX: currentX,
        startY: currentY
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
    // ==============================================
    // 双指缩放核心修复：手指在哪里，哪里就固定不动
    // 算法：保持手指中心点在屏幕上位置不变
    // ==============================================
    if (e.touches.length === 2 && touchStartData) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scaleRatio = currDist / touchStartData.startDist;
      const newScale = Math.max(minScale, Math.min(maxScale, touchStartData.startScale * scaleRatio));

      // 计算新的偏移，让手指中心点保持不动
      const scaleDiff = newScale / touchStartData.startScale;
      currentX = touchStartData.startX + (touchStartData.centerX - touchStartData.centerX * scaleDiff);
      currentY = touchStartData.startY + (touchStartData.centerY - touchStartData.centerY * scaleDiff);
      currentScale = newScale;

      updateTransform(el);
    }
    // 单指拖拽
    else if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      const t = e.touches[0];
      currentX = startTX + (t.clientX - startX);
      currentY = startTY + (t.clientY - startY);
      updateTransform(el);
    }
  });

  el.addEventListener("touchend", () => {
    isDragging = false;
    touchStartData = null;
  });
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
