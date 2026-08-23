// ============================================================
// verify_special_cases.mjs
// 《docs/SPECIAL_CASES.md》特例总录的机器断言脚本。
//
// 作用：把总录中立账的特例固化为回归检查，防止将来重构/改数时
// 静默破坏。文档与脚本冲突时：先跑本脚本取实测数，再修文档。
//
// 运行：node back/tools/verify_special_cases.mjs
// 退出码：0=全部通过；1=存在失败（逐条列出）
// ============================================================
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { sutraLinks, VOLUME_PAGE_COUNTS } = await import(join(root, 'data', 'sutra_table.js'));
const mv = JSON.parse(readFileSync(join(root, 'data/cache/multi_vol.json'), 'utf8'));
const mapping = JSON.parse(readFileSync(join(root, 'js/mapping.json'), 'utf8'));

// ---------- 工具 ----------
const failures = [];
let checkCount = 0;
function check(name, cond, detail = '') {
  checkCount++;
  const ok = cond === true;
  if (!ok) failures.push(`✗ ${name}${detail ? ' —— ' + detail : ''}`);
  return ok;
}
const num = (r) => (typeof r[0] === 'number' ? r[0] : null);
const bySutra = new Map(sutraLinks.filter((r) => num(r) !== null).map((r) => [r[0], r]));
const get = (n) => bySutra.get(n);
// 「册-页」→ 6位idx（册3位+页3位，页≥1000自然进位为7位）
const idxOf = (ref) => {
  const [v, p] = String(ref).split('-').map(Number);
  return `${String(v).padStart(3, '0')}${String(p).padStart(3, '0')}`;
};
const plusOne = (ref) => {
  const [v, p] = String(ref).split('-').map(Number);
  return idxOf(`${v}-${p + 1}`);
};
const volOf = (ref) => +String(ref).split('-')[0];
const pk = (ref) => {
  const [v, p] = String(ref).split('-').map(Number);
  return v * 100000 + p;
};

// ---------- 快照打印 ----------
const rows = sutraLinks;
const numericRows = rows.filter((r) => num(r) !== null);
const singleRoll = numericRows.filter((r) => r[7]?.length === 1);
const singlePage = singleRoll.filter((r) => r[1] === r[2]);
const srNsp = singleRoll.filter((r) => r[1] !== r[2]); // 单卷非单页
const members = new Set(mv.members);
const firsts = new Set(mv.firsts);

console.log('—— 快照 ——');
console.log(`真源记录 ${rows.length}（数字经 ${numericRows.length} + 勘误表 ${rows.length - numericRows.length}）`);
console.log(`多经同卷分组 ${firsts.size} 组 / ${members.size} 经`);
console.log(`单卷经 ${singleRoll.length} = 单页 ${singlePage.length} + 非单页 ${srNsp.length}`);

// ================= A. 结构边界哨兵 =================
check('A1 经0 start=1-0', get(0)?.[1] === '1-0');
check('A1 经0 end=1-162', get(0)?.[2] === '1-162');
check('A1/E4 经0 rolls 共10条', get(0)?.[7]?.length === 10);

const erratum = rows.find((r) => num(r) === null);
check('A2 勘误表唯一非数字记录且仅1条', rows.length - numericRows.length === 1 && erratum !== undefined);
check('A2 勘误表 start=169-1', erratum?.[1] === '169-1');
check('A2 勘误表 end=169-62', erratum?.[2] === '169-62');
check('A2 勘误表无rolls', !Array.isArray(erratum?.[7]) || erratum[7].length === 0);

// 相邻衔接形态（同册内）
let sharedBoundary = 0;
const strictOverlaps = [];
for (let k = 1; k < rows.length - 1; k++) {
  const a = rows[k], b = rows[k + 1];
  if (num(a) === null || num(b) === null) continue;
  if (volOf(a[2]) !== volOf(b[1])) continue; // 跨册不在此断言
  const d = pk(b[1]) - pk(a[2]);
  if (d === 0) sharedBoundary++;
  else if (d < 0) strictOverlaps.push([num(a), num(b)]);
}
check('A3 共享边界页51处', sharedBoundary === 51, `实测 ${sharedBoundary}`);
check(
  'B11 严格交叠恰为 878→879、1571→1572 两例',
  JSON.stringify(strictOverlaps) === JSON.stringify([[878, 879], [1571, 1572]]),
  `实测 ${JSON.stringify(strictOverlaps)}`
);

