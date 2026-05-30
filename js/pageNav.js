// pageNav.js
import { getQueryVariable } from './utils.js';

// ====================== 工具方法 ======================
/**
 * 拆分参数为卷、页
 * @param {string} param 6位/7位数字串
 * @returns {{vol: string, page: string}}
 */
export function splitVolumeAndPage(param) {
  const len = param.length;
  let vol, page;
  if (len === 6) {
    vol = param.slice(0, 3);
    page = param.slice(3, 6);
  } else if (len === 7) {
    vol = param.slice(0, 3);
    page = param.slice(3, 7);
  } else {
    vol = param.slice(0, 3);
    page = param.slice(3);
  }
  return { vol, page };
}

// ====================== 全局状态 & 范围初始化 ======================
const startParam = getQueryVariable('start') || '001001';
const endParam = getQueryVariable('end') || '999999';

const startInfo = splitVolumeAndPage(startParam);
const endInfo = splitVolumeAndPage(endParam);

// 阅读范围边界
export const RANGE = {
  startVol: startInfo.vol,
  startPage: startInfo.page,
  endVol: endInfo.vol,
  endPage: endInfo.page
};

// 当前卷、页状态
export let currentVol = startInfo.vol;
export let currentPage = startInfo.page;

// 更新当前页码
export function setCurrentPage(vol, page) {
  currentVol = vol;
  currentPage = page;
}

// ====================== 核心翻页逻辑 ======================
/**
 * 翻页计算 + 边界校验
 * @param {number} direction 1下一页 / -1上一页
 * @returns {{ok: boolean, newVol: string, newPage: string}}
 */
export function calcNextPage(direction) {

  const currPageNum = parseInt(currentPage, 10);
  const currVolNum = parseInt(currentVol, 10);
  const startVolNum = parseInt(RANGE.startVol, 10);
  const startPageNum = parseInt(RANGE.startPage, 10);
  const endVolNum = parseInt(RANGE.endVol, 10);
  const endPageNum = parseInt(RANGE.endPage, 10);

  let newPage = currPageNum + direction;
  let newVol = currVolNum;
  const pageLen = currentPage.length;
  const maxPage = pageLen === 4 ? 9999 : 999;

  // 页码跨卷处理
  if (direction > 0) {
    if (newPage > maxPage) {
      newPage = 1;
      newVol += 1;
    }
  } else {
    if (newPage < 1) {
      if (currPageNum === 1) {
        return { ok: false, newVol: '', newPage: '' };
      }
      newPage = maxPage;
      newVol -= 1;
    }
  }

  // 补零格式化
  newVol = newVol.toString().padStart(3, '0');
  newPage = newPage.toString().padStart(pageLen, '0');

  // 范围越界判断
  const newVolNum = parseInt(newVol, 10);
  const newPageNum = parseInt(newPage, 10);
  const outOfRange =
    newVolNum < startVolNum ||
    (newVolNum === startVolNum && newPageNum < startPageNum) ||
    newVolNum > endVolNum ||
    (newVolNum === endVolNum && newPageNum > endPageNum);

  if (outOfRange) {
    return { ok: false, newVol: '', newPage: '' };
  }

  return { ok: true, newVol, newPage };
}
