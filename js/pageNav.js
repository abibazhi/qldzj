// pageNav.js
import { getQueryVariable } from './utils.js';

// 册页数：懒加载自 data/cache/page_counts.json（gen_cache.mjs 生成，168册）
let pageCounts = null;
let pageCountsPromise = null;

/**
 * 加载册页数（首次翻页时懒加载，之后缓存）
 * @returns {Promise<Array>}
 */
function loadPageCounts() {
  if (pageCounts) return Promise.resolve(pageCounts);
  if (!pageCountsPromise) {
    pageCountsPromise = fetch('./data/cache/page_counts.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(arr => {
        pageCounts = arr;
        return arr;
      })
      .catch(e => {
        console.error('加载 data/cache/page_counts.json 失败:', e);
        pageCountsPromise = null; // 允许重试
        return null;
      });
  }
  return pageCountsPromise;
}

// ====================== 工具方法 ======================
/**
 * 拆分参数为册、页
 * @param {string} param 6位/7位数字串
 * @returns {{volume: string, page: string}}
 */
export function splitVolumeAndPage(param) {
  const str = String(param);
  
  // 统一数字逻辑：001~169 全部按三位卷号处理
  const len = str.length;
  let volume, page;
  if (len === 6) {
    volume = str.slice(0, 3);
    page = str.slice(3, 6);
  } else if (len === 7) {
    volume = str.slice(0, 3);
    page = str.slice(3, 7);
  } else {
    volume = str.slice(0, 3);
    page = str.slice(3);
  }
  return { volume, page };
}

// ====================== 全局状态 & 168册每册的图片数 ======================
/**
 * 获取指定册的总页数（异步：首次需加载 page_counts.json）
 */
async function getVolumePageCount(volumeNum) {
  const volStr = String(volumeNum);

  // 🔥 校勘卷 169 固定 62 页
  if (volStr === '169') return 62;

  const num = parseInt(volStr, 10);
  const counts = await loadPageCounts();
  if (!counts) return 999;
  if (num < 1 || num >= counts.length) return 999;
  return counts[num];
}

// ====================== 解析URL参数 ======================
const startParam = getQueryVariable('start') || '001001';
const endParam = getQueryVariable('end') || '999999';
const idxParam = getQueryVariable('idx');

const startInfo = splitVolumeAndPage(startParam);
const endInfo = splitVolumeAndPage(endParam);

// 阅读范围边界
export const RANGE = {
  startVol: startInfo.volume,
  startPage: startInfo.page,
  endVol: endInfo.volume,
  endPage: endInfo.page
};

// ====================== 确定当前起始位置 ======================
let currentStartInfo;
if (idxParam) {
  currentStartInfo = splitVolumeAndPage(idxParam);
  // 数字比较：001001~169xxx 全部按数值校验
  const idxNum = parseInt(String(idxParam), 10);
  const startNum = parseInt(String(startParam), 10);
  const endNum = parseInt(String(endParam), 10);

  const inRange = idxNum >= startNum && idxNum <= endNum;

  if (!inRange) {
    console.warn(`idx ${idxParam} 超出范围，使用 start ${startParam}`);
    currentStartInfo = startInfo;
  }
} else {
  currentStartInfo = startInfo;
}

// 当前册、页状态
export let currentVol = currentStartInfo.volume;
export let currentPage = currentStartInfo.page;

// 更新当前页码
export function setCurrentPage(vol, page) {
  currentVol = vol;
  currentPage = page;
}

// ====================== 核心翻页逻辑（支持跨册） ======================
export async function calcNextPage(direction) {
  const currPageNum = parseInt(currentPage, 10);
  const currVolNum = parseInt(currentVol, 10);
  const startVolNum = parseInt(RANGE.startVol, 10);
  const startPageNum = parseInt(RANGE.startPage, 10);
  const endVolNum = parseInt(RANGE.endVol, 10);
  const endPageNum = parseInt(RANGE.endPage, 10);

  // 当前册的总页数
  const currVolMaxPage = await getVolumePageCount(currentVol);
  const pageLen = currentPage.length;

  let newPage = currPageNum + direction;
  let newVol = currentVol;

  // 处理翻页跨册
  if (direction > 0) {
    // 下一页：超出当前册范围则进入下一册第1页
    if (newPage > currVolMaxPage) {
      newPage = 1;
      newVol = String(currVolNum + 1).padStart(3, '0');
      // 🔥 超过 169 册，没有下一册
      if (parseInt(newVol, 10) > 169) {
        return { ok: false, newVol: '', newPage: '' };
      }
    }
  } else {
    // 上一页：小于1则进入上一册最后一页
    if (newPage < 1) {
      // 如果已经是全局第一页，不能再往前
      if (currentVol === RANGE.startVol && currPageNum === 1) {
        return { ok: false, newVol: '', newPage: '' };
      }

      newVol = String(currVolNum - 1).padStart(3, '0');

      // 获取上一册的总页数
      const prevVolMaxPage = await getVolumePageCount(newVol);
      newPage = prevVolMaxPage;
    }
  }

  // 格式化输出
  const newVolStr = String(newVol);
  const newPageStr = String(newPage).padStart(pageLen, '0');

  // 范围越界判断（统一按数字比较）
  let outOfRange = false;

  const newVolNum = parseInt(newVolStr, 10);
  const newPageNum = parseInt(newPageStr, 10);
  outOfRange =
    newVolNum < startVolNum ||
    (newVolNum === startVolNum && newPageNum < startPageNum) ||
    newVolNum > endVolNum ||
    (newVolNum === endVolNum && newPageNum > endPageNum);

  if (outOfRange) {
    return { ok: false, newVol: '', newPage: '' };
  }

  return { ok: true, newVol: newVolStr, newPage: newPageStr };
}
