// ============================================================
// merge_sutra_table.mjs
// ⚠️ 已过时（2026-08-18）：输入文件 data/sutra_links.js 与 data/vols/ 已删除，本脚本不可再运行。
//    仅供历史参考。当前真源由本脚本产物 data/sutra_table.js 直接手维护。
//
// 一次性脚本：将 data/sutra_links.js（经表）+ data/vols/sutraVols.json（卷表）
// 合并为唯一真源 data/sutra_table.js
//
// 真源格式（每条记录为一个数组，数字经号记录固定位置，导航统一后已删 mv）：
//   [经号, start, end, title, translator, alias, tradTitle, rolls, gs?]
//   s[5]  = alias     （别名；缺失补 ''）
//   s[6]  = tradTitle （繁体经名；缺失补 ''）
//   s[7]  = rolls     （卷列表，所有经都有；单卷经 = [{t:函号, i:start6}]）
//   s[8]  = gs        （人工分组标记，仅经1165）
// 非数字经号记录（如勘误表）：保留经表原样，无 rolls
// 卷对象字段：{ t, i, title?, b?, f? }
//
// 运行：node back/tools/merge_sutra_table.mjs
// 说明：合并后需人工抽查 diff；原文件 data/sutra_links.js 与 data/vols/ 待验证后删除
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const linksPath = join(root, 'data', 'sutra_links.js');
const volsPath = join(root, 'data', 'vols', 'sutraVols.json');
const outPath = join(root, 'data', 'sutra_table.js');

// 加载经表（ES module）
const { sutraLinks, categoryMap, VOLUME_PAGE_COUNTS } = await import(linksPath);
const vols = JSON.parse(readFileSync(volsPath, 'utf8'));

// 经表索引：经号 → 记录
const byN = new Map();
for (const s of sutraLinks) {
  if (typeof s[0] === 'number') byN.set(s[0], s);
}

// 卷表索引：经号 → { r, gs }
const volByN = new Map();
for (const v of vols) volByN.set(v.n, v);

// ==============================
// 合并（规范化固定位置）
// ==============================
// 数字经号记录统一为固定结构：
//   [n, start, end, title, translator, mv, alias, tradTitle, rolls, gs?]
//   s[6]=alias、s[7]=tradTitle（缺失补 ''）、s[8]=rolls、s[9]=gs（可选）
// 非数字经号记录（勘误表等）：保留原样，无 rolls
// 经表原格式：6字段=[n,start,end,title,translator,mv]
//            7字段=[...,mv,trad]   （s[6]=繁体名，无别名）
//            8字段=[...,mv,alias,trad]（s[6]=别名, s[7]=繁体名）
function normalizeRec(s, v) {
  const n = s[0];
  const alias = s.length >= 8 ? s[6] : '';
  const trad = s.length >= 7 ? s[s.length - 1] : '';
  const rec = [n, s[1], s[2], s[3], s[4], s[5], alias, trad, v.r];
  if (v.gs !== undefined) rec.push(v.gs);
  return rec;
}

const merged = [];
const errs = [];
const seen = new Set();

for (const s of sutraLinks) {
  const n = s[0];

  // 非数字经号记录（如勘误表）：保留经表原样，无卷信息
  if (typeof n !== 'number') {
    merged.push(s.slice());
    continue;
  }

  const v = volByN.get(n);
  if (!v) {
    errs.push(`经表有经${n}，卷表无对应记录`);
    continue;
  }
  if (seen.has(n)) {
    errs.push(`经号重复: ${n}`);
    continue;
  }
  seen.add(n);

  merged.push(normalizeRec(s, v));
}

// 检查卷表多余记录（经表无对应）
for (const v of vols) {
  if (!byN.has(v.n)) errs.push(`卷表有经${v.n}，经表无对应记录`);
}

if (errs.length > 0) {
  console.error('❌ 合并校验失败:');
  errs.forEach(e => console.error('  - ' + e));
  process.exit(1);
}

// 字段宽度校验（rolls 必须在 s[8] 位置一致）
// ==============================
const widthCount = {};
for (const rec of merged) {
  const w = rec.length;
  widthCount[w] = (widthCount[w] || 0) + 1;
}
console.log('合并完成，记录宽度分布:', widthCount);

