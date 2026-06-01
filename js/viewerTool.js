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

// 双指缩放专用
let isPinching = false;
let lastDistance = 0;
let startScale = 1;

export function resetView(el) {
  currentScale = 1;
  currentX = 0;
  currentY = 0;
  el.style.transformOrigin = "center center";
  el.style.transition = "";
  el.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;
}

export function stepZoom(el, isIncrease) {
  el.style.transformOrigin = "center center";
  if (isIncrease) {
    currentScale += scaleStep;
    if (currentScale > maxScale) currentScale = maxScale;
  } else {
    currentScale -= scaleStep;
    if (currentScale < minScale) currentScale = minScale;
  }
  updateTransform(el);
}

function updateTransform(el) {
  el.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;
}

export function applyTransform(el, scale) {
  currentScale = Math.max(minScale, Math.min(maxScale, scale));
  currentX = 0;
  currentY = 0;
  el.style.transformOrigin = "center center";
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
  // 初始清空过渡，防止全局过渡干扰手势
  el.style.transition = "none";

  // 鼠标拖拽（桌面）
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

  // 移动端单指拖拽 + 双指缩放（修复起步跳动）
  el.addEventListener("touchstart", (e) => {
    // 先强制关闭过渡，杜绝原点切换跳动
    el.style.transition = "none";

    if (e.touches.length === 2) {
      isPinching = true;
      isDragging = false;

      const t1 = e.touches[0];
      const t2 = e.touches[1];

      // 计算手指中点 & 相对元素坐标
      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      const rect = el.getBoundingClientRect();
      const ox = cx - rect.left;
      const oy = cy - rect.top;

      // 切换缩放原点（无过渡，不会跳）
      el.style.transformOrigin = `${ox}px ${oy}px`;

      // 记录初始状态
      const d = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      lastDistance = d;
      startScale = currentScale;

      e.preventDefault();
    }
    else if (e.touches.length === 1 && !isPinching) {
      if (currentScale <= 1) return;
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
    if (e.touches.length === 2 && isPinching) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const d = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = d / lastDistance;
      currentScale = Math.max(minScale, Math.min(maxScale, startScale * ratio));
      updateTransform(el);
    }
    else if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      const t = e.touches[0];
      currentX = startTX + (t.clientX - startX);
      currentY = startTY + (t.clientY - startY);
      updateTransform(el);
    }
  });

  el.addEventListener("touchend", (e) => {
    // 所有手指抬起后，重置手势状态 + 恢复原点为中心
    if (e.touches.length === 0) {
      isDragging = false;
      isPinching = false;
      el.style.transformOrigin = "center center";
    }
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
