// ============================================================
// gen_index.mjs
// 从唯一真源 data/sutra_table.js 生成 index.html（首页目录）
//
// 输入：
//   data/sutra_table.js  唯一真源（1671 条经目 + categoryMap）
// 输出：
//   index.html           首页（纯静态，含部类锚点/快速跳转/音频/预加载）
//
// 运行：
//   node back/tools/gen_index.mjs --dry   生成到临时目录并 diff（不写 index.html）
//   node back/tools/gen_index.mjs         直接写 index.html
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tablePath = join(root, 'data', 'sutra_table.js');
const outPath = join(root, 'index.html');
const dryDir = join(root, 'back', 'tools', '.gen_tmp_index');
const dry = process.argv.includes('--dry');

// 加载真源（ES module）
const { sutraLinks, categoryMap } = await import(tablePath);

// ==============================
// 链接生成：册号补3位零 + 页号补3位零
// 导航统一（2026-08-18）：所有经一律两个入口
//   标题文字链接 → 阅读页 sutra.html?start/end/sutra（经的首页）
//   卷索引图形链接 → 卷索引页 sutra{N}.idx.html（所有经都有，含单卷）
// ==============================
function readHref(s) {
  const [n, start, end] = s;
  const [sv, sp] = start.split('-');
  const [ev, ep] = end.split('-');
  return `public/sutra.html?start=${sv.padStart(3, '0')}${sp.padStart(3, '0')}&end=${ev.padStart(3, '0')}${ep.padStart(3, '0')}&sutra=${n}`;
}
function idxHref(s) {
  return `public/sutra${s[0]}.idx.html`;
}

// ==============================
// 译者：；分隔 → <br>（与首页原版一致）
// ==============================
function trOf(tr) {
  return tr.replace(/；/g, '<br>');
}

// ==============================
// 表格体（含部类分组行）
// ==============================
function renderTable() {
  const lines = [];
  lines.push('        <table border="1" class="dataframe">');

  const catKeys = Object.keys(categoryMap).map(Number).sort((a, b) => a - b);
  let catIdx = 0;

  for (let i = 0; i < sutraLinks.length; i++) {
    const s = sutraLinks[i];
    const n = s[0];

    // 部类标题行：当前经号 >= 下一个分类起点 时插入
    while (catIdx < catKeys.length && Number(n) >= catKeys[catIdx]) {
      const key = catKeys[catIdx];
      lines.push(`        <tr id="anchor_${key}">`);
      lines.push('            <td></td>');
      lines.push(`            <td colspan="2"><strong>${categoryMap[key]}</strong></td>`);
      lines.push('        </tr>');
      catIdx++;
    }

    // 经条目行：经号0（目录）不显示数字，译者为空
    const num = String(n);
    const numTd = num === '0' ? '            <td></td>' : `            <td>${num}</td>`;
    // 标题 = 简体经名 + 别名（真源 s[5]=alias，缺失为 ''）
    const alias = s[5] || '';
    const title = s[3] + (alias || '');
    // 导航统一：标题链接进阅读页，其后图形链接进卷索引页
    const tr = trOf(s[4]);

    lines.push('        <tr>');
    lines.push(numTd);
    // 非数字经号（勘误表）无卷信息，只给阅读链接；其余经统一双链接
    if (typeof n === 'number') {
      lines.push(`            <td><a href="${readHref(s)}">${title}</a><a href="${idxHref(s)}" class="idx-link" title="卷索引">☰</a></td>`);
    } else {
      lines.push(`            <td><a href="${readHref(s)}">${title}</a></td>`);
    }
    lines.push(tr ? `            <td>${tr}</td>` : '            <td></td>');
    lines.push('        </tr>');
  }

  lines.push('    </table>');
  return lines.join('\n');
}

// ==============================
// 快速跳转区块（从 categoryMap 生成）
// ==============================
function renderAnchors() {
  const lines = [];
  lines.push('        <!-- 快速跳转链接 -->');
  lines.push('        <div class="special-anchor">');
  lines.push('            快速跳转: ');
  const catKeys = Object.keys(categoryMap).map(Number).sort((a, b) => a - b);
  catKeys.forEach((key, i) => {
    const sep = i === catKeys.length - 1 ? '' : ' | ';
    lines.push(`            <a href="#anchor_${key}">${categoryMap[key]}</a>${sep}`);
  });
  lines.push('        </div>');
  return lines.join('\n');
}

