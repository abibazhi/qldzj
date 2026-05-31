// 通用图片查看控制器：缩放、拖拽、复位
let scale = 1;
let translateX = 0;
let translateY = 0;

const config = {
  minScale: 1,
  maxScale: 5,
  scaleFactor: 1.08,
  dragSpeed: 0.7,
  zoomSensitivity: 0.1
};

function update(wrapper) {
  wrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

function clamp() {
  const maxTX = (scale - 1) * window.innerWidth / 2;
  const maxTY = (scale - 1) * window.innerHeight / 2;
  translateX = Math.max(-maxTX, Math.min(maxTX, translateX));
  translateY = Math.max(-maxTY, Math.min(maxTY, translateY));
}

export function zoomAtCenter(cx, cy, ratio, wrapper) {
  const oldScale = scale;
  scale = Math.max(config.minScale, Math.min(config.maxScale, scale * ratio));
  translateX = cx - (cx - translateX) * (scale / oldScale);
  translateY = cy - (cy - translateY) * (scale / oldScale);
  clamp();
  update(wrapper);
}

export function zoomIn(wrapper) {
  zoomAtCenter(window.innerWidth/2, window.innerHeight/2, config.scaleFactor, wrapper);
}

export function zoomOut(wrapper) {
  zoomAtCenter(window.innerWidth/2, window.innerHeight/2, 1/config.scaleFactor, wrapper);
}

export function resetView(wrapper) {
  scale = 1;
  translateX = 0;
  translateY = 0;
  update(wrapper);
}

export function dragAbsolute(startInfo, currentX, currentY, wrapper) {
  const dx = currentX - startInfo.startX;
  const dy = currentY - startInfo.startY;
  translateX = startInfo.startXVal + dx * config.dragSpeed;
  translateY = startInfo.startYVal + dy * config.dragSpeed;
  clamp();
  update(wrapper);
}

export function getTransform() {
  return { translateX, translateY, scale };
}

export function isZoomed() {
  return scale > 1;
}
