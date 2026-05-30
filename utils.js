/**
 * 智能日志：
 * 页面有 #debug-log 则输出到界面
 * 否则只输出到 F12 Console
 * 不依赖、不报错、生产安全
 */
export function log(msg) {
  const time = new Date().toLocaleTimeString();
  const logText = `[${time}] ${msg}`;
  
  // 永远输出到控制台
  console.log(logText);

  // 有日志框才输出到页面
  const logBox = document.getElementById('debug-log');
  if (logBox) {
    logBox.textContent += logText + '\n';
    logBox.scrollTop = logBox.scrollHeight;
  }
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * 环境判断
 */
export function getCurrentEnv() {
  const host = location.host.toLowerCase();
  if (host.includes('github.io')) return 'github';
  if (host.includes('daxumi.top')) return 'cloudflare';
  return 'local';
}

/**
 * 网络类型（仅显示，不影响逻辑）
 */
export function getNetworkType() {
  const conn = navigator.connection || {};
  switch (conn.type) {
    case 'wifi': return 'WiFi';
    case 'cellular': return '移动网络';
    default: return '未知网络';
  }
}
