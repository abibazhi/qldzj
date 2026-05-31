// 通用视图工具：缩放 + 拖拽 + 提示（带调试日志）
export let currentScale = 1;
export const scaleStep = 0.2;
export const minScale = 1;
export const maxScale = 5;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
export let currentX = 0;
export let currentY = 0;
let targetEl = null;

export function setScale(value) {
  currentScale = value;
}

export function resetView(el) {
  currentScale = 1;
  currentX = 0;
  currentY = 0;
  el.style.transformOrigin = 'center';
  el.style.transform = 'scale(1) translate(0, 0)';
}

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

export function applyTransform(el, scale, originX = '50%', originY = 'center') {
  currentScale = scale;
  currentX = 0;
  currentY = 0;
  el.style.transformOrigin = `${originX} ${originY}`;
  el.style.transform = `scale(${scale}) translate(0, 0)`;
  
  // 调试日志
  console.log('[viewerTool] 定点放大 →', { scale, originX, originY });
}

// ========== 拖拽：带调试日志 ==========
export function initDrag(el) {
  targetEl = el;
  el.style.willChange = 'transform';

  el.addEventListener('mousedown', (e) => {
    if (currentScale <= 1) return;

    isDragging = true;
    dragStartX = e.clientX - currentX;
    dragStartY = e.clientY - currentY;
    el.style.cursor = 'grab';
    e.preventDefault();

    // 调试：按下
    console.log('=== 鼠标按下，开始拖拽 ===');
    console.log('缩放比例 currentScale:', currentScale);
    console.log('起始鼠标位置 (e.clientX/e.clientY):', e.clientX, e.clientY);
    console.log('初始偏移 dragStartX / dragStartY:', dragStartX, dragStartY);
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || currentScale <= 1) return;

    // 实时计算偏移
    currentX = e.clientX - dragStartX;
    currentY = e.clientY - dragStartY;

    // 应用偏移
    targetEl.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;

    // 调试：拖动中
    console.log('拖动中 →', {
      mouseX: e.clientX,
      mouseY: e.clientY,
      currentX,
      currentY,
      isDragging,
    });
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      targetEl.style.cursor = 'auto';

      // 调试：结束
      console.log('=== 鼠标抬起，停止拖拽 ===');
    }
  });

  document.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      targetEl.style.cursor = 'auto';
    }
  });
}

// 提示
let tipTimer = null;
export function showTempTip(text) {
  const tipDom = document.getElementById('floatTip');
  if (!tipDom) return;
  clearTimeout(tipTimer);
  tipDom.textContent = text;
  tipDom.style.display = 'block';
  tipTimer = setTimeout(() => tipDom.style.display = 'none', 1500);
}
