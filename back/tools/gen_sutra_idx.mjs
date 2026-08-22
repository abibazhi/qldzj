// ============================================================
// gen_sutra_idx.mjs
// 从唯一真源 data/sutra_table.js 重新生成 public/sutra{N}.idx.html
//
// 输入：
//   data/sutra_table.js  唯一真源（经表 + 卷表；记录含 rolls / gs）
//   js/config.js          ROLL_FULL_ROW_CHAR_LIMIT 排版阈值
// 输出：
//   public/sutra{N}.idx.html    全部经的卷索引页（含单卷经，单卷也展示卷信息）
//                               页尾内嵌 #sutra-meta JSON 数据块（阅读页 js/sutraInfo.js 取用）
//                               经1 额外输出会界注释开关定制块（见 HUI_MARKS）
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
// 经名映射：经号 → 繁体经名（真源 s[6]，回退简体 s[3]）
// ==============================
const titleByN = new Map();
for (const s of table) {
  if (typeof s[0] !== 'number') continue;
  titleByN.set(s[0], s[6] || s[3]);
}
function titleOf(sutra) {
  return titleByN.get(sutra.n) || '';
}

// ==============================
// 合并真源 → sutra 对象（全部经生成 idx 页，单卷经也展示卷信息）
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
    r: s[7],
    gs: s[8]
  });
}

// ==============================
// 页码推导：6 位 idx → 后 3 位；7 位 idx → 后 4 位；去前导零
// 全库统一阿拉伯数字（原经0 中文数字特判已移除，2026-08-22）
// ==============================
function pageOf(sutra, idx) {
  if (idx.length === 7) return String(parseInt(idx.slice(-4), 10));
  return String(parseInt(idx.slice(-3), 10));
}

// ==============================
// 排版判定：整行（colspan=2） vs 半列
// 1) 经0（目录）一律整行（跟随原版 C 图排版）
// 2) 文本长度 > LIMIT → 整行
// （原 f:true 强制整行机制已移除，2026-08-22；1165 三条回归统一长度规则）
// ==============================
function isFullRow(sutra, roll) {
  if (sutra.n === 0) return true;
  return roll.t.length > LIMIT;
}

// ==============================
// 渲染单条目
// ==============================
function renderEntry(sutra, roll, indent) {
  const idx = roll.i;
  const href = `sutra.html?start=${sutra.s}&end=${sutra.e}&idx=${idx}&sutra=${sutra.n}`;
  // 加黑：b 字段子串 → <b>...</b>（indexOf 定位，不依赖位置）
  let label = roll.t;
  if (roll.b && label.includes(roll.b)) {
    label = label.replace(roll.b, `<b>${roll.b}</b>`);
  }
  const page = pageOf(sutra, idx);
  return `${indent}<div class="entry">
${indent}    <span class="title">
${indent}        <a href="${href}" class="scroll-link">${label}</a>
${indent}    </span>
${indent}    <span class="dots"></span>
${indent}    <span class="page">${page}</span>
${indent}</div>`;
}

// ==============================
// 渲染一个 table（一组卷目，对应一个 h2 册）
// 返回 { html, rows }   rows 用于计算 h2
// ==============================
function renderTable(sutra, rolls, vol) {
  const lines = [];
  lines.push('<table>');
  // 按整行/半列分组：整行单占一行；半列两两配对
  const groups = [];
  let cur = [];
  for (const r of rolls) {
    if (isFullRow(sutra, r)) {
      if (cur.length) { groups.push({ type: 'pair', items: cur }); cur = []; }
      groups.push({ type: 'full', items: [r] });
    } else {
      cur.push(r);
    }
  }
  if (cur.length) groups.push({ type: 'pair', items: cur });

  for (const g of groups) {
    if (g.type === 'full') {
      const r = g.items[0];
      lines.push('    <tr>');
      lines.push(`        <td colspan="2" class="left-col">`);
      lines.push(renderEntry(sutra, r, '            '));
      lines.push('        </td>');
      lines.push('    </tr>');
    } else {
      const items = g.items;
      for (let i = 0; i < items.length; i += 2) {
        const a = items[i];
        const b = items[i + 1];
        lines.push('    <tr>');
        lines.push(`        <td class="left-col">`);
        lines.push(renderEntry(sutra, a, '            '));
        lines.push('        </td>');
        if (b) {
          lines.push(`        <td class="right-col">`);
          lines.push(renderEntry(sutra, b, '            '));
          lines.push('        </td>');
        } else {
          lines.push('        <td class="right-col">');
          lines.push('            <!-- 空单元格保持布局平衡 -->');
          lines.push('        </td>');
        }
        lines.push('    </tr>');
      }
    }
  }
  lines.push('</table>');
  return lines.join('\n');
}

