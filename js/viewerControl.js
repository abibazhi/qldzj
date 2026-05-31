// 通用图片查看控制器：缩放、拖拽、复位
let scale = 1;         // 当前缩放比例 1=原始大小
let translateX = 0;    // 图片水平偏移
let translateY = 0;    // 图片垂直偏移

// ====================== 【配置区：你要改的全在这里！】 ======================
const config = {
  minScale: 1,             // 最小缩放（不能缩小）
  maxScale: 5,             // 最大缩放（最多放大5倍）
  
  // 🔥 【重要】每次点击放大/缩小的比例
  // 1.1 = 放大10%，1.2=放大20%，想更猛就改大
  //scaleFactor: 1.1,       

  //dragSpeed: 1.5          // 拖拽速度（不用改）

  // 🔥 缩放步长：原1.1 → 改为 1.06，单次放大更平缓，不会跳变
  scaleFactor: 1.06,       

  // 🔥 拖拽灵敏度：原1.5 → 改为 1.0，拖拽跟随更稳重，不会飘
  dragSpeed: 0.5     
};
// ==========================================================================

// 更新图片变换（内部用，不用管）
function update(wrapper) {
  wrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

// 边界限制，不让图片拖出屏幕（内部用）
function clamp() {
  const max = (scale - 1) * Math.max(window.innerWidth, window.innerHeight) / 2;
  translateX = Math.max(-max, Math.min(max, translateX));
  translateY = Math.max(-max, Math.min(max, translateY));
}

// ==========================================================================
// 🔥 核心函数：以某个点 (cx, cy) 为中心进行缩放
// 你问的：放大缩小倍数怎么调？
// 答案：ratio 参数决定 → 大于1=放大，小于1=缩小
// 例如：ratio=1.1 → 放大10%；ratio=0.9 → 缩小10%
// ==========================================================================
export function zoomAtCenter(cx, cy, ratio, wrapper) {
  const oldScale = scale;      // 保存旧的缩放值
  scale = scale * ratio;       // 计算新的缩放：scale × 比例

  // 限制在最大/最小范围内
  scale = Math.max(config.minScale, Math.min(config.maxScale, scale));

  // 让中心点保持不动（核心算法，不用理解，会用就行）
  translateX = cx - (cx - translateX) * (scale / oldScale);
  translateY = cy - (cy - translateY) * (scale / oldScale);

  clamp();
  update(wrapper);
}

// ==========================================================================
// 🔥 放大按钮（zoomIn）
// 问题：以哪里为中心放大？
// 答案：以【整个屏幕的中心点】放大！
// ==========================================================================
export function zoomIn(wrapper) {
  // 屏幕正中心坐标
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  // 调用核心缩放，使用 config.scaleFactor 放大
  zoomAtCenter(centerX, centerY, config.scaleFactor, wrapper);
}

// ==========================================================================
// 🔥 缩小按钮（zoomOut）
// 同样：以屏幕正中心缩小
// ==========================================================================
export function zoomOut(wrapper) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  // 缩小 = 1 / scaleFactor
  zoomAtCenter(centerX, centerY, 1 / config.scaleFactor, wrapper);
}

// 重置视图（恢复原始大小，回到中心）
export function resetView(wrapper) {
  scale = 1;
  translateX = 0;
  translateY = 0;
  update(wrapper);
}

// 拖拽图片（移动）
export function drag(dx, dy, wrapper) {
  translateX += dx * config.dragSpeed;
  translateY += dy * config.dragSpeed;
  clamp();
  update(wrapper);
}

// 判断是否已经放大（用于禁止翻页）
export function isZoomed() {
  return scale > 1;
}