// 汇总校验
const total = merged.length;
const multi = merged.filter(s => typeof s[0] === 'number' && s[5] === 1).length;
const single = merged.filter(s => typeof s[0] === 'number' && s[5] !== 1).length;
console.log(`总记录: ${total}（多卷: ${multi}，单卷: ${single}，非数字: ${total - multi - single}）`);

// rolls 完整性：数字经号记录 s[8] 必为数组；多卷>1，单卷=1
let rollMis = 0;
for (const s of merged) {
  if (typeof s[0] !== 'number') continue;
  const r = s[8];
  if (!Array.isArray(r) || r.length === 0) { rollMis++; console.warn(`⚠️ 经${s[0]} rolls 缺失/为空`); continue; }
  if (s[5] === 1 && r.length === 1) { console.warn(`⚠️ 多卷经${s[0]} 只有1卷`); }
  if (s[5] !== 1 && r.length !== 1) { console.warn(`⚠️ 单卷经${s[0]} 有${r.length}卷`); }
}
console.log(`rolls 缺失/异常: ${rollMis}`);

// alias/tradTitle 位置抽查
const withAlias = merged.filter(s => typeof s[0] === 'number' && s[6]);
const withTrad = merged.filter(s => typeof s[0] === 'number' && s[7]);
console.log(`有 alias 记录: ${withAlias.length} | 有 tradTitle 记录: ${withTrad.length}`);

// ==============================
// 写出真源
// ==============================
const HEADER = `/**
 * 乾隆大藏经·唯一数据真源（经表 + 卷表合并）
 *
 * 字段说明（按数组顺序）：
 *   0: sutra       - 经号（非数字如 "" 为特殊记录，如勘误表）
 *   1: start       - 起始页码 (格式: "册-页")
 *   2: end         - 结束页码 (格式: "册-页")
 *   3: title       - 经名（含卷数，简体为主）
 *   4: translator  - 译者
 *   5: multiVolume - 是否多卷 (1=多卷索引页 .idx.html, 0=单卷直接跳转)
 *   6: alias       - 别名 (亦名/一名，可选；无则缺省)
 *   7: tradTitle   - 繁体经名（卷索引页 h1 用，可选；无则缺省）
 *   8: rolls       - 卷列表 [{ t,i,title?,b?,f? }]（所有经都有；单卷经=[{t:函号,i:start6}]）
 *   9: gs          - 人工分组标记（仅经1165，可选）
 *
 * 分类映射说明：
 *   key: 该分类第一本经的 sutra 编号
 *   value: 分类名称
 *
 * 使用方式（构建期）：
 *   import { sutraLinks, categoryMap, VOLUME_PAGE_COUNTS } from './data/sutra_table.js'
 *
 * 浏览器端不直接加载本文件；运行时使用 data/cache/ 下的派生切片（由 gen_cache.mjs 生成）
 */
`;

const json = JSON.stringify(merged, null, 2)
  // 数组元素换行风格与旧文件保持一致：每条记录整体占多行，元素缩进 4 空格
  .replace(/\n(\s*)"/g, '\n$1  "');

// 上面 replace 不精确，改用逐条渲染
function renderRecord(rec, idx) {
  const lines = ['  ['];
  for (let i = 0; i < rec.length; i++) {
    const v = rec[i];
    const comma = i < rec.length - 1 ? ',' : '';
    if (Array.isArray(v)) {
      // rolls：紧凑单行（或保留多行以控制体积）
      lines.push(`    ${JSON.stringify(v)}${comma}`);
    } else {
      lines.push(`    ${JSON.stringify(v)}${comma}`);
    }
  }
  lines.push('  ]');
  return lines.join('\n');
}

const body = merged.map(renderRecord).join(',\n');
const out = HEADER + 'const sutraLinks = [\n' + body + '\n];\n\n' +
  'const categoryMap = ' + JSON.stringify(categoryMap, null, 2) + ';\n\n' +
  'const VOLUME_PAGE_COUNTS = ' + JSON.stringify(VOLUME_PAGE_COUNTS, null, 2) + ';\n\n' +
  'export { categoryMap, VOLUME_PAGE_COUNTS, sutraLinks };\n';

writeFileSync(outPath, out, 'utf8');
console.log(`✅ 已写出 ${outPath} (${(Buffer.byteLength(out) / 1024 / 1024).toFixed(2)} MB)`);
