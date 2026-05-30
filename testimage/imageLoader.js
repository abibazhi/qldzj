import { DISABLE_CACHE, IMG_TIMEOUT, R2_BASE, GITHUB_BASE } from './config.js';
import { log, getCurrentEnv } from './utils.js';

// ==============================
// 智能缓存：同卷只加载一次
// ==============================
let currentVol = null;
export let mappingData = null;

/**
 * 加载卷对应的 mapping.js
 * 规则：
 * 1. 同一卷 → 内存缓存，只加载一次
 * 2. 切换卷 → 自动重新加载
 * 3. 解析结果永久缓存，不重复消耗性能
 */
export async function loadMapping(vol) {
  const targetVol = String(vol).padStart(3, '0');

  // 同一卷已缓存 → 直接使用
  if (currentVol === targetVol && mappingData) {
    log(`✅ 卷${targetVol} 已缓存，直接使用`);
    return true;
  }

  // 换卷 / 首次加载 → 重置缓存
  log(`🔄 加载新卷 ${targetVol}`);
  currentVol = targetVol;
  mappingData = null;

  try {
    const env = getCurrentEnv();
    const url = env === 'github'
      ? `/${currentVol}/mapping.js`
      : `${R2_BASE}/${currentVol}/mapping.js`;

    const finalUrl = DISABLE_CACHE ? `${url}?t=${Date.now()}` : url;
    log("📥 下载: " + finalUrl);

    const res = await fetch(finalUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    const match = text.match(/const\s+mappingData\s*=\s*(\[[\s\S]*?\]);/i);
    if (!match) throw new Error("格式解析失败");

    mappingData = JSON.parse(match[1]);
    log(`✅ 解析成功，共 ${mappingData.length} 条`);
    return true;

  } catch (e) {
    log("❌ mapping 加载失败: " + e.message);
    mappingData = null;
    currentVol = null;
    return false;
  }
}

/**
 * 按环境生成图源优先级
 */
export function buildSources(vol, page) {
  const vol3 = String(vol).padStart(3, '0');
  const pageNum = parseInt(page, 10);
  const env = getCurrentEnv();

  const base = {
    r2: { key: "R2", url: `${R2_BASE}/${vol3}/${pageNum}.png` },
    ghAbs: { key: "GitHub绝对", url: `${GITHUB_BASE}/${vol3}/${pageNum}.png` },
    ghRel: { key: "GitHub相对", url: `/${vol3}/${pageNum}.png` },
    imgbb: null
  };

  // 有 mapping 才加入 ImgBB
  if (mappingData) {
    const idx = pageNum - 1;
    if (idx >= 0 && idx < mappingData.length && mappingData[idx]) {
      base.imgbb = {
        key: "ImgBB",
        url: `https://i.ibb.co/${mappingData[idx]}/${vol3}/${pageNum}.png`
      };
    }
  }

  // 环境优先级
  const list = [];
  if (env === "cloudflare") {
    list.push(base.r2, base.imgbb, base.ghAbs, base.ghRel);
  } else if (env === "github") {
    list.push(base.ghRel, base.ghAbs, base.imgbb, base.r2);
  } else {
    list.push(base.r2, base.ghAbs, base.ghRel, base.imgbb);
  }

  return list.filter(Boolean);
}

/**
 * 创建图片对象 + 智能跨域
 * R2 / ImgBB 需要跨域才能探测状态
 * GitHub 不加，避免报错
 */
function createImageObject(url) {
  const img = new Image();
  if (url.includes("r2.dev") || url.includes("ibb.co")) {
    img.crossOrigin = "anonymous";
  }
  return img;
}

/**
 * 等待图片加载/失败/超时
 */
function waitForImageLoad(img, url, timeoutMs) {
  return new Promise(resolve => {
    const start = Date.now();
    let done = false;

    const timer = setTimeout(() => {
      done = true;
      log(`❌ ${url} | 超时`);
      resolve(false);
    }, timeoutMs);

    img.onload = () => {
      if (done) return;
      clearTimeout(timer);
      log(`✅ ${url} | 成功 ${Date.now() - start}ms`);
      resolve(true);
    };

    img.onerror = () => {
      if (done) return;
      clearTimeout(timer);
      log(`❌ ${url} | 失败`);
      resolve(false);
    };

    img.src = url;
  });
}

/**
 * 测试图片可用性
 */
export function testImage(url) {
  const img = createImageObject(url);
  return waitForImageLoad(img, url, IMG_TIMEOUT);
}
