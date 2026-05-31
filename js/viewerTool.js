// 通用视图工具：缩放 + 拖拽 + 提示（桌面/手机共用）
export let currentScale = 1;
export const scaleStep = 0.2;
export const minScale = 1;
export const maxScale = 5;

// 拖拽状态
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
export let currentX = 0;
export let currentY = 0;
let targetEl = null;

// 惯性/顺滑相关
let rafId = null;
let lastX = 0;
let lastY = 0;
let velocityX = 0;
let velocityY = 0;
const friction = 0.92;

// 强制更新缩放值（给双击定点放大使用）
export function setScale(value) {
  currentScale = value;
}

// 重置所有视图状态
export function resetView(el) {
  currentScale = 1;
  currentX = 0;
  currentY = 0;
  velocityX = 0;
  velocityY = 0;
  el.style.transformOrigin = 'center';
  el.style.transform = `scale(1) translate(0, 0)`;
}

// 单步缩放（居中缩放）
export function stepZoom(el, isIncrease) {
  el.style.transformOrigin = 'center';
  if (isIncrease) {
    currentScale += scaleStep;
    if (currentScale > maxScale) currentScale = maxScale;
  } else {
    currentScale -= scaleStep;
    if (currentScale < minScale) currentScale = minScale;
  }
  el.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;
}

// 直接应用缩放 + 位移（给双击专用）
export function applyTransform(el, scale, originX = '50%', originY = 'center') {
  currentScale = scale;
  currentX = 0;
  currentY = 0;
  el.style.transformOrigin = `${originX} ${originY}`;
  el.style.transform = `scale(${scale}) translate(0, 0)`;
}

// 渲染
function render() {
  if (!targetEl) return;
  targetEl.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;
}

// 惯性动画
function inertiaLoop() {
  if (Math.abs(velocityX) < 0.05 && Math.abs(velocityY) < 0.05) return;
  currentX += velocityX;
  currentY += velocityY;
  velocityX *= friction;
  velocityY *= friction;
  render();
  requestAnimationFrame(inertiaLoop);
}

// 初始化拖拽监听（鼠标/触屏通用）
export function initDrag(el) {
  targetEl = el;
  el.style.willChange = 'transform';
  el.style.transform = 'translateZ(0)';

  el.addEventListener('mousedown', (e) => {
    if (currentScale <= 1) return;
    isDragging = true;
    dragStartX = e.clientX - currentX;
    dragStartY = e.clientY - currentY;
    lastX = e.clientX;
    lastY = e.clientY;
    velocityX = 0;
    velocityY = 0;
    el.style.cursor = 'grab';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || currentScale <= 1) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      currentX = e.clientX - dragStartX;
      currentY = e.clientY - dragStartY;
      velocityX = e.clientX - lastX;
      velocityY = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      render();
    });
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      targetEl.style.cursor = 'auto';
      inertiaLoop();
    }
  });

  document.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      targetEl.style.cursor = 'auto';
      inertiaLoop();
    }
  });
}

// 临时消息提示
let tipTimer = null;
export function showTempTip(text) {
  const tipDom = document.getElementById('floatTip');
  if (!tipDom) return;
  clearTimeout(tipTimer);
  tipDom.textContent = text;
  tipDom.style.display = 'block';
  tipTimer = setTimeout(() => {
    tipDom.style.display = 'none';
  }, 1500);
}