// ================= B. 导航定位类 =================
// B1 三类指向计数
const plus1 = srNsp.filter((r) => r[7][0].i === plusOne(r[1]));
const atStart = srNsp.filter((r) => r[7][0].i === idxOf(r[1]));
const others = srNsp.filter((r) => r[7][0].i !== idxOf(r[1]) && r[7][0].i !== plusOne(r[1]));
check('B1 单卷1015', singleRoll.length === 1015, `实测 ${singleRoll.length}`);
check('B1 单页经51', singlePage.length === 51, `实测 ${singlePage.length}`);
check('B1 单页经全部 i==start', singlePage.every((r) => r[7][0].i === idxOf(r[1])));
check('B1 非单页964', srNsp.length === 964, `实测 ${srNsp.length}`);
check('B1 +1 共411', plus1.length === 411, `实测 ${plus1.length}`);
check('B1 ==start 共552', atStart.length === 552, `实测 ${atStart.length}`);
check('B1 其它仅经879(start+2)', others.map((r) => num(r)).join(',') === '879');
check('B6 经879 i==start+2', (() => {
  const r = get(879);
  const [v, p] = r[1].split('-').map(Number);
  return r[7][0].i === idxOf(`${v}-${p + 2}`);
})());

// B2 回退清单主表交叉校验
const mdRaw = readFileSync(join(root, 'data/multi_same_volume.md'), 'utf8');
const mainPart = mdRaw.split('## 例外')[0];
const mdIds = [...mainPart.matchAll(/^\| (\d+) \|/gm)].map((m) => +m[1]);
check('B2 主表556条且无重复', mdIds.length === 556 && new Set(mdIds).size === 556, `实测 ${mdIds.length}`);
const keptPlus1 = new Set([406, 411, 457, 466]);
const mdBad = mdIds.filter((id) => {
  const r = get(id);
  return !(r[7][0].i === idxOf(r[1]) || (keptPlus1.has(id) && r[7][0].i === plusOne(r[1])));
});
check('B2 主表每条满足 i==start 或 ∈{406,411,457,466}(+1)', mdBad.length === 0, `违规: ${mdBad.join(',')}`);
const excPart = mdRaw.split('## 例外')[1] ?? '';
const excIds = [...excPart.matchAll(/^\| (\d+) \|/gm)].map((m) => +m[1]);
check('B3 例外表恰为411/457/466', JSON.stringify(excIds.sort()) === JSON.stringify([411, 457, 466]), `实测 ${excIds}`);
for (const id of [411, 457, 466]) {
  const r = get(id);
  check(`B3 经${id} 非首部成员且 i==start+1`, members.has(id) && !firsts.has(id) && r[7][0].i === plusOne(r[1]));
}

// B4 早期合法+1集合
const EARLY = [16, 17, 36, 37, 46, 47, 51, 52, 66, 90, 91, 93, 95, 96, 98, 99, 104, 105, 119, 120, 121, 132, 151];
const derivedEarly = plus1
  .filter((r) => members.has(num(r)) && !firsts.has(num(r)))
  .map((r) => num(r))
  .filter((id) => volOf(get(id)[1]) <= 37)
  .sort((a, b) => a - b);
check(
  'B4 早期合法+1恰为23部清单',
  JSON.stringify(derivedEarly) === JSON.stringify([...EARLY].sort((a, b) => a - b)),
  `实测 ${derivedEarly}`
);

// B5 组外无扉页三例：在主表生效集内，但不属"组非首部"常规机制
const effective = new Set(mdIds.filter((id) => !keptPlus1.has(id)));
const nonFirst = new Set([...members].filter((id) => !firsts.has(id)));
const trioExpected = [1225, 1239, 1591];
const specialInList = [...effective].filter((id) => !nonFirst.has(id)).sort((a, b) => a - b);
check('B5 生效集内非(组非首部)者恰为1225/1239/1591', JSON.stringify(specialInList) === JSON.stringify(trioExpected), `实测 ${specialInList}`);
check('B5 三经均 i==start', trioExpected.every((id) => get(id)[7][0].i === idxOf(get(id)[1])));

