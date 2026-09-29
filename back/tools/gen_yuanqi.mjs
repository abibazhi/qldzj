#!/usr/bin/env node
// gen_yuanqi.mjs - Excel 「乾隆大藏经缘起」-> docs/乾隆大藏经缘起.html
// Usage: node back/tools/gen_yuanqi.mjs [--check]
// Requires: npm package 'exceljs' OR python openpyxl fallback. This version uses python bridge via openpyxl (qldzj3 env).
// For portability we implement pure JS with exceljs if available, else try to import.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const XLSX = path.join(ROOT, 'docs/用大藏经自带总目录校对.xlsx');
const OUT = path.join(ROOT, 'docs/乾隆大藏经缘起.html');
const CACHE = path.join(ROOT, 'data/cache/yuanqi.json');

function parseTime(s){
  if(s==null) return {raw:null,year:null,display:null,sortKey:9999,era:null};
  let raw = String(s).trim().replace(/\u00a0/g,' ').trim();
  if(!raw) return {raw:null,year:null,display:null,sortKey:9999,era:null};
  let display = raw;
  // normalize YYYY-MM-DD HH:MM:SS -> YYYY-MM-DD
  const dm = display.match(/^(\d{4}-\d{2}-\d{2})(?:\s+00:00:00)?$/);
  if(dm) display = dm[1];
  // also handle 2024-06-15 00:00:00 with spaces
  const dm2 = display.match(/^(\d{4}-\d{2}-\d{2})\s/);
  if(dm2) display = dm2[1];
  // find year: any 3-4 digit 900-2030
  let year = null;
  const nums = [...display.matchAll(/\d{3,4}/g)].map(m=>parseInt(m[0],10));
  for(const n of nums){ if(n>=900 && n<=2030){ year=n; break; } }
  // era label
  let era=null;
  if(display.includes('北宋')) era='北宋';
  else if(display.includes('明')) era='明';
  else if(display.includes('清')||display.includes('雍正')||display.includes('乾隆')||display.includes('光绪')||display.includes('慈禧')) era='清';
  else if(display.includes('民国')) era='民国';
  return {raw, year, display, sortKey: year ?? 9999, era};
}

