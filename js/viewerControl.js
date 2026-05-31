// 通用图片查看控制器：缩放、拖拽、复位
let scale = 1;         // 当前缩放
let translateX = 0;    // 最终偏移 X
let translateY = 0;    // 最终偏移 Y

// ====================== 【配置区】 ======================
const config = {
  minScale: 1,
  maxScale: 5,
  scaleFactor: 1.08,    // 稍微比1.1慢一点，更舒服
  dragSpeed: 0.7,       // 拖拽速度（你原来的是 1.5，我们放慢）
  zoomSensitivity: 0.1 // 双指缩放灵敏度
};

// 更新变换
function update(wrapper) {
  wrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

// 边界限制
function clamp(wrapper) {
  const rect = wrapper.getBoundingClientRect();
  const maxX = (scale - 1) * rect.width / 2;
  const maxY = (scale - 1) * rect.height / 2;
  translateX = Math.max(-maxX, Math.min(maxX, translateX));
  translateY = Math.max(-maxY, Math.min(maxY, translateY));
}

// 中心点缩放
export function zoomAtCenter(cx, cy, ratio, wrapper) {
  const old = scale;
  scale = Math.max(config.minScale, Math.min(config.maxScale, scale * ratio));
  translateX = cx - (cx - translateX) * (scale / old);
  translateY = cy - (cy - translateY) * (scale / old);
  clamp(wrapper);
  update(wrapper);
}

// 放大
export function zoomIn(wrapper) {
  zoomAtCenter(window.innerWidth/2, window.innerHeight/2, config.scaleFactor, wrapper);
}

// 缩小
export function zoomOut(wrapper) {
  zoomAtCenter(window.innerWidth/2, window.innerHeight/2, 1/config.scaleFactor, wrapper);
}

// 重置
export function resetView(wrapper) {
  scale = 1;
  translateX = 0;
  translateY = 0;
  update(wrapper);
}

// ======================================================
// 🔥 【关键修复】恢复你原来的定位式拖拽（手机丝滑核心）
// startInfo 必须从外面传：{ startX, startY, startXVal, startYVal }
// ======================================================
export function dragAbsolute(startInfo, currentX, currentY, wrapper) {
  const dx = currentX - startInfo.startX;
  const dy = currentY - startInfo.startY;

  translateX = startInfo.startXVal + dx * config.dragSpeed;
  translateY = startInfo.startYVal + dy * config.dragSpeed;

  clamp(wrapper);
  update(wrapper);
}

// 是否放大
export function isZoomed() {
  return scale > 1;
}

// 获取配置
export function getConfig() {
  return config;
}
