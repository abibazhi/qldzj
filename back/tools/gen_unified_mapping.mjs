// ============================================================
// gen_unified_mapping.mjs
// 将旧 mapping.json（每卷数组）+ catalog_imgbb.js（{vol}C{n}）
// 合并为统一结构：{ "001": { pages:[], catalog:[] }, ... }
//
// 输入：
//   back/tools/legacy_src/mapping.json  旧结构（数组：页码索引 -> ImgBB ID）
//      —— 一次性迁移完成、且已并入 js/mapping.json 后删除
//   back/tools/legacy_src/catalog_imgbb.js  目录 C 图映射（{vol}C{n} -> ID）
// 输出：
//   js/mapping.json          新结构（pages + catalog）
//
// 运行：node back/tools/gen_unified_mapping.mjs
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outPath = join(root, 'js', 'mapping.json');
// 旧版输入源（一次性迁移后原文件已删除，本脚本仅存档备查）
const catalogPath = join(dirname(fileURLToPath(import.meta.url)), 'legacy_src', 'catalog_imgbb.js');
const oldMappingPath = join(dirname(fileURLToPath(import.meta.url)), 'legacy_src', 'mapping.json');

const oldMapping = JSON.parse(readFileSync(oldMappingPath, 'utf8'));

const catalogSrc = readFileSync(catalogPath, 'utf8');
const catalog = {};
const re = /"(\d+)C(\d+)":\s*"([A-Za-z0-9]+)"/g;
let m;
while ((m = re.exec(catalogSrc)) !== null) {
  const vol = m[1].padStart(3, '0');
  const seq = parseInt(m[2], 10);
  if (!catalog[vol]) catalog[vol] = [];
  catalog[vol][seq - 1] = m[3];
}

const unified = {};
for (const [vol, pages] of Object.entries(oldMapping)) {
  unified[vol] = { pages, catalog: catalog[vol] || [] };
}

const volKeys = Object.keys(unified).sort();
console.log('卷数:', volKeys.length);
console.log('000 pages:', unified['000'].pages.length, 'catalog:', unified['000'].catalog.length);
for (const vol of ['001', '010', '058', '168']) {
  if (unified[vol]) {
    console.log(vol, 'pages:', unified[vol].pages.length, 'catalog:', unified[vol].catalog.length);
  }
}

const json = JSON.stringify(unified);
writeFileSync(outPath, json + '\n');
console.log('✅ 已写出:', outPath, `(${(json.length / 1024 / 1024).toFixed(2)} MB)`);