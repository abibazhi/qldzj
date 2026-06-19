// pageNav.js
import { getQueryVariable } from './utils.js';

// ====================== 工具方法 ======================
/**
 * 拆分参数为册、页
 * @param {string} param 6位/7位数字串 或 erratum+数字
 * @returns {{volume: string, page: string}}
 */
export function splitVolumeAndPage(param) {
  const str = String(param);
  
  // 🔥 只针对 erratum 做特殊处理
  if (str.startsWith('erratum')) {
    const num = str.replace('erratum', '');
    return { volume: 'erratum', page: num || '1' };
  }
  
  // 原有数字逻辑
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
const pageCount = [0, 660, 820, 766, 757, 766, 768, 706, 718, 730, 716, 742, 764, 732, 730, 710, 650, 641, 820, 662, 700, 778, 820, 812, 692, 766, 790, 728, 688, 692, 564, 598, 762, 786, 778, 760, 734, 750, 768, 786, 784, 682, 770, 760, 704, 838, 694, 769, 756, 730, 742, 794, 716, 752, 734, 720, 900, 908, 836, 796, 802, 742, 766, 778, 730, 772, 714, 990, 862, 872, 856, 870, 888, 860, 880, 898, 874, 850, 818, 826, 824, 824, 852, 796, 836, 828, 738, 808, 812, 764, 814, 834, 704, 730, 708, 796, 744, 714, 664, 694, 706, 738, 770, 756, 710, 686, 750, 774, 754, 714, 766, 818, 792, 820, 816, 830, 784, 772, 814, 744, 814, 810, 786, 752, 782, 822, 834, 854, 766, 820, 802, 826, 864, 856, 862, 856, 838, 820, 784, 832, 822, 824, 838, 812, 798, 824, 834, 868, 838, 868, 844, 842, 864, 850, 792, 824, 760, 770, 796, 754, 772, 776, 1085, 666, 868, 792, 646, 878, 746];

/**
 * 获取指定册的总页数
 */
function getVolumePageCount(volumeNum) {
  const volStr = String(volumeNum);
  
  // 🔥 erratum 固定 20 页
  if (volStr === 'erratum') return 20;
  
  const num = parseInt(volStr, 10);
  if (num < 1 || num >= pageCount.length) return 999;
  return pageCount[num];
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
  // 简单比较：转成字符串比较（数字册和 erratum 都能用）
  const idxStr = String(idxParam);
  const startStr = String(startParam);
  const endStr = String(endParam);
  
  // 只在同为数字或同为 erratum 时校验
  const isIdxNum = /^\d+$/.test(idxStr);
  const isStartNum = /^\d+$/.test(startStr);
  const isEndNum = /^\d+$/.test(endStr);
  
  let inRange = true;
  if (isIdxNum && isStartNum && isEndNum) {
    // 都是数字，按数字比较
    const idxNum = parseInt(idxStr, 10);
    const startNum = parseInt(startStr, 10);
    const endNum = parseInt(endStr, 10);
    inRange = idxNum >= startNum && idxNum <= endNum;
  } else if (idxStr === startStr || idxStr === endStr) {
    // 完全相同
    inRange = true;
  } else {
    // 混合情况（如数字和 erratum 混用），简单处理：只要不是 erratum 都允许
    inRange = true;
  }

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
export function calcNextPage(direction) {
  const currPageNum = parseInt(currentPage, 10);
  const currVolNum = parseInt(currentVol, 10);
  const startVolNum = parseInt(RANGE.startVol, 10);
  const startPageNum = parseInt(RANGE.startPage, 10);
  const endVolNum = parseInt(RANGE.endVol, 10);
  const endPageNum = parseInt(RANGE.endPage, 10);

  // 当前册的总页数
  const currVolMaxPage = getVolumePageCount(currentVol);
  const pageLen = currentPage.length;

  let newPage = currPageNum + direction;
  let newVol = currentVol;

  // 处理翻页跨册
  if (direction > 0) {
    // 下一页：超出当前册范围则进入下一册第1页
    if (newPage > currVolMaxPage) {
      newPage = 1;
      // 🔥 如果当前是 erratum，没有下一页
      if (currentVol === 'erratum') {
        return { ok: false, newVol: '', newPage: '' };
      }
      newVol = String(currVolNum + 1).padStart(3, '0');
      // 🔥 如果下一页是 169，检查是否有 erratum
      if (parseInt(newVol, 10) === 169) {
        // 如果 end 包含 erratum，则跳到 erratum
        const endStr = String(endParam);
        if (endStr.startsWith('erratum')) {
          newVol = 'erratum';
        } else {
          return { ok: false, newVol: '', newPage: '' };
        }
      }
    }
  } else {
    // 上一页：小于1则进入上一册最后一页
    if (newPage < 1) {
      // 如果已经是全局第一页，不能再往前
      if (currentVol === RANGE.startVol && currPageNum === 1) {
        return { ok: false, newVol: '', newPage: '' };
      }

      // 🔥 如果当前是 erratum，上一册是 168
      if (currentVol === 'erratum') {
        newVol = '168';
      } else {
        newVol = String(currVolNum - 1).padStart(3, '0');
      }
      
      // 获取上一册的总页数
      const prevVolMaxPage = getVolumePageCount(newVol);
      newPage = prevVolMaxPage;
    }
  }

  // 格式化输出
  const newVolStr = String(newVol);
  const newPageStr = String(newPage).padStart(pageLen, '0');

  // 范围越界判断（简化：数字册直接比较，erratum 单独判断）
  let outOfRange = false;
  
  if (/^\d+$/.test(newVolStr) && /^\d+$/.test(RANGE.startVol) && /^\d+$/.test(RANGE.endVol)) {
    // 都是数字
    const newVolNum = parseInt(newVolStr, 10);
    const newPageNum = parseInt(newPageStr, 10);
    outOfRange =
      newVolNum < startVolNum ||
      (newVolNum === startVolNum && newPageNum < startPageNum) ||
      newVolNum > endVolNum ||
      (newVolNum === endVolNum && newPageNum > endPageNum);
  } else if (newVolStr === 'erratum') {
    // erratum 必须在 end 范围内
    if (!String(endParam).startsWith('erratum')) {
      outOfRange = true;
    }
  }

  if (outOfRange) {
    return { ok: false, newVol: '', newPage: '' };
  }

  return { ok: true, newVol: newVolStr, newPage: newPageStr };
}
