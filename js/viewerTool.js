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
let isPinching = false;
let lastDistance = 0;
let startScale = 1;

export function resetView(el) {
  currentScale = 1;
  currentX = 0;
  currentY = 0;
  el.style.transformOrigin = "center center";
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
  el.style.transition = "none";

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
    if (isDragging) { isDragging = false; targetEl.style.cursor = "auto"; }
  });

  // ==============================
  // ✅ 【终极无跳动】移动端双指缩放
  // 遵循你总结的黄金规则：
  // 1. touchStart 只设置一次 origin
  // 2. touchMove 只改 scale，绝不动 origin
  // 3. 绝不中途切换基准点
  // ==============================
  el.addEventListener("touchstart", (e) => {
    el.style.transition = "none";

    if (e.touches.length === 2) {
      isPinching = true;
      isDragging = false;

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const rect = el.getBoundingClientRect();
      const cx = (t1.clientX + t2.clientX) / 2 - rect.left;
      const cy = (t1.clientY + t2.clientY) / 2 - rect.top;

      // ✅ 只设置一次！全程不变！
      el.style.transformOrigin = `${cx}px ${cy}px`;

      lastDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      startScale = currentScale;

      // ✅ 立即同步，消除跳帧
      updateTransform(el);
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
      if (lastDistance < 1) return;

      const ratio = d / lastDistance;
      currentScale = Math.max(minScale, Math.min(maxScale, startScale * ratio));

      // ✅ 只改缩放！不改原点！不改偏移！
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
    if (e.touches.length === 0) {
      isDragging = false;
      isPinching = false;
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
