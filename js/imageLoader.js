// imageLoader.js —— 全站唯一图片入口（正文 / 目录 C 图 / 勘误表共用）
import { ALWAYS_RELOAD_MAPPING, IMG_TIMEOUT, FIRST_TIMEOUT, COLOR_IMG_TIMEOUT, COLOR_FIRST_TIMEOUT, COLOR_IMAGE_RANGES, R2_BASE, GITHUB_BASE } from './config.js';
import { log, getCurrentEnv } from './utils.js';

// ==============================
// 状态：全部 mapping 数据只载一次
// ==============================
let currentVol = null;
export let mappingData = null;   // 当前卷 pages 数组（兼容 buildSources 取数）
let mappingAll = null;           // 全量 { vol3: { pages:[], catalog:[] } }
let lastWorkingSource = null;

// ==============================
// 加载全量映射（幂等：整个站点只 fetch 一次）
// 用 import.meta.url 定位 mapping.json，主阅读页与 /erratum/ 子目录均可访问
// ==============================
export async function loadMappingAll() {
  if (mappingAll) return mappingAll;
  try {
    const baseUrl = new URL('./mapping.json', import.meta.url);
    let url = baseUrl.href;
    if (ALWAYS_RELOAD_MAPPING) url += (url.includes('?') ? '&' : '?') + 't=' + Date.now();
    log("📥 加载: " + url);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    mappingAll = await res.json();
    log(`✅ mapping 加载完成，共 ${Object.keys(mappingAll).length} 卷`);
  } catch (e) {
    log("❌ mapping 加载失败: " + e.message);
    mappingAll = null;
  }
  return mappingAll;
}

// ==============================
// 加载指定卷的映射（兼容旧 API：mappingData 指向 pages 数组）
// ==============================
export async function loadMapping(vol) {
  const volStr = String(vol);
  const targetVol = volStr.padStart(3, '0');

  if (currentVol === targetVol && mappingData) {
    log(`✅ ${targetVol} 已缓存`);
    return true;
  }

  log(`🔄 加载新册 ${targetVol}`);
  currentVol = targetVol;
  mappingData = null;

  const all = await loadMappingAll();
  const entry = all && all[targetVol];
  if (!entry || !Array.isArray(entry.pages)) {
    log(`❌ 卷 ${targetVol} 无映射数据`);
    currentVol = null;
    return false;
  }
  mappingData = entry.pages;
  log(`✅ ${targetVol} 就绪，共 ${mappingData.length} 条`);
  return true;
}

// ==============================
// 解析 R2 URL → { vol3, name }，如 https://img.daxumi.top/001/C1.png
// name 可为数字页码或 C{n} 目录图
// ==============================
export function parseR2Url(r2Url) {
  const m = String(r2Url).match(/img\.daxumi\.top\/(\d{3})\/([^/]+)\.png$/);
  if (!m) return null;
  return { vol3: m[1], name: m[2] };
}

// ==============================
// 由卷号 + 名称查 ImgBB ID
// 页码 → entry.pages[page-1]；C{n} → entry.catalog[n-1]
// ==============================
export function getImgBBId(vol3, name) {
  if (!mappingAll) return null;
  const entry = mappingAll[vol3];
  if (!entry) return null;
  const cm = /^C(\d+)$/.exec(name);
  if (cm) {
    const seq = parseInt(cm[1], 10);
    return entry.catalog && entry.catalog[seq - 1] || null;
  }
  const page = parseInt(name, 10);
  if (!page) return null;
  return entry.pages && entry.pages[page - 1] || null;
}

// ==============================
// 生成指定卷+页的图片候选（主阅读页专用，兼容旧 API）
// ==============================
export function buildSources(vol, page) {
  const volStr = String(vol);
  const pageNum = parseInt(page, 10);
  const env = getCurrentEnv();

  const vol3 = volStr.padStart(3, '0');
  const path = `${vol3}/${pageNum}.png`;

  const githubRel = `/${path}`;
  const githubAbs = `${GITHUB_BASE}/${path}`;

  const base = {
    r2: { key: "R2", url: `${R2_BASE}/${path}` },
    githubRel: { key: "GitHub", url: githubRel },
    githubAbs: { key: "GitHub", url: githubAbs },
    imgbb: null
  };

  const id = getImgBBId(vol3, String(pageNum));
  if (id) {
    base.imgbb = { key: "ImgBB", url: `https://i.ibb.co/${id}/${vol3}-${pageNum}-png.png` };
  }

  const list = [];
  if (env === "cloudflare") {
    list.push(base.r2, base.imgbb, base.githubAbs);
  } else {
    list.push(base.githubRel, base.imgbb, base.r2);
  }
  return list.filter(Boolean);
}

