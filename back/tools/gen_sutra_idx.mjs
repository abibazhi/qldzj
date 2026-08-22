// ============================================================
// gen_sutra_idx.mjs
// 从唯一真源 data/sutra_table.js 重新生成 public/sutra{N}.idx.html
//
// 输入：
//   data/sutra_table.js  唯一真源（经表 + 卷表；记录含 rolls / gs）
//   js/config.js          ROLL_FULL_ROW_CHAR_LIMIT 排版阈值
// 输出：
//   public/sutra{N}.idx.html    壳页：静态部分仅 #sutra-meta 富化数据块
//                               （阅读页 js/sutraInfo.js 取用），表格主体由
//                               js/sutraIdxBoot.js 在浏览器端渲染（同一排版规则）。
//                               经1 额外内嵌会界样式与 #hui-data 定制数据块。
// 渲染逻辑：已迁移至共享模块 js/sutraIdxView.js（Node/浏览器共用同一份排版规则）
//
// 真源记录：[经号,start,end,title,translator,alias,tradTitle,rolls,gs?]
//   s[5]=alias、s[6]=tradTitle、s[7]=rolls、s[8]=gs
//
// 运行：
//   node back/tools/gen_sutra_idx.mjs --dry       只生成到临时目录并 diff（不写 public）
//   node back/tools/gen_sutra_idx.mjs             直接写 public
// ============================================================
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderShell, renderBody } from '../../js/sutraIdxView.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tablePath = join(root, 'data', 'sutra_table.js');
const configPath = join(root, 'js', 'config.js');
const publicDir = join(root, 'public');
const dryDir = join(root, 'back', 'tools', '.gen_tmp');
const dry = process.argv.includes('--dry');

// 读取排版阈值（js/config.js 是 ES module，这里直接 import）
const LIMIT = await import(configPath).then(m => m.ROLL_FULL_ROW_CHAR_LIMIT).catch(() => 24);

// 真源：sutra_links 记录结构 [经号,start,end,title,translator,alias,tradTitle,rolls,gs?]
const tableModule = await import(tablePath);
const table = tableModule.sutraLinks;

// ==============================
// 合并真源 → sutra 对象（全部经生成 idx 页，单卷经也展示卷信息）
// t = 繁体经名（真源 s[6]，回退简体 s[3]）
// ==============================
const sutras = [];
for (const s of table) {
  if (typeof s[0] !== 'number') continue;
  const [sv, sp] = s[1].split('-');
  const [ev, ep] = s[2].split('-');
  sutras.push({
    n: s[0],
    s: sv.padStart(3, '0') + sp.padStart(3, '0'),
    e: ev.padStart(3, '0') + ep.padStart(3, '0'),
    t: s[6] || s[3],
    r: s[7],
    gs: s[8]
  });
}

// ==============================
// 经1 定制层：会界注释开关（个人兴趣注释层，非原版内容）
// 样式静态注入壳页头部；数据走 #hui-data 块；按钮与行为由
// js/sutraIdxBoot.js 在渲染完成后初始化。默认关 = 纯原版。
// ==============================
const HUI_MARKS = [
  ['009479', '第二会'], ['011294', '第三会'], ['012545', '第四会'],
  ['013089', '第五会'], ['013253', '第六会'], ['013383', '第七会'],
  ['013414', '第八会'], ['013430', '第九会'], ['013448', '第十会'],
  ['013465', '第十一会'], ['013544', '第十二会'], ['013618', '第十三会'],
  ['013635', '第十四会'], ['013652', '第十五会'], ['013683', '第十六会']
];

const HUI_CSS = `<style>
#huiToggle { position: fixed; top: 12px; right: 16px; z-index: 1000; padding: 4px 14px; font-size: 0.9em; cursor: pointer; background-color: rgba(255,255,255,.92); border: 1px solid #ddd; border-radius: 16px; box-shadow: 0 1px 6px rgba(0,0,0,.12); }
@media (max-width:520px) { #huiToggle { top: 8px; right: 10px; padding: 3px 10px; font-size: .8em; } }
.hui-badge { display: none; margin-left: 6px; padding: 0 7px; font-size: .78em; color: #2e7031; background: #e5f3d8; border-radius: 9px; vertical-align: middle; }
body.show-hui td[data-hui] { background-color: #f0f8e6; }
body.show-hui .hui-badge { display: inline-block; }
</style>`;

// ==============================
// 主流程
// ==============================
const existing = new Set(
  readdirSync(publicDir).filter(f => /^sutra\d+\.idx\.html$/.test(f))
);

let written = 0;
let mismatched = 0;
const diffs = [];
const targetDir = dry ? dryDir : publicDir;
if (dry) mkdirSync(dryDir, { recursive: true });

for (const sutra of sutras) {
  const fname = `sutra${sutra.n}.idx.html`;
  const html = renderShell(sutra, {
    canonicalBase: 'https://qldzj.daxumi.top/public/',
    huiCss: sutra.n === 1 ? HUI_CSS : '',
    huiData: sutra.n === 1 ? HUI_MARKS : null
  });

  // 核对：参考渲染的卷目数应与真源一致；内嵌数据块须可解析且卷数一致
  const rollCount = (renderBody(sutra, LIMIT).match(/class="scroll-link"/g) || []).length;
  const metaMatch = html.match(/<script type="application\/json" id="sutra-meta">([\s\S]*?)<\/script>/);
  let metaOk = false;
  try {
    metaOk = !!metaMatch && JSON.parse(metaMatch[1]).r.length === sutra.r.length;
  } catch { /* JSON 非法按失败计 */ }
  if (rollCount !== sutra.r.length || !metaOk) {
    mismatched++;
    console.log(`❌ 经${sutra.n}: 锚点 ${rollCount} 卷 / meta ${metaOk ? '✓' : '✗'} vs JSON ${sutra.r.length} 卷`);
  }

  writeFileSync(join(targetDir, fname), html, 'utf8');
  written++;

  if (dry) {
    const oldPath = join(publicDir, fname);
    if (existing.has(fname)) {
      const old = readFileSync(oldPath, 'utf8');
      if (old !== html) diffs.push(fname);
    } else {
      diffs.push(fname);
    }
  }
}

const kb = (Buffer.byteLength(JSON.stringify(table)) / 1024).toFixed(1);
console.log(`✅ ${dry ? 'dry-run 生成到 ' + dryDir : '已写入 ' + publicDir}`);
console.log(`   经数: ${written} | 排版阈值: ${LIMIT}字 | 真源: ${kb}KB | 卷数不一致: ${mismatched}`);

if (dry) {
  console.log(`   与现有文件有差异的文件: ${diffs.length}`);
  for (const f of diffs.slice(0, 10)) console.log(`     ${f}`);
}