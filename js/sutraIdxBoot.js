// ============================================================
// sutraIdxBoot.js — 卷索引壳页引导脚本
// 读 #sutra-meta 数据块渲染整页；经1 额外初始化会界注释层。
// 渲染逻辑来自共享模块 js/sutraIdxView.js（与生成器同一份排版规则）。
// ============================================================
import { ROLL_FULL_ROW_CHAR_LIMIT } from './config.js';
import { renderBody } from './sutraIdxView.js';

try {
  const data = JSON.parse(document.getElementById('sutra-meta').textContent);
  const huiRaw = document.getElementById('hui-data'); // 先取块再清空 body
  document.title = `乾隆大藏经 · ${data.t}`;
  document.body.innerHTML = renderBody(data, ROLL_FULL_ROW_CHAR_LIMIT);

  if (huiRaw) initHui(JSON.parse(huiRaw.textContent));
} catch (err) {
  console.error('卷索引渲染失败:', err);
  document.body.innerHTML = '<div class="container"><p>卷索引加载失败，请刷新重试。</p></div>';
}

// 经1 会界注释层（定制数据见页面 #hui-data 块，非原版内容；默认关=纯原版）
function initHui(HUI) {
  const KEY = 'sutra1Hui';
  document.querySelectorAll('a.scroll-link').forEach(a => {
    const m = a.href.match(/idx=(\d+)/);
    const hit = m && HUI.find(x => x[0] === m[1]);
    if (hit) {
      a.closest('td').setAttribute('data-hui', '1');
      const b = document.createElement('span');
      b.className = 'hui-badge';
      b.textContent = hit[1];
      a.after(b);
    }
  });

  const btn = document.createElement('button');
  btn.id = 'huiToggle';
  btn.type = 'button';
  btn.textContent = '会界: 关';
  document.body.appendChild(btn);

  const apply = on => {
    document.body.classList.toggle('show-hui', on);
    btn.textContent = on ? '会界: 开' : '会界: 关';
  };
  btn.addEventListener('click', () => {
    const on = !document.body.classList.contains('show-hui');
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
    apply(on);
  });
  let saved = false;
  try { saved = localStorage.getItem(KEY) === '1'; } catch (e) {}
  apply(saved);
}