// ==============================
// 按 idx 前 3 位分册；经1165 用 gs 显式分表
// ==============================
function groupByVol(sutra) {
  const rolls = sutra.r;
  if (sutra.gs) {
    // 经1165：gs 指定每组（table）卷数
    const groups = [];
    let offset = 0;
    for (const size of sutra.gs) {
      groups.push(rolls.slice(offset, offset + size));
      offset += size;
    }
    return groups;
  }
  const groups = [];
  let cur = null;
  let curVol = null;
  for (const r of rolls) {
    const vol = r.i.slice(0, 3);
    if (!cur || vol !== curVol) {
      if (cur) groups.push(cur);
      cur = [];
      curVol = vol;
    }
    cur.push(r);
  }
  if (cur) groups.push(cur);
  return groups;
}

// ==============================
// 阅读页数据块：经名 + 卷表（只留 t/i，剥离排版字段 b/f/title）
// JSON 中 < 转义为 \u003c，防止经名/卷名意外闭合 script 标签
// ==============================
function metaJson(sutra) {
  const meta = {
    t: titleOf(sutra),
    r: sutra.r.map(({ t, i }) => ({ t, i }))
  };
  return JSON.stringify(meta).replace(/</g, '\\u003c');
}

// ==============================
// 生成完整 HTML
// ==============================
// ==============================
// 经1 定制块：会界注释开关（个人兴趣注释层，非原版内容）
// 定制数据与按钮代码同置于此；真源数据保持"完全一致"的忠实面貌。
// 默认关 = 纯原版；开启后 15 个会首卷加底色并显示「第X会」徽标。
// ==============================
const HUI_MARKS = [
  ['009479', '第二会'], ['011294', '第三会'], ['012545', '第四会'],
  ['013089', '第五会'], ['013253', '第六会'], ['013383', '第七会'],
  ['013414', '第八会'], ['013430', '第九会'], ['013448', '第十会'],
  ['013465', '第十一会'], ['013544', '第十二会'], ['013618', '第十三会'],
  ['013635', '第十四会'], ['013652', '第十五会'], ['013683', '第十六会']
];

function huiBlock() {
  const data = JSON.stringify(HUI_MARKS).replace(/</g, '\\u003c');
  return `<style>
#huiToggle { position: fixed; top: 12px; right: 16px; z-index: 1000; padding: 4px 14px; font-size: 0.9em; cursor: pointer; background-color: rgba(255,255,255,.92); border: 1px solid #ddd; border-radius: 16px; box-shadow: 0 1px 6px rgba(0,0,0,.12); }
@media (max-width:520px) { #huiToggle { top: 8px; right: 10px; padding: 3px 10px; font-size: .8em; } }
.hui-badge { display: none; margin-left: 6px; padding: 0 7px; font-size: .78em; color: #2e7031; background: #e5f3d8; border-radius: 9px; vertical-align: middle; }
body.show-hui td[data-hui] { background-color: #f0f8e6; }
body.show-hui .hui-badge { display: inline-block; }
</style>
<button id="huiToggle" type="button">会界: 关</button>
<script>
(function () {
  var HUI = ${data};
  var KEY = 'sutra1Hui';
  document.querySelectorAll('a.scroll-link').forEach(function (a) {
    var m = a.href.match(/idx=(\\d+)/);
    var hit = m && HUI.find(function (x) { return x[0] === m[1]; });
    if (hit) {
      a.closest('td').setAttribute('data-hui', '1');
      var b = document.createElement('span');
      b.className = 'hui-badge';
      b.textContent = hit[1];
      a.after(b);
    }
  });
  var btn = document.getElementById('huiToggle');
  function apply(on) {
    document.body.classList.toggle('show-hui', on);
    btn.textContent = on ? '会界: 开' : '会界: 关';
  }
  btn.addEventListener('click', function () {
    var on = !document.body.classList.contains('show-hui');
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
    apply(on);
  });
  var saved = false;
  try { saved = localStorage.getItem(KEY) === '1'; } catch (e) {}
  apply(saved);
})();
</script>`;
}

function renderHtml(sutra) {
  const groups = groupByVol(sutra);
  const out = [];
  out.push('<!DOCTYPE html>');
  out.push('<html lang="zh">');
  out.push('<head>');
  out.push('    <meta charset="utf-8"/>');
  out.push(`    <title>乾隆大藏经 · ${titleOf(sutra)}</title>`);
  out.push('    <link href="sutra.vols.css" rel="stylesheet">');
  out.push('</head>');
  out.push('<body>');
  out.push(`<h1><a href="sutra.html?start=${sutra.s}&end=${sutra.e}&idx=${sutra.s}&sutra=${sutra.n}" title="封面">${titleOf(sutra)}</a></h1>`);
  out.push('<div class="container">');
  out.push('');

  for (const g of groups) {
    const vol = g[0].i.slice(0, 3);
    out.push(`<h2>第${parseInt(vol, 10)}册</h2>`);
    out.push('');
    out.push(renderTable(sutra, g, vol));
    out.push('');
  }

  out.push('</div>');
  if (sutra.n === 1) out.push(huiBlock());
  out.push(`<script type="application/json" id="sutra-meta">${metaJson(sutra)}</script>`);
  out.push('</body>');
  out.push('</html>');
  return out.join('\n');
}

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
  const html = renderHtml(sutra);

  // 核对：生成卷目数应与 JSON 一致；内嵌数据块须可解析且卷数一致
  const rollCount = (html.match(/class="scroll-link"/g) || []).length;
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