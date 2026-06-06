// pageNav.js
import { getQueryVariable } from './utils.js';

// ====================== 工具方法 ======================
/**
 * 拆分参数为册、页
 * @param {string} param 6位/7位数字串
 * @returns {{volume: string, page: string}}
 */
export function splitVolumeAndPage(param) {
  const len = param.length;
  let volume, page;
  if (len === 6) {
    volume = param.slice(0, 3);
    page = param.slice(3, 6);
  } else if (len === 7) {
    volume = param.slice(0, 3);
    page = param.slice(3, 7);
  } else {
    volume = param.slice(0, 3);
    page = param.slice(3);
  }
  return { volume, page };
}

// ====================== 全局状态 & 168册每册的图片数 ======================
const pageCount = [0, 660, 820, 766, 757, 766, 768, 706, 718, 730, 716, 742, 764, 732, 730, 710, 650, 641, 820, 662, 700, 778, 820, 812, 692, 766, 790, 728, 688, 692, 564, 598, 762, 786, 778, 760, 734, 750, 768, 786, 784, 682, 770, 760, 704, 838, 694, 769, 756, 730, 742, 794, 716, 752, 734, 720, 900, 908, 836, 796, 802, 742, 766, 778, 730, 772, 714, 990, 862, 872, 856, 870, 888, 860, 880, 898, 874, 850, 818, 826, 824, 824, 852, 796, 836, 828, 738, 808, 812, 764, 814, 834, 704, 730, 708, 796, 744, 714, 664, 694, 706, 738, 770, 756, 710, 686, 750, 774, 754, 714, 766, 818, 792, 820, 816, 830, 784, 772, 814, 744, 814, 810, 786, 752, 782, 822, 834, 854, 766, 820, 802, 826, 864, 856, 862, 856, 838, 820, 784, 832, 822, 824, 838, 812, 798, 824, 834, 868, 838, 868, 844, 842, 864, 850, 792, 824, 760, 770, 796, 754, 772, 776, 1085, 666, 868, 792, 646, 878, 746];

/**
 * 获取指定册的总页数
 */
function getVolumePageCount(volumeNum) {
  const num = typeof volumeNum === 'string' ? parseInt(volumeNum, 10) : volumeNum;
  if (num < 1 || num >= pageCount.length) return 999;
  return pageCount[num];
}

// ====================== 解析URL参数 ======================
const startParam = getQueryVariable('start') || '001001';
const endParam = getQueryVariable('end') || '999999';
const idxParam = getQueryVariable('idx');  // idx参数优先

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
// 优先使用 idx，如果没有则使用 start
let currentStartInfo;
if (idxParam) {
  currentStartInfo = splitVolumeAndPage(idxParam);
  // 验证 idx 是否在 RANGE 范围内
  const idxVolNum = parseInt(currentStartInfo.volume, 10);
  const idxPageNum = parseInt(currentStartInfo.page, 10);
  const startVolNum = parseInt(RANGE.startVol, 10);
  const startPageNum = parseInt(RANGE.startPage, 10);
  const endVolNum = parseInt(RANGE.endVol, 10);
  const endPageNum = parseInt(RANGE.endPage, 10);
  
  const inRange = 
    (idxVolNum > startVolNum || (idxVolNum === startVolNum && idxPageNum >= startPageNum)) &&
    (idxVolNum < endVolNum || (idxVolNum === endVolNum && idxPageNum <= endPageNum));
  
  if (!inRange) {
    console.warn(`idx ${idxParam} 超出范围，使用 start ${startParam}`);
    currentStartInfo = startInfo;
  }
} else {
  currentStartInfo = startInfo;
}

// 当前册、页状态（保持变量名兼容旧接口）
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
  const currVolMaxPage = getVolumePageCount(currVolNum);
  const pageLen = currentPage.length;
  
  let newPage = currPageNum + direction;
  let newVol = currVolNum;
  
  // 处理翻页跨册
  if (direction > 0) {
    // 下一页：超出当前册范围则进入下一册第1页
    if (newPage > currVolMaxPage) {
      newPage = 1;
      newVol += 1;
    }
  } else {
    // 上一页：小于1则进入上一册最后一页
    if (newPage < 1) {
      // 如果已经是全局第一页，不能再往前
      if (currVolNum === startVolNum && currPageNum === 1) {
        return { ok: false, newVol: '', newPage: '' };
      }
      
      newVol -= 1;
      // 获取上一册的总页数
      const prevVolMaxPage = getVolumePageCount(newVol);
      newPage = prevVolMaxPage;
    }
  }
  
  // 格式化输出
  newVol = newVol.toString().padStart(3, '0');
  newPage = newPage.toString().padStart(pageLen, '0');
  
  const newVolNum = parseInt(newVol, 10);
  const newPageNum = parseInt(newPage, 10);
  
  // 范围越界判断（不能超出start和end限制）
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
