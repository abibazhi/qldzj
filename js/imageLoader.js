import { ALWAYS_RELOAD_MAPPING, IMG_TIMEOUT, R2_BASE, GITHUB_BASE } from './config.js';
import { log, getCurrentEnv } from './utils.js';

// ==============================
// 智能缓存
// ==============================
let currentVol = null;
export let mappingData = null;
let lastWorkingSource = null;

// ==============================
// 加载册 mapping.js
// ==============================
export async function loadMapping(vol) {
  const targetVol = String(vol).padStart(3, '0');

  if (currentVol === targetVol && mappingData) {
    log(`✅ 册 ${targetVol} 已缓存`);
    return true;
  }

  log(`🔄 加载新册 ${targetVol}`);
  currentVol = targetVol;
  mappingData = null;

  try {
    const env = getCurrentEnv();
    let url;

    if (env === "cloudflare") {
      url = `${R2_BASE}/${currentVol}/mapping.js`;
    } else {
      url = `/${currentVol}/mapping.js`;
    }

    if (ALWAYS_RELOAD_MAPPING) {
      url += "?t=" + Date.now();
    }
    log("📥 加载: " + url);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    const match = text.match(/const\s+mappingData\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) throw new Error("解析失败");

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

// ==============================
// 生成图片优先级
// ==============================
export function buildSources(vol, page) {
  const vol3 = String(vol).padStart(3, '0');
  const pageNum = parseInt(page, 10);
  const env = getCurrentEnv();

  const githubRel = `/${vol3}/${pageNum}.png`;
  const githubAbs = `${GITHUB_BASE}/${vol3}/${pageNum}.png`;

  const base = {
    r2: { key: "R2", url: `${R2_BASE}/${vol3}/${pageNum}.png` },
    githubRel: { key: "GitHub", url: githubRel },
    githubAbs: { key: "GitHub", url: githubAbs },
    imgbb: null
  };

  if (mappingData && Array.isArray(mappingData)) {
    const idx = pageNum - 1;
    if (idx >= 0 && mappingData[idx]) {
      base.imgbb = {
        key: "ImgBB",
        url: `https://i.ibb.co/${mappingData[idx]}/${vol3}-${pageNum}-png.png`
      };
    }
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
// 测试单张图片
// ==============================
export async function testImage1(url) {
  return new Promise(resolve => {
    const img = createImage(url);
    const start = Date.now();
    let done = false;

    const timer = setTimeout(() => {
      done = true;
      log(`❌ ${url} | 超时`);
      resolve(false);
    }, IMG_TIMEOUT);

    img.onload = () => {
      if (done) return;
      clearTimeout(timer);
      log(`✅ ${url} | 成功`);
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

// 测试图片是否能加载：成功返回true，失败返回false
export async function testImage(url) {
  return new Promise(resolve => {
    const img = createImage(url);
    let done = false;

    // 超时保护：太久没加载也算失败
    const timer = setTimeout(() => {
      done = true;
      console.log(`【测试】⏱️ 超时: ${url}`);
      resolve(false);
    }, IMG_TIMEOUT);

    // 图片加载成功
    img.onload = () => {
      if (done) return;
      clearTimeout(timer);
      console.log(`【测试】✅ 成功: ${url}`);
      resolve(true);
    };

    // 图片加载失败
    img.onerror = () => {
      if (done) return;
      clearTimeout(timer);
      console.log(`【测试】❌ 失败: ${url}`);
      resolve(false);
    };

    img.src = url;
  });
}
// ==============================
// 🔥 生产核心：智能获取最优图片
// ==============================

export async function getBestImageUrl(vol, page) {
  console.log("\n========================================");
  console.log("【翻页】开始加载 → 册:", vol, "页:", page);

  // 1. 加载当前册的 mapping（只加载一次）
  await loadMapping(vol);

  // 2. 生成当前页的所有图源列表（R2 / ImgBB / GitHub）
  const sources = buildSources(vol, page);
  console.log("【图源】可用源:", sources.map(s => s.key));

  // --------------------------------------------------------------------
  // 【快速通道】如果上次有成功的源，优先用同一种源（速度最快）
  // --------------------------------------------------------------------
  if (lastWorkingSource) {
    console.log("【快速通道】上次使用的源:", lastWorkingSource.key);

    // 找到同类型的源（比如上次是R2，这次还用R2）
    const target = sources.find(s => s.key === lastWorkingSource.key);

    if (target) {
      console.log("【快速通道】尝试加载:", target.key, target.url);

      // 测试能不能加载
      const ok = await testImage(target.url);

      if (ok) {
        console.log("【快速通道】✅ 成功！直接使用，不切换");
        lastWorkingSource = target; // 保存当前新地址
        return target;
      }

      // 如果快速通道失败 → 不空白！继续往下走
      console.log("【快速通道】❌ 失效！自动切换到完整重试流程");
    }

    // 失效后清空，下次重新选择
    lastWorkingSource = null;
  }

  // --------------------------------------------------------------------
  // 【自动降级】一个一个试，直到成功，绝不空白！
  // --------------------------------------------------------------------
  console.log("【自动重试】开始遍历所有可用源...");
  for (const s of sources) {
    console.log("【重试】尝试:", s.key, s.url);

    const ok = await testImage(s.url);
    if (ok) {
      console.log("【重试】✅ 找到可用源:", s.key);
      lastWorkingSource = s; // 缓存这个源，下次快速通道
      return s;
    }
  }

  // 所有源都挂了（极少出现）
  console.log("【错误】所有源都加载失败");
  return null;
}





// 加在文件最后一行
//window.getBestImageUrl = getBestImageUrl;