// ==============================
// 完整 HTML
// ==============================
function renderHtml() {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>乾隆大藏经目录</title>
    <link href="index.css" rel="stylesheet">

<script>
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?7784bc9ab299071f3a78b249954402c8";
  var s = document.getElementsByTagName("script")[0]; 
  s.parentNode.insertBefore(hm, s);
})();
</script>
</head>
<body>
    <h1>乾隆大藏经目录</h1>
    <div class="container">
${renderAnchors()}

${renderTable()}

<!-- 底部信息栏 -->
<footer class="footer-info">
    <div class="footer-links">

        <!-- 1. GitHub（房子 = 主页/项目地址） -->
        <a href="https://github.com/abibazhi/qldzj"
           class="footer-icon-link"
           title="查看项目源码"
           target="_blank"
           rel="noopener noreferrer">
            <span class="footer-icon">🏠</span>
            <span class="link-label">项目地址</span>
        </a>

        <span class="footer-divider">|</span>

        <!-- 2. 勘误表（图钉 = 标记/勘误） -->
        <a href="erratum/erratum.verify.html"
           class="footer-icon-link"
           title="勘误表核对及增补">
            <span class="footer-icon">📌</span>
            <span class="link-label">勘误表核对</span>
        </a>

    </div>

    <div class="footer-note">
        <span class="heart">❤️</span>
        本目录仅供学习参考，如有错误欢迎提交
        <a href="https://github.com/abibazhi/qldzj/issues" target="_blank">Issue</a>
        或
        <a href="https://github.com/abibazhi/qldzj/pulls" target="_blank">PR</a>
        指正

        <!-- 音乐控制按钮 -->
        <span
            id="musicBtn"
            style="margin-left: 2px; cursor: pointer; vertical-align: top; transition: color 0.3s ease;">🔇
        </span>
    </div>
</footer>


<!-- 移除了 controls 属性，音乐播放器被隐藏 -->
<audio id="bgMusic" src="https://img.daxumi.top/%E5%8D%97%E6%97%A0%E8%8D%AF%E5%B8%88%E7%90%89%E7%92%83%E5%85%89%E5%A6%82%E6%9D%A5.mp3" preload="auto" loop muted fetchpriority="low"></audio>

<script>
  const audio = document.getElementById('bgMusic');
  const btn = document.getElementById('musicBtn');

  // 页面加载后，尝试静音自动播放（现代浏览器允许）
  window.addEventListener('load', () => {
    audio.play().catch(() => {
      // 如果自动播放被阻止，可以忽略或做其他处理
    });
  });

  // 点击按钮切换播放/暂停和图标
  btn.addEventListener('click', () => {
    if (audio.muted) {
      audio.muted = false;
      audio.play();
      btn.textContent = '🔊'; // 有声状态
    } else {
      audio.muted = true;
      btn.textContent = '🔇'; // 静音状态
    }
  });
</script>

<script>
// 给每部经加上html的id，以便跳转
var rows = document.querySelectorAll('table tr');

rows.forEach(function(row) {
    var firstTd = row.querySelector('td:first-child');
    if (firstTd) {
        var text = firstTd.textContent.trim();
        if (/^\\d+$/.test(text)) {
            firstTd.id = 'sutra' + text;
        }
    }
});
</script>

<script>
// 异步预加载全量映射数据（仅入 HTTP 缓存，不解析，避免阻塞渲染）
const preloadMapping = () => {
    fetch('./js/mapping.json').catch(() => {});
};
if ('requestIdleCallback' in window) requestIdleCallback(preloadMapping);
else setTimeout(preloadMapping, 3000);
</script>

</body>
</html>
`;
}

// ==============================
// 主流程
// ==============================
const html = renderHtml();

if (dry) {
  mkdirSync(dryDir, { recursive: true });
  writeFileSync(join(dryDir, 'index.html'), html, 'utf8');
  const old = readFileSync(outPath, 'utf8');
  const same = old === html;
  console.log(`✅ dry-run 生成到 ${join(dryDir, 'index.html')}`);
  console.log(`   与现有 index.html 完全一致: ${same}`);
  console.log(`   条数: ${sutraLinks.length} | 大小: ${(Buffer.byteLength(html) / 1024).toFixed(1)}KB`);
} else {
  writeFileSync(outPath, html, 'utf8');
  console.log(`✅ 已写入 ${outPath}`);
  console.log(`   条数: ${sutraLinks.length} | 大小: ${(Buffer.byteLength(html) / 1024).toFixed(1)}KB`);
}