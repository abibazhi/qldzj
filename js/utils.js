/**
 * 智能日志：有 debug-log 元素就显示在页面，否则只在控制台
 */
export function log(msg) {
  const time = new Date().toLocaleTimeString();
  const logText = `[${time}] ${msg}`;
  console.log(logText);
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * 环境判断
 */
export function getCurrentEnv() {
  const host = window.location.host.toLowerCase();
  if (host.includes("github.io")) return "github";
  if (host.includes("daxumi.top") || host.includes("cloudflare")) return "cloudflare";
  return "local";
}
