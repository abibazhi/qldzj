// ============================================================
// 勘误表图片多源降级器
// 与主阅读页 imageLoader.js 相同的降级规则：
//   000 卷正文图：R2 → ImgBB → GitHub（CF 环境）/ GitHub → ImgBB → R2（其他环境）
//   C 图（目录封面）：R2 → ImgBB
// 用法：页面 <img> 加 onerror="window.__erratumFallback(this)"
//       并在 src 上带 data-r2="原始R2地址"
// 依赖：CATALOG_IMG_BB（catalog_imgbb.js 提供 C 图 ImgBB id）
import { CATALOG_IMG_BB } from './catalog_imgbb.js';
// ============================================================

let env = 'cloudflare';
let mapping000 = null;      // data/mapping.json 的 000 卷 62 项 ImgBB id 数组
let initPromise = null;     // 初始化（fetch mapping）只执行一次
const candidatesCache = {}; // r2Url -> [绝对URL候选数组]

// ==============================
// 环境判断：CF 部署 vs GitHub 镜像
// ==============================
function detectEnv() {
  const host = window.location.hostname || '';
  if (host.includes('github') || host.includes('github.io') || host.includes('localhost')) {
    return 'github';
  }
  return 'cloudflare';
}

// ==============================
// 解析 R2 URL → { vol3, name }
// https://img.daxumi.top/{vol3}/{name}.png
// ==============================
function parseR2(r2Url) {
  const m = r2Url.match(/img\.daxumi\.top\/(\d{3})\/([^/]+)\.png$/);
  if (!m) return null;
  return { vol3: m[1], name: m[2] };
}

// ==============================
// 构建候选数组（绝对 URL）
// ==============================
function buildCandidates(r2Url) {
  const p = parseR2(r2Url);
  if (!p) return [r2Url];

  const volNum = parseInt(p.vol3, 10);

  // ---- C 图（目录封面）：R2 → ImgBB ----
  const cm = p.name.match(/^C(\d+)$/);
  if (cm) {
    const catalog = CATALOG_IMG_BB || (typeof window !== 'undefined' ? window.CATALOG_IMG_BB : null) || {};
    const id = catalog[`${volNum}C${cm[1]}`];
    const imgbb = id ? `https://i.ibb.co/${id}/${p.vol3}-C${cm[1]}-png.png` : null;
    return [r2Url, imgbb].filter(Boolean);
  }

  // ---- 000 卷正文图：R2 → ImgBB → GitHub ----
  if (p.vol3 === '000') {
    const page = parseInt(p.name, 10);
    const github = `https://abibazhi.github.io/${p.vol3}/${p.name}.png`;
    let imgbb = null;
    if (mapping000 && Array.isArray(mapping000) && mapping000[page - 1]) {
      imgbb = `https://i.ibb.co/${mapping000[page - 1]}/000-${page}-png.png`;
    }
    if (env === 'cloudflare') {
      return [r2Url, imgbb, github].filter(Boolean);
    }
    return [github, imgbb, r2Url].filter(Boolean);
  }

  // ---- 其他：只有原源 ----
  return [r2Url];
}

// ==============================
// 获取候选数组（懒构建 + 缓存）
// ==============================
export async function getCandidates(r2Url) {
  if (candidatesCache[r2Url]) return candidatesCache[r2Url];

  // 000 卷需要 mapping.json，若未就绪先等待初始化
  if (parseR2(r2Url)?.vol3 === '000' && !mapping000) {
    await initErratumImages();
  }

  const cands = buildCandidates(r2Url);
  candidatesCache[r2Url] = cands;
  return cands;
}

// ==============================
// 初始化：fetch data/mapping.json 的 000 卷 ImgBB id
// 幂等，可重复调用
// ==============================
export function initErratumImages() {
  if (!initPromise) {
    initPromise = (async () => {
      env = detectEnv();
      try {
        const res = await fetch('../data/mapping.json', { cache: 'force-cache' });
        if (res.ok) {
          const data = await res.json();
          mapping000 = data['000'] || null;
          console.log(`[勘误表图片] ✅ mapping 000 卷就绪，共 ${mapping000 ? mapping000.length : 0} 张图可降级`);
        } else {
          console.warn(`[勘误表图片] mapping 加载失败: HTTP ${res.status}`);
        }
      } catch (e) {
        console.warn('[勘误表图片] mapping 加载失败:', e.message);
      }
    })();
  }
  return initPromise;
}

// ==============================
// 占位提示：隐藏图片，显示下一条占位文字
// ==============================
function showPlaceholder(imgEl) {
  imgEl.style.display = 'none';
  const next = imgEl.nextElementSibling;
  if (next) next.style.display = 'block';
}

// ==============================
// 全局降级入口（供内联 onerror 调用）
// 按候选索引逐级推进（data-fbIdx），跳过已知失败的源，
// 不依赖初始 src 在候选中的位置，两种环境（CF/GitHub）顺序都正确
// 候选耗尽时显示占位提示
// ==============================
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

  // 从下一个候选开始，跳过已知失败的源（避免重复探测）
  let nextIdx = idx;
  do {
    nextIdx++;
  } while (nextIdx < cands.length && cands[nextIdx] === failedSrc);

  if (nextIdx < cands.length) {
    imgEl.dataset.fbIdx = String(nextIdx);
    console.log(`[勘误表图片] ⤵️ 降级 ${nextIdx + 1}/${cands.length}: ${cands[nextIdx]}`);
    imgEl.src = cands[nextIdx];

    // 同步更新外层链接 href，点击也能打开可用图片
    const link = imgEl.closest('a[href]');
    if (link && link.getAttribute('href') === r2) {
      link.href = cands[nextIdx];
    }
  } else {
    console.warn(`[勘误表图片] ❌ 全部源失败: ${r2}`);
    showPlaceholder(imgEl);
  }
}

window.__erratumFallback = fallback;

// ==============================
// 探测单个 URL 是否可加载
// ==============================
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

// ==============================
// 解析出一个可用的图片地址（供链接点击降级用）
// 遍历候选源，返回第一个能加载的绝对 URL；全部失败返回 null
// ==============================
export async function resolveImage(r2Url) {
  const cands = await getCandidates(r2Url);
  for (const url of cands) {
    const ok = await testUrl(url);
    if (ok) {
      console.log(`[勘误表图片] 🔗 链接源 ${cands.indexOf(url) + 1}/${cands.length}: ${url}`);
      return url;
    }
  }
  console.warn(`[勘误表图片] ❌ 链接全部源失败: ${r2Url}`);
  return null;
}

// 页面加载后预热 mapping（不阻塞渲染）
if (typeof window !== 'undefined') {
  initErratumImages();
}
