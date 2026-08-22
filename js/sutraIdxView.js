// ============================================================
// sutraIdxView.js — 经卷索引页共享渲染器
// Node 生成器（back/tools/gen_sutra_idx.mjs）与浏览器壳页引导共用，
// 排版规则只有这一份实现。
//
// data 结构：{ n:经号, s:start6位, e:end6位, t:繁体经名,
//             r:[{ t:卷名, i:起始idx, b?:加黑子串 }], gs?:[每组卷数] }
// ============================================================

// 页码推导：6 位 idx → 后 3 位；7 位 idx → 后 4 位；去前导零，统一阿拉伯数字
// （原经0 中文数字特判已移除，2026-08-22）
export function pageOf(idx) {
  if (idx.length === 7) return String(parseInt(idx.slice(-4), 10));
  return String(parseInt(idx.slice(-3), 10));
}

// 排版判定：整行（colspan=2） vs 半列
// 1) 经0（目录）一律整行（跟随原版 C 图排版）
// 2) 文本长度 > limit → 整行
export function isFullRow(data, roll, limit) {
  if (data.n === 0) return true;
  return roll.t.length > limit;
}

function renderEntry(data, roll, indent, limit) {
  const idx = roll.i;
  const href = `sutra.html?start=${data.s}&end=${data.e}&idx=${idx}&sutra=${data.n}`;
  // 加黑：b 字段子串 → <b>...</b>（indexOf 定位，不依赖位置）
  let label = roll.t;
  if (roll.b && label.includes(roll.b)) {
    label = label.replace(roll.b, `<b>${roll.b}</b>`);
  }
  const page = pageOf(idx);
  return `${indent}<div class="entry">
${indent}    <span class="title">
${indent}        <a href="${href}" class="scroll-link">${label}</a>
${indent}    </span>
${indent}    <span class="dots"></span>
${indent}    <span class="page">${page}</span>
${indent}</div>`;
}

// 渲染一个 table（一组卷目，对应一个 h2 册）
function renderTable(data, rolls, limit) {
  const lines = [];
  lines.push('<table>');
  // 按整行/半列分组：整行单占一行；半列两两配对
  const groups = [];
  let cur = [];
  for (const r of rolls) {
    if (isFullRow(data, r, limit)) {
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
      lines.push(renderEntry(data, r, '            ', limit));
      lines.push('        </td>');
      lines.push('    </tr>');
    } else {
      const items = g.items;
      for (let i = 0; i < items.length; i += 2) {
        const a = items[i];
        const b = items[i + 1];
        lines.push('    <tr>');
        lines.push(`        <td class="left-col">`);
        lines.push(renderEntry(data, a, '            ', limit));
        lines.push('        </td>');
        if (b) {
          lines.push(`        <td class="right-col">`);
          lines.push(renderEntry(data, b, '            ', limit));
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

// 按 idx 前 3 位分册；经1165 用 gs 显式分表
function groupByVol(data) {
  const rolls = data.r;
  if (data.gs) {
    // 经1165：gs 指定每组（table）卷数
    const groups = [];
    let offset = 0;
    for (const size of data.gs) {
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

// 富化数据块：壳页引导与阅读页（js/sutraInfo.js）共用的机器可读契约
// 含 n/s/e（h1 封面链接用）、gs（1165 分表）、b（加黑，仅 4 条）
export function metaFullJson(data) {
  const r = data.r.map(({ t, i, b }) => (b ? { t, i, b } : { t, i }));
  const meta = { n: data.n, s: data.s, e: data.e, t: data.t, r };
  if (data.gs) meta.gs = data.gs;
  return JSON.stringify(meta).replace(/</g, '\\u003c');
}

// 页面主体：h1 + 各册表格（浏览器引导渲染与 Node 参考比对共用）
export function renderBody(data, limit = 24) {
  const groups = groupByVol(data);
  const out = [];
  out.push(`<h1><a href="sutra.html?start=${data.s}&end=${data.e}&idx=${data.s}&sutra=${data.n}" title="封面">${data.t}</a></h1>`);
  out.push('<div class="container">');
  out.push('');

  for (const g of groups) {
    const vol = g[0].i.slice(0, 3);
    out.push(`<h2><a class="vol-link" href="../vols.idx.html?vol=${parseInt(vol, 10)}">第${parseInt(vol, 10)}册</a></h2>`);
    out.push('');
    out.push(renderTable(data, g, limit));
    out.push('');
  }

  out.push('</div>');
  return out.join('\n');
}

// 壳页：静态部分只有数据块与样式链接，主体由 js/sutraIdxBoot.js 渲染
export function renderShell(data, opts = {}) {
  const out = [];
  out.push('<!DOCTYPE html>');
  out.push('<html lang="zh">');
  out.push('<head>');
  out.push('    <meta charset="utf-8"/>');
  if (opts.headHtml) out.push(opts.headHtml);
  out.push('    <link href="sutra.vols.css" rel="stylesheet">');
  out.push('</head>');
  out.push('<body>');
  out.push(`<script type="application/json" id="sutra-meta">${metaFullJson(data)}</script>`);
  if (opts.huiData) {
    const d = JSON.stringify(opts.huiData).replace(/</g, '\\u003c');
    out.push(`<script type="application/json" id="hui-data">${d}</script>`);
  }
  out.push('<script type="module" src="../js/sutraIdxBoot.js"></script>');
  out.push('</body>');
  out.push('</html>');
  return out.join('\n');
}