// ==============================
// 由 R2 URL 生成候选（勘误表 / vols.idx 用）
// 与 buildSources 同规则：R2 / ImgBB / GitHub（C 图无 GitHub）
// ==============================
export function buildCandidates(r2Url) {
  const p = parseR2Url(r2Url);
  if (!p) return [r2Url];

  const vol3 = p.vol3;
  const path = `${vol3}/${p.name}.png`;
  const env = getCurrentEnv();
  const list = [];

  if (/^C\d+$/.test(p.name)) {
    const id = getImgBBId(vol3, p.name);
    const imgbb = id ? `https://i.ibb.co/${id}/${vol3}-${p.name}-png.png` : null;
    return [r2Url, imgbb].filter(Boolean);
  }

  const id = getImgBBId(vol3, p.name);
  const imgbb = id ? `https://i.ibb.co/${id}/${vol3}-${p.name}-png.png` : null;
  const githubAbs = `${GITHUB_BASE}/${path}`;

  if (env === "cloudflare") {
    list.push(r2Url, imgbb, githubAbs);
  } else {
    list.push(githubAbs, imgbb, r2Url);
  }
  return list.filter(Boolean);
}

// ==============================
// 跨域图片对象
// ==============================
function createImage(url) {
  const img = new Image();
  if (url.includes("r2.dev") || url.includes("ibb.co")) {
    img.crossOrigin = "anonymous";
  }
  return img;
}

// ==============================
// 测试图片是否能加载：成功返回true，失败返回false
// ==============================
export async function testImage(url, timeout = IMG_TIMEOUT) {
  return new Promise(resolve => {
    const img = createImage(url);
    let done = false;

    const timer = setTimeout(() => {
      done = true;
      console.log(`【测试】⏱️ 超时(${timeout}ms): ${url}`);
      resolve(false);
    }, timeout);

    img.onload = () => {
      if (done) return;
      clearTimeout(timer);
      console.log(`【测试】✅ 成功: ${url}`);
      resolve(true);
    };

    img.onerror = () => {
      if (done) return;
      clearTimeout(timer);
      console.log(`【测试】❌ 失败: ${url}`);
      resolve(false);
    };

    img.src = url;
  });
}

// 是否为自有源（R2/GitHub）：自有源参与快速通道记忆，ImgBB 备胎不参与
function isOwnSource(key) {
  return key === 'R2' || key === 'GitHub';
}

// 是否为彩色大图（命中 COLOR_IMAGE_RANGES）：放宽超时 + 更友好提示
export function isColorImage(vol, page) {
  const vol3 = String(vol).padStart(3, '0');
  const pageNum = parseInt(page, 10);
  return COLOR_IMAGE_RANGES.some(r =>
    r.vol === vol3 && pageNum >= r.pageStart && pageNum <= r.pageEnd
  );
}

