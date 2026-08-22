// ============================================================
// gen_sitemap.mjs
// 从唯一真源 data/sutra_table.js 生成 sitemap.xml 与 robots.txt
//
// 收录范围（2026-08-22 确认）：
//   / 、/idx.html、/vols.idx.html、/erratum/erratum.verify.html
//   /public/sutra{N}.idx.html × 1670
//   阅读入口（sutra.html?参数）暂不收录，靠内链自然发现
//
// 运行：node back/tools/gen_sitemap.mjs
// ============================================================
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = 'https://qldzj.daxumi.top';

const table = (await import(join(root, 'data', 'sutra_table.js'))).sutraLinks;
const today = new Date().toISOString().slice(0, 10);

const urls = [];
urls.push(`${BASE}/`);
urls.push(`${BASE}/idx.html`);
urls.push(`${BASE}/vols.idx.html`);
for (const s of table) {
  if (typeof s[0] !== 'number') continue;
  urls.push(`${BASE}/public/sutra${s[0]}.idx.html`);
}
urls.push(`${BASE}/erratum/erratum.verify.html`);

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(u => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`),
  '</urlset>',
  ''
].join('\n');
writeFileSync(join(root, 'sitemap.xml'), xml, 'utf8');

const robots = [
  'User-agent: *',
  'Disallow: /js/',
  'Disallow: /css/',
  'Disallow: /data/',
  '',
  `Sitemap: ${BASE}/sitemap.xml`,
  ''
].join('\n');
writeFileSync(join(root, 'robots.txt'), robots, 'utf8');

console.log(`✅ sitemap.xml ${urls.length} 条 | robots.txt 已生成 | lastmod=${today}`);