// B7 仅序四部
for (const id of [127, 128, 206, 401]) {
  const r = get(id);
  check(`B7 经${id} 仅1条序/记且 i==start+1`, r[7]?.length === 1 && r[7][0].i === plusOne(r[1]));
}

// B9 经1049 无卷数
{
  const r = get(1049);
  check('B9 经1049 tradTitle为空', r?.[6] === '');
  check('B9 经1049 title不带卷数字样', !/[一二两三四五六七八九十百〇千]+\s*卷/.test(r?.[3] ?? 'x'), r?.[3]);
}

// ================= E3/E4. 排版特例 =================
{
  const r = get(1165);
  check('E3 经1165 gs=[10,10,11,19]', JSON.stringify(r?.[8]) === JSON.stringify([10, 10, 11, 19]));
  check('E3 经1165 共50卷', r?.[7]?.length === 50, `实测 ${r?.[7]?.length}`);
  check('E3 经1165 加黑b恰4条', r?.[7]?.filter((x) => x.b).length === 4);
}

// ================= G. 资产 =================
{
  // 键为三位补零字符串：'001'~'168'=正文卷，'169'=勘误表；无 '000'
  // （经0 所在的第 1 册用 page0 字段承载封面，见 mapping.notes.md）
  const keys = Object.keys(mapping).sort();
  const wantKeys = Array.from({ length: 169 }, (_, i) => String(i + 1).padStart(3, '0'));
  check("G1 mapping 键恰为 '001'~'169'", JSON.stringify(keys) === JSON.stringify(wantKeys), `实测 ${keys.length}个`);
  const badVol = keys.filter((k) => k !== '169' && mapping[k].pages?.length !== VOLUME_PAGE_COUNTS[+k]);
  check('G1 正文各卷pages长度与VOLUME_PAGE_COUNTS一致', badVol.length === 0, `不一致: ${badVol}`);
  check('G2 勘误表169卷pages=62页', mapping['169']?.pages?.length === 62);
  check('G1 第1册含page0字段（经0封面）', typeof mapping['001']?.page0 === 'string');
  const badCat = keys.filter((k) => !Array.isArray(mapping[k].catalog));
  check('G1 各卷均有catalog数组', badCat.length === 0, `缺失: ${badCat}`);
}
check('G3 彩色大图范围仍为001卷0~162（若调整请同步 docs/SPECIAL_CASES.md G3）',
  JSON.stringify((await import(join(root, 'js/config.js'))).COLOR_IMAGE_RANGES) === JSON.stringify([{ vol: '001', pageStart: 0, pageEnd: 162 }])
);

// ================= D2 字形抽检（正字在位） =================
check('D2 sutra963 函号用「凊」', get(963)?.[7]?.some((x) => x.t.includes('凊')) === true);
check('D2 sutra1 卷591~600 用「柰」一~十', (() => {
  const ts = get(1)[7].slice(590, 600).map((x) => x.t);
  const want = ['柰一', '柰二', '柰三', '柰四', '柰五', '柰六', '柰七', '柰八', '柰九', '柰十'];
  return want.every((w, i) => ts[i]?.includes(w));
})());
check('D2 sutra1568/1569 函号用「漠」', [1568, 1569].every((id) => get(id)?.[7]?.some((x) => x.t.includes('漠'))));
check('D2 sutra1163 卷目用「傅」', get(1163)?.[7]?.some((x) => x.t.includes('傅')) === true);
check('D4 sutra1011 译者字段含「𭊁」(U+2D281)', get(1011)?.[4].includes('\u{2D281}') === true);

// ---------- 结果 ----------
console.log('—— 结果 ——');
if (failures.length === 0) {
  console.log(`✅ 全部通过（共 ${checkCount} 项断言）。快照与《docs/SPECIAL_CASES.md》一致。`);
} else {
  console.log(`❌ ${failures.length}/${checkCount} 项失败：`);
  failures.forEach((f) => console.log('  ' + f));
  process.exit(1);
}
