// 通用视图工具：缩放 + 拖拽 + 提示（桌面/手机共用）
export let currentScale = 1;
export const scaleStep = 0.2;
export const minScale = 1;
export const maxScale = 5;

// 拖拽状态
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let currentX = 0;
let currentY = 0;
let targetEl = null;

// 重置所有视图状态
export function resetView(el) {
  currentScale = 1;
  currentX = 0;
  currentY = 0;
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

// 初始化拖拽监听（鼠标/触屏通用基础逻辑）
export function initDrag(el) {
  targetEl = el;

  // 鼠标按下
  el.addEventListener('mousedown', (e) => {
    // 仅放大状态允许拖拽
    if (currentScale <= 1) return;
    isDragging = true;
    dragStartX = e.clientX - currentX;
    dragStartY = e.clientY - currentY;
    el.style.cursor = 'grab';
  });

  // 鼠标移动
  document.addEventListener('mousemove', (e) => {
    if (!isDragging || currentScale <= 1) return;
    currentX = e.clientX - dragStartX;
    currentY = e.clientY - dragStartY;
    el.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;
  });

  // 鼠标抬起/离开
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      el.style.cursor = 'auto';
    }
  });
}

// 临时消息提示（红色浮窗，自动消失，和移动端风格统一）
let tipTimer = null;
export function showTempTip(text) {
  // 复用页面内提示元素
  const tipDom = document.getElementById('floatTip');
  if (!tipDom) return;

  clearTimeout(tipTimer);
  tipDom.textContent = text;
  tipDom.style.display = 'block';

  tipTimer = setTimeout(() => {
    tipDom.style.display = 'none';
  }, 1500);
}
