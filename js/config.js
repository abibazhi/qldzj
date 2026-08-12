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
 * 首个自有源（R2/GitHub）的快速超时（单位：毫秒）
 * 4000 = 4秒：源挂了快速切走，避免干等 10 秒
 */
export const FIRST_TIMEOUT = 4000;

/**
 * 彩色大图（1~3MB）的放宽超时（单位：毫秒）
 * 见 COLOR_IMAGE_RANGES：命中范围时用下面两个值替代 FIRST_TIMEOUT / IMG_TIMEOUT
 */
export const COLOR_FIRST_TIMEOUT = 8000;
export const COLOR_IMG_TIMEOUT = 20000;

/**
 * 彩色大图的页码范围（vol 为三位卷号，page 为 1 起始页码）
 * 命中范围的图片按大图处理：放宽超时 + 更友好的加载提示
 */
export const COLOR_IMAGE_RANGES = [
  { vol: '001', pageStart: 1, pageEnd: 162 },
];

/**
 * Cloudflare R2 公共地址
 */
// export const R2_BASE = "https://pub-a0fc4de2782d448f916244913768fb78.r2.dev";
export const R2_BASE = "https://img.daxumi.top";

/**
 * GitHub Pages 地址（用于跨域备用图）
 */
export const GITHUB_BASE = "https://abibazhi.github.io";
