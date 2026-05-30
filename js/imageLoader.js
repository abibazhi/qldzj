import { ALWAYS_RELOAD_MAPPING, IMG_TIMEOUT, R2_BASE, GITHUB_BASE } from './config.js';
import { log, getCurrentEnv } from './utils.js';

// ==============================
// 智能缓存
// ==============================
let currentVol = null;
export let mappingData = null;
let lastWorkingSource = null;

// ==============================
// 加载卷 mapping.js
// ==============================
export async function loadMapping(vol) {
  const targetVol = String(vol).padStart(3, '0');

  if (currentVol === targetVol && mappingData) {
    log(`✅ 卷 ${targetVol} 已缓存`);
    return true;
  }

  log(`🔄 加载新卷 ${targetVol}`);
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


// ==============================
// 测试单张图片（带自动切源）
// ==============================
export async function testImage(url) {
  return new Promise(resolve => {
    const img = createImage(url);
    const start = Date.now();
    let done = false;

    const timer = setTimeout(() => {
      done = true;
      log(`❌ ${url} | 超时`);
      lastWorkingSource = null; // 👈 加在这里：超时清空坏源
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
      lastWorkingSource = null; // 👈 加在这里：失败清空坏源
      resolve(false);
    };

    img.src = url;
  });
}




// ==============================
// 🔥 生产核心：智能获取最优图片
// ==============================

export async function getBestImageUrl1(vol, page) {
  await loadMapping(vol);
  const sources = buildSources(vol, page);

  // 👇 只遍历一次，只发一次请求
  for (const s of sources) {
    const ok = await testImage(s.url);
    if (ok) {
      lastWorkingSource = s;
      return s;
    }
  }

  return null;
}

export async function getBestImageUrl(vol, page) {
  await loadMapping(vol);
  const sources = buildSources(vol, page);

  // 🔥 【快速通道】如果有可用的源，直接用同一种源加载新图（秒切）
  if (lastWorkingSource) {
    // 找到同类型的源（R2 还是 R2，ImgBB 还是 ImgBB）
    const target = sources.find(s => s.key === lastWorkingSource.key);
    if (target) {
      lastWorkingSource = target;  // 只更新地址，不重复测试
      return target;
    }
    lastWorkingSource = null;
  }

  // 第一次加载，正常找源
  for (const s of sources) {
    const ok = await testImage(s.url);
    if (ok) {
      lastWorkingSource = s;
      return s;
    }
  }

  return null;
}


// 加在文件最后一行
window.getBestImageUrl = getBestImageUrl;
