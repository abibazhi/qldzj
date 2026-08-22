// ============================================================
// gen_cache.mjs
// 从唯一真源 data/sutra_table.js 生成浏览器运行时切片 data/cache/
//
// 真源记录：[经号,start,end,title,translator,alias,tradTitle,rolls,gs?]
//   s[5]=alias、s[6]=tradTitle、s[7]=rolls、s[8]=gs
//
// 输出（均为构建产物，浏览器端 fetch）：
//   data/cache/sutras.json       [经表记录...]         目录页：经目（前7字段，不含 rolls/gs）
//   data/cache/category_map.json { "0": "大乘般若部", ... } 目录页 idx.html：分类映射
//   data/cache/multi_vol.json    { firsts:[], members:[] } 目录页 idx.html：多经同卷分组（校对开关用）
//   data/cache/page_counts.json  [0, 660, ...]        翻页：168册每册页数
//
// 阅读页经名/卷名不走切片：由 public/sutra{N}.idx.html 页尾内嵌的
// #sutra-meta 数据块提供（见 gen_sutra_idx.mjs 与 js/sutraInfo.js）。
//
// 运行：node back/tools/gen_cache.mjs
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tablePath = join(root, 'data', 'sutra_table.js');
const cacheDir = join(root, 'data', 'cache');

const { sutraLinks, categoryMap, VOLUME_PAGE_COUNTS } = await import(tablePath);

mkdirSync(cacheDir, { recursive: true });

// ==============================
// 1. sutras.json：经表切片（目录页用；前6字段，即 [经号..tradTitle]，去除 rolls/gs）
// ==============================
const tableSlice = [];
for (const s of sutraLinks) {
  // 保留全部记录（含非数字经号如勘误表），去除 rolls/gs 以减小体积
  tableSlice.push(s.slice(0, 7));
}
console.log(`sutras.json: ${tableSlice.length} 条`);

// ==============================
// 2. category_map.json：分类映射
// ==============================
console.log(`category_map.json: ${Object.keys(categoryMap).length} 类`);

// ==============================
// 3. multi_vol.json：多经同卷分组（目录页 idx.html 校对开关用）
// 千字文号取首卷条目 t（如「貞二」，括号内优先）；同号 ≥2 部为一组，
// start 页序最低者为首部经。firsts=首部经号，members=组内全部经号。
// ==============================
function qzOf(rollT) {
  const m = rollT.match(/（(.+?)）/);
  return m ? m[1] : rollT;
}
function pageKeyOf(s) {
  const [sv, sp] = s[1].split('-');
  return sv.padStart(3, '0') + sp.padStart(3, '0');
}
const qzGroups = new Map();
for (const s of sutraLinks) {
  if (!Array.isArray(s[7]) || s[7].length === 0) continue;
  const qz = qzOf(s[7][0].t);
  if (!qzGroups.has(qz)) qzGroups.set(qz, []);
  qzGroups.get(qz).push(s);
}
const firsts = [];
const members = [];
for (const g of qzGroups.values()) {
  if (g.length < 2) continue;
  g.sort((a, b) => pageKeyOf(a).localeCompare(pageKeyOf(b)));
  for (const s of g) members.push(s[0]);
  firsts.push(g[0][0]);
}
firsts.sort((a, b) => a - b);
members.sort((a, b) => a - b);
console.log(`multi_vol.json: ${qzGroups.size} 个千字文号，${firsts.length} 组多经同卷，组内 ${members.length} 经`);

// ==============================
// 4. page_counts.json：册页数
// ==============================
console.log(`page_counts.json: ${VOLUME_PAGE_COUNTS.length - 1} 册`);

// ==============================
// 写出
// ==============================
writeFileSync(join(cacheDir, 'sutras.json'), JSON.stringify(tableSlice) + '\n', 'utf8');
writeFileSync(join(cacheDir, 'category_map.json'), JSON.stringify(categoryMap) + '\n', 'utf8');
writeFileSync(join(cacheDir, 'multi_vol.json'), JSON.stringify({ firsts, members }) + '\n', 'utf8');
writeFileSync(join(cacheDir, 'page_counts.json'), JSON.stringify(VOLUME_PAGE_COUNTS) + '\n', 'utf8');

const size = (n) => (n / 1024).toFixed(1) + 'KB';
console.log('✅ cache 已生成:');
console.log(`   sutras.json        ${size(Buffer.byteLength(JSON.stringify(tableSlice)))}`);
console.log(`   category_map.json  ${size(Buffer.byteLength(JSON.stringify(categoryMap)))}`);
console.log(`   multi_vol.json     ${size(Buffer.byteLength(JSON.stringify({ firsts, members })))}`);
console.log(`   page_counts.json   ${size(Buffer.byteLength(JSON.stringify(VOLUME_PAGE_COUNTS)))}`);