// ==============================
// 🔥 主阅读页核心：智能获取最优图片
// ==============================
export async function getBestImageUrl(vol, page) {
  console.log("\n========================================");
  console.log("【翻页】开始加载 → 册:", vol, "页:", page);

  await loadMapping(vol);

  const sources = buildSources(vol, page);
  console.log("【图源】可用源:", sources.map(s => s.key));

  const color = isColorImage(vol, page);
  const firstTimeout = color ? COLOR_FIRST_TIMEOUT : FIRST_TIMEOUT;
  const normalTimeout = color ? COLOR_IMG_TIMEOUT : IMG_TIMEOUT;
  console.log(color ? "【大图】彩色图，放宽超时" : "【小图】黑白图，标准超时");

  // 快速通道：上次成功的自有源优先复用
  if (lastWorkingSource) {
    console.log("【快速通道】上次使用的源:", lastWorkingSource.key);
    const target = sources.find(s => s.key === lastWorkingSource.key);
    if (target) {
      const ok = await testImage(target.url, firstTimeout);
      if (ok) {
        console.log("【快速通道】✅ 成功！直接使用");
        return target;
      }
      console.log("【快速通道】❌ 失效！切换到完整重试流程");
    }
    lastWorkingSource = null;
  }

  // 自动降级：逐个试，绝不空白；首源短超时
  console.log("【自动重试】开始遍历所有可用源...");
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    const timeout = i === 0 ? firstTimeout : normalTimeout;
    console.log(`【重试】尝试(超时${timeout}ms):`, s.key, s.url);
    const ok = await testImage(s.url, timeout);
    if (ok) {
      console.log("【重试】✅ 找到可用源:", s.key);
      if (isOwnSource(s.key)) {
        lastWorkingSource = s;
      }
      return s;
    }
  }

  console.log("【错误】所有源都加载失败");
  return null;
}

// ==============================
// 勘误表 / vols.idx：候选生成（带缓存）+ 链接探测 + onerror 渐进降级
// ==============================
const candidatesCache = {};

export async function getCandidates(r2Url) {
  if (candidatesCache[r2Url]) return candidatesCache[r2Url];
  await loadMappingAll(); // 保证 mapping 就绪（幂等）
  const cands = buildCandidates(r2Url);
  candidatesCache[r2Url] = cands;
  return cands;
}

// 占位提示：隐藏图片，显示下一条占位文字
function showPlaceholder(imgEl) {
  imgEl.style.display = 'none';
  const next = imgEl.nextElementSibling;
  if (next) next.style.display = 'block';
}

// 全局降级入口（供内联 onerror 调用）
async function fallback(imgEl) {
  const r2 = imgEl.dataset.r2 || imgEl.getAttribute('src');
  if (!r2) {
    showPlaceholder(imgEl);
    return;
  }

  const cands = await getCandidates(r2);
  const failedSrc = imgEl.src;

  let idx = imgEl.dataset.fbIdx !== undefined ? parseInt(imgEl.dataset.fbIdx, 10) : -1;
  if (Number.isNaN(idx)) idx = -1;

  let nextIdx = idx;
  do {
    nextIdx++;
  } while (nextIdx < cands.length && cands[nextIdx] === failedSrc);

  if (nextIdx < cands.length) {
    imgEl.dataset.fbIdx = String(nextIdx);
    console.log(`【降级】⤵️ ${nextIdx + 1}/${cands.length}: ${cands[nextIdx]}`);
    imgEl.src = cands[nextIdx];

    const link = imgEl.closest('a[href]');
    if (link && link.getAttribute('href') === r2) {
      link.href = cands[nextIdx];
    }
  } else {
    console.warn(`【降级】❌ 全部源失败: ${r2}`);
    showPlaceholder(imgEl);
  }
}

export function getFallbackFn() {
  return fallback;
}

// 页面级图片降级入口：挂 window.__erratumFallback 并预热 mapping
// 幂等，可重复调用
export function initImageFallback() {
  window.__erratumFallback = fallback;
  loadMappingAll().catch(() => {});
}

// 默认供 old erratum 内联 onerror 使用的别名
if (typeof window !== 'undefined') {
  window.__erratumFallback = fallback;
}

// 探测单个 URL 是否可加载（链接点击降级用）
function testUrl(url, timeout = 8000) {
  return new Promise(resolve => {
    const img = new Image();
    let done = false;
    const timer = setTimeout(() => {
      done = true;
      resolve(false);
    }, timeout);
    img.onload = () => {
      if (done) return;
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      if (done) return;
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

// 解析出一个可用的图片地址（供链接点击降级）
// 遍历候选源，返回第一个能加载的绝对 URL；全部失败返回 null
export async function resolveImage(r2Url) {
  const cands = await getCandidates(r2Url);
  for (const url of cands) {
    const ok = await testUrl(url);
    if (ok) {
      console.log(`【链接源】✅ ${cands.indexOf(url) + 1}/${cands.length}: ${url}`);
      return url;
    }
  }
  console.warn(`【链接源】❌ 全部源失败: ${r2Url}`);
  return null;
}