function esc(s){
  if(s==null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s){ return esc(s).replace(/'/g,'&#39;'); }

async function loadData(){
  // Try exceljs first
  let exceljs = null;
  try{ exceljs = await import('exceljs'); }catch{}
  if(exceljs){
    const wb = new exceljs.default.Workbook();
    await wb.xlsx.readFile(XLSX);
    const ws = wb.getWorksheet('乾隆大藏经缘起');
    const rows=[];
    ws.eachRow((row, rowNumber)=>{
      const vals = row.values; // 1-indexed, vals[0] undefined
      const arr = [];
      for(let c=1;c<=7;c++){
        let v = row.getCell(c).value;
        // handle richText / hyperlink / date
        if(v && typeof v==='object'){
          if(v instanceof Date){ v = v.toISOString().slice(0,10); }
          else if(v.text) v = v.text;
          else if(v.result) v = v.result;
          else if(v.richText) v = v.richText.map(r=>r.text).join('');
          else if(v.hyperlink) v = v.text || v.hyperlink;
        }
        if(v!=null) v = String(v).replace(/\u00a0/g,' ').trim();
        if(v==='') v=null;
        arr.push(v||null);
      }
      rows.push({r:rowNumber, vals:arr});
    });
    return rows;
  } else {
    // fallback: spawn python
    const { spawnSync } = await import('child_process');
    const py = process.env.PY || '/home/jm/.pyenv/versions/3.12.8/envs/qldzj3/bin/python';
    const script = `
import openpyxl, json, sys, datetime
wb=openpyxl.load_workbook('${XLSX.replace(/'/g,"\\'")}', data_only=True)
ws=wb['乾隆大藏经缘起']
out=[]
for r in range(1, ws.max_row+1):
    vals=[]
    for c in range(1,8):
        v=ws.cell(r,c).value
        if isinstance(v, datetime.datetime):
            v=v.strftime('%Y-%m-%d')
        elif v is not None:
            v=str(v).replace(chr(160),' ').strip()
            if v=='': v=None
        vals.append(v)
    out.append([r, vals])
print(json.dumps(out, ensure_ascii=False))
`;
    const res = spawnSync(py, ['-c', script], { encoding:'utf-8', maxBuffer: 10*1024*1024 });
    if(res.error) throw res.error;
    if(res.status!==0) throw new Error(res.stderr);
    const data = JSON.parse(res.stdout);
    return data.map(([r, vals])=>({r, vals}));
  }
}

function buildSectionsAndEvents(rows){
  // rows includes header at r=3
  const sections=[];
  const events=[];
  // map section name -> slug
  for(const {r, vals} of rows){
    if(r<=3) continue;
    const [a,b,c,d,e,f,g]=vals;
    const allNull = vals.every(v=>v==null);
    if(allNull) continue;
    const isSection = a!=null && b==null && c==null && d==null && e==null && f==null && g==null;
    if(isSection){
      const name = a.trim();
      sections.push({r, name});
    } else {
      // filter out completely empty events (should not happen)
      // keep if at least one of d/e/g or b/c has content
      const hasContent = (d!=null||e!=null||g!=null||b!=null||c!=null||a!=null||f!=null);
      if(!hasContent) continue;
      events.push({r, time:a, place:b, org:c, title:d, info:e, source:f, url:g});
    }
  }
  // assign events to section by r order
  let secIdx=-1;
  let secMap = new Map(); // name -> {name, slug, events[]}
  const secOrder=[];
  function slugify(name){
    return name.replace(/\s+/g,'-').replace(/[^\w\u4e00-\u9fa5-]/g,'').slice(0,40) || 'sec';
  }
  // ensure first section exists
  // walk sorted by r
  const sortedSections = [...sections].sort((x,y)=>x.r-y.r);
  const sortedEvents = [...events].sort((x,y)=>x.r-y.r);
  // create section buckets
  for(const s of sortedSections){
    const slug = slugify(s.name) + '-' + s.r;
    secMap.set(s.r, {name:s.name, slug, r:s.r, events:[]});
    secOrder.push(s.r);
  }
  // If events before first section, create implicit leading section
  if(sortedEvents.length && sortedSections.length && sortedEvents[0].r < sortedSections[0].r){
    // already before, assign to first section
  }
  // assign each event to nearest preceding section
  for(const ev of sortedEvents){
    let targetR=null;
    for(let i=sortedSections.length-1;i>=0;i--){
      if(sortedSections[i].r < ev.r){ targetR=sortedSections[i].r; break; }
    }
    if(targetR==null && sortedSections.length) targetR=sortedSections[0].r;
    if(targetR!=null){
      secMap.get(targetR).events.push(ev);
    }
  }
  // filter out sections with 0 events? Keep all for TOC but mark empty? We keep non-empty only for timeline, but TOC shows all.
  // Actually we keep all sections, events may be 0 for some headers like "新中国" alone - but that header will have 0 events until next subsection, merge? Keep as is.
  // For display, collapse empty sections into TOC but not timeline?
  const result=[];
  for(const r of secOrder){
    const s = secMap.get(r);
    // skip sections that are purely title with 0 events? Keep to show as divider if they have 0 but next section is sub? Instead we keep but render as divider.
    result.push(s);
  }
  return result;
}

function domainFromUrl(url){
  if(!url) return '';
  try{ const u=new URL(url); return u.hostname.replace(/^www\./,''); }catch{ return ''; }
}

function renderHTML(sections){
  const totalEvents = sections.reduce((n,s)=>n+s.events.length,0);
  const years = sections.flatMap(s=>s.events.map(e=>parseTime(e.time).year).filter(Boolean));
  const minYear = years.length? Math.min(...years): null;
  const maxYear = years.length? Math.max(...years): null;
  const span = minYear && maxYear ? `${minYear} — ${maxYear}` : '';

  // TOC
  const toc = sections.map(s=>`<a href="#${s.slug}" class="toc-link">${esc(s.name)}<span class="toc-count">${s.events.length}</span></a>`).join('');

  // stats
  const stats = [
    `${sections.length} 个阶段`,
    `${totalEvents} 条大事`,
    span ? span : ''
  ].filter(Boolean).join(' · ');

  const timeline = sections.map(s=>{
    if(s.events.length===0){
      return `<section id="${s.slug}" class="era" data-era="${escAttr(s.name)}">
        <div class="era-head"><h2>${esc(s.name)}</h2></div>
      </section>`;
    }
    const cards = s.events.map(ev=>{
      const t = parseTime(ev.time);
      const hasTitle = ev.title && ev.title.trim();
      const hasInfo = ev.info && ev.info.trim();
      const hasPlace = ev.place && ev.place.trim();
      const hasOrg = ev.org && ev.org.trim();
      const hasSource = ev.source && ev.source.trim();
      const hasUrl = ev.url && ev.url.trim() && /^https?:\/\//.test(ev.url.trim());
      const yearBadge = t.year ? `<span class="time-year">${t.year}</span>` : '';
      const eraBadge = t.year ? '' : (t.display ? `<span class="time-orig">${esc(t.display)}</span>` : `<span class="time-orig muted">时间待考</span>`);
      // split info by | or \n
      let infoHtml='';
      if(hasInfo){
        // Old python had joined with | for multi-line, also real \n
        const parts = String(ev.info).split(/\r?\n|\|/).map(s=>s.trim()).filter(Boolean);
        if(parts.length===1) infoHtml = `<div class="info">${esc(parts[0])}</div>`;
        else infoHtml = parts.map(p=>`<p>${esc(p)}</p>`).join('');
        if(parts.length>1) infoHtml = `<div class="info multiline">${infoHtml}</div>`;
        else infoHtml = `<div class="info">${esc(parts[0])}</div>`;
      }
      const meta = [];
      if(hasPlace) meta.push(`<span class="meta-item place">📍 ${esc(ev.place)}</span>`);
      if(hasOrg) meta.push(`<span class="meta-item org">🏛 ${esc(ev.org)}</span>`);
      const metaHtml = meta.length ? `<div class="meta">${meta.join('')}</div>` : '';
      const timeDisplay = t.display ? esc(t.display) : '';
      const timeLine = t.display ? `<div class="time-line"><span class="time-display">${timeDisplay}</span>${yearBadge}</div>` : `<div class="time-line">${eraBadge}</div>`;
      // For t.year exists, show both display + year pill; for no year, show display as pill
      let timeBlock='';
      if(t.display){
        if(t.year){
          // show year pill + display as subtitle
          timeBlock = `<div class="time"><span class="year-pill">${t.year}</span><span class="time-text">${esc(t.display)}</span></div>`;
        } else {
          timeBlock = `<div class="time"><span class="time-pill">${esc(t.display)}</span></div>`;
        }
      } else {
        timeBlock = `<div class="time"><span class="time-pill muted">时间待考</span></div>`;
      }
      const titleHtml = hasTitle ? `<h3 class="card-title">${esc(ev.title)}</h3>` : '';
      const sourceHtml = hasSource ? (hasUrl ? `<a class="source" href="${escAttr(ev.url)}" target="_blank" rel="noopener noreferrer">${esc(ev.source)}<span class="ext">↗</span><span class="domain">${esc(domainFromUrl(ev.url))}</span></a>` : `<span class="source text">${esc(ev.source)}</span>`) : '';
      // url without source
      const urlOnly = (!hasSource && hasUrl) ? `<a class="source" href="${escAttr(ev.url)}" target="_blank" rel="noopener noreferrer"><span class="domain">${esc(domainFromUrl(ev.url))}</span> ↗</a>` : '';
      return `<article class="card" data-year="${t.year||''}">
        ${timeBlock}
        ${titleHtml}
        ${infoHtml}
        ${metaHtml}
        ${sourceHtml}${urlOnly}
      </article>`;
    }).join('\n');
    return `<section id="${s.slug}" class="era">
      <div class="era-head"><h2>${esc(s.name)}</h2><span class="era-count">${s.events.length}</span></div>
      <div class="cards">${cards}</div>
    </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>乾隆大藏经缘起大事记</title>
<meta name="description" content="乾隆大藏经缘起大事记 — ${esc(stats)}">
<style>
:root{
  --paper:#fdf8f0;
  --paper2:#fffbf5;
  --card:#ffffff;
  --ink:#2b2b2b;
  --muted:#6b7280;
  --line:#e7ddd0;
  --accent:#b91c1c;
  --accent2:#8b1a1a;
  --indigo:#1e3a5f;
  --gold:#c9a86a;
  --pill:#1f2937;
  --radius:14px;
  --shadow:0 4px 16px rgba(43,43,43,.07);
  --shadow2:0 8px 28px rgba(43,43,43,.12);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{
  font-family: "Noto Serif SC","Source Han Serif SC","Songti SC","Microsoft YaHei",system-ui,-apple-system,serif;
  background:var(--paper);
  color:var(--ink);
  line-height:1.75;
  -webkit-font-smoothing:antialiased;
}
/* header */
.hero{
  max-width:1120px;margin:0 auto;padding:42px 20px 18px;
  text-align:center;
}
.hero h1{
  font-size:2.15em;letter-spacing:.12em;font-weight:800;
  color:var(--pill);
  position:relative;display:inline-block;
  padding-bottom:12px;
}
.hero h1::after{
  content:'';position:absolute;left:50%;bottom:0;transform:translateX(-50%);
  width:88px;height:3px;background:linear-gradient(90deg,var(--accent),var(--gold));border-radius:2px;
}
.hero .sub{
  margin-top:12px;color:var(--muted);font-size:.95em;letter-spacing:.04em;
}
.hero .stats{margin-top:8px;color:#8b7355;font-size:.88em}
/* layout */
.shell{max-width:1120px;margin:0 auto;padding:0 20px 40px;display:flex;gap:22px;align-items:flex-start}
.toc{
  position:sticky;top:14px;flex:0 0 210px;
  background:var(--paper2);border:1px solid var(--line);border-radius:var(--radius);
  padding:14px 12px;box-shadow:var(--shadow);
  max-height:calc(100vh - 28px);overflow:auto;
}
.toc-title{font-size:.82em;letter-spacing:.14em;color:#8b7355;font-weight:700;margin-bottom:10px;text-transform:uppercase}
.toc-link{
  display:flex;justify-content:space-between;align-items:center;
  padding:7px 8px;border-radius:8px;text-decoration:none;color:#334155;font-size:.88em;
  border:1px solid transparent;
}
.toc-link:hover{background:#fff;border-color:var(--line);color:var(--pill)}
.toc-link.active{background:var(--pill);color:#fff;border-color:var(--pill)}
.toc-count{font-size:.78em;background:#f1e8d9;color:#7c6650;padding:1px 6px;border-radius:20px;margin-left:8px}
.toc-link.active .toc-count{background:rgba(255,255,255,.18);color:#fff}
.toc-tools{margin-top:12px;padding-top:12px;border-top:1px dashed var(--line);display:flex;flex-direction:column;gap:8px}
.search{width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:#fff;font-size:.88em;outline:none}
.search:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,168,106,.18)}
.hint{font-size:.76em;color:#9aa0a6;line-height:1.5}
.main{flex:1;min-width:0}
/* era */
.era{margin-bottom:28px}
.era-head{
  display:flex;align-items:baseline;gap:10px;
  padding:10px 2px 10px 14px;
  border-left:4px solid var(--accent);
  margin-bottom:14px;
  background:linear-gradient(90deg, rgba(185,28,28,.06), transparent);
  border-radius:0 8px 8px 0;
}
.era-head h2{font-size:1.15em;letter-spacing:.08em;color:var(--pill)}
.era-count{font-size:.78em;color:var(--muted);background:#fff;border:1px solid var(--line);padding:2px 8px;border-radius:20px}
/* timeline */
.cards{position:relative;padding-left:22px}
.cards::before{
  content:'';position:absolute;left:6px;top:6px;bottom:6px;width:2px;background:var(--line);border-radius:2px;
}
.card{
  position:relative;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
  padding:16px 16px 14px;margin-bottom:12px;box-shadow:var(--shadow);
  transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.card::before{
  content:'';position:absolute;left:-18px;top:20px;width:10px;height:10px;background:#fff;border:2px solid var(--accent);border-radius:50%;
  box-shadow:0 0 0 3px var(--paper);
}
.card:hover{transform:translateY(-1px);box-shadow:var(--shadow2);border-color:#e2d5c3}
.time{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.year-pill{font-size:.78em;font-weight:700;letter-spacing:.04em;background:var(--pill);color:#fff;padding:3px 8px;border-radius:20px}
.time-pill{font-size:.82em;background:#fff7ed;border:1px solid #f0d9b5;color:#7c5a2a;padding:3px 9px;border-radius:20px}
.time-pill.muted{background:#f3f4f6;border-color:#e5e7eb;color:#9aa0a6}
.time-text{font-size:.84em;color:var(--muted)}
.card-title{font-size:1.02em;font-weight:750;color:var(--pill);line-height:1.5;margin-bottom:6px}
.info{color:#3a3a3a;font-size:.93em;white-space:pre-wrap;word-break:break-word}
.info.multiline p{margin:6px 0}
.info.multiline p:first-child{margin-top:0}
.meta{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px}
.meta-item{font-size:.8em;padding:4px 8px;border-radius:20px;border:1px solid var(--line);background:#fdfbf7;color:#5b4a33}
.meta-item.org{background:#f8fafc;color:#334155;border-color:#e2e8f0}
.source{margin-top:10px;display:inline-flex;align-items:center;gap:6px;font-size:.84em;color:var(--indigo);text-decoration:none;border:1px solid #dbe4f0;background:#f8faff;padding:4px 9px;border-radius:20px}
.source:hover{background:#eef4ff;border-color:#c9d8f5;text-decoration:none}
.source .ext{opacity:.7}
.source .domain{font-size:.82em;color:#64748b}
.source.text{color:var(--muted);background:#f9fafb;border-color:#e5e7eb}
.hidden{display:none !important}
/* footer */
.foot{max-width:1120px;margin:0 auto;padding:18px 20px 30px;color:#9aa0a6;font-size:.82em;text-align:center}
.foot a{color:#64748b}
@media (max-width: 880px){
  .shell{flex-direction:column}
  .toc{position:relative;top:auto;flex:none;width:100%;max-height:none}
  .toc{order:2}
  .main{order:1;width:100%}
  .hero h1{font-size:1.6em}
}
@media print{
  .toc{display:none}
  .shell{display:block}
  .card{break-inside:avoid;box-shadow:none}
}
</style>
</head>
<body>
  <header class="hero">
    <h1>乾隆大藏经缘起大事记</h1>
    <div class="sub">自北宋开宝藏至当代影印与数字化 · 以 Excel 原表为准</div>
    <div class="stats">${esc(stats)}</div>
  </header>
  <div class="shell">
    <nav class="toc" aria-label="阶段目录">
      <div class="toc-title">阶段目录</div>
      ${toc}
      <div class="toc-tools">
        <input id="q" class="search" placeholder="搜索 标题 / 地点 / 来源…" autocomplete="off">
        <div class="hint">点击阶段可跳 · 输入关键词即时筛选 · 年份胶囊为可排序公历年</div>
      </div>
    </nav>
    <main class="main">
      ${timeline}
    </main>
  </div>
  <footer class="foot">
    数据来源：<code>docs/用大藏经自带总目录校对.xlsx</code>「乾隆大藏经缘起」工作表 · 由 <code>back/tools/gen_yuanqi.mjs</code> 生成 · 复现：<code>node back/tools/gen_yuanqi.mjs</code>
  </footer>
<script>
const links=[...document.querySelectorAll('.toc-link')];
const eras=[...document.querySelectorAll('.era')];
function setActive(id){
  links.forEach(a=>a.classList.toggle('active', a.getAttribute('href')==='#'+id));
}
const io=new IntersectionObserver(ents=>{
  const vis=ents.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
  if(vis) setActive(vis.target.id);
},{rootMargin:'-40% 0px -50% 0px', threshold:0});
eras.forEach(e=>io.observe(e));
const q=document.getElementById('q');
q.addEventListener('input',()=>{
  const kw=q.value.trim().toLowerCase();
  document.querySelectorAll('.card').forEach(c=>{
    const t=c.textContent.toLowerCase();
    c.classList.toggle('hidden', kw && !t.includes(kw));
  });
  // hide empty eras
  document.querySelectorAll('.era').forEach(era=>{
    const vis=[...era.querySelectorAll('.card')].some(c=>!c.classList.contains('hidden'));
    era.style.display = (kw && !vis) ? 'none' : '';
  });
});
links.forEach(a=>{
  a.addEventListener('click',e=>{
    // allow default hash jump
    links.forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
  });
});
</script>
</body>
</html>`;
}

async function main(){
  const rows = await loadData();
  const sections = buildSectionsAndEvents(rows);
  // write cache
  fs.mkdirSync(path.dirname(CACHE),{recursive:true});
  fs.writeFileSync(CACHE, JSON.stringify(sections,null,2),'utf-8');
  const html = renderHTML(sections);
  const check = process.argv.includes('--check');
  if(check){
    if(!fs.existsSync(OUT)){ console.error('missing '+OUT); process.exit(1); }
    const cur = fs.readFileSync(OUT,'utf-8');
    if(cur!==html){ console.error('drift'); process.exit(2); }
    console.log('ok');
    return;
  }
  fs.writeFileSync(OUT, html,'utf-8');
  console.log('wrote',OUT, 'sections',sections.length,'events',sections.reduce((n,s)=>n+s.events.length,0));
}
main().catch(e=>{ console.error(e); process.exit(1); });
