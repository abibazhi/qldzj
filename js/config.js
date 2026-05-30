/**
 * 全局配置（生产 + 调试通用）
 * 所有变量 100% 见名知意
 */

/**
 * 【仅控制 mapping.js】
 * true  = 调试：每次强制重新加载 mapping.js，不使用浏览器缓存
 * false = 上线：允许浏览器缓存 mapping.js，速度更快
 */
export const ALWAYS_RELOAD_MAPPING = false;

/**
 * 图片加载超时时间（单位：毫秒）
 * 10000 = 10秒
 */
export const IMG_TIMEOUT = 10000;

/**
 * Cloudflare R2 公共地址
 */
// export const R2_BASE = "https://pub-a0fc4de2782d448f916244913768fb78.r2.dev";
export const R2_BASE = img.daxumi.top;

/**
 * GitHub Pages 地址（用于跨域备用图）
 */
export const GITHUB_BASE = "https://abibazhi.github.io";
