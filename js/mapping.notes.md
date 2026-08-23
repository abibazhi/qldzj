# js/mapping.json 说明

本文件为全站统一图片映射数据（ImgBB 图片 ID），替代原「每卷一个 R2 mapping.js」的多源依赖方案。
2026-08-12 起改为 `pages + catalog` 结构，同时收纳原 `erratum/data/catalog_imgbb.js`（目录 C 图，旧文件已删，存档于 `back/tools/legacy_src/`）。
2026-08-13 起移至 `js/` 目录，与图片加载入口 `imageLoader.js` 同放一处（mapping 只与图片加载相关），全站仅保留此一份。

## 结构

```json
{
  "001": { "pages": ["ImgBB图片ID", ...], "catalog": ["C1图ID"], "page0": "ImgBB图片ID" },
  ...
  "168": { "pages": ["ImgBB图片ID", ...], "catalog": ["C1图ID", "C2图ID"] },
  "169": { "pages": ["勘误表62页ID..."], "catalog": [] }
}
```

- 键：三位补零卷号 `'001'~'169'`。**无** `000`——第 0 部经所在的第 1 册以 `page0` 字段承载封面图（`pages` 仍从页 1 起）；`'169'`=勘误表（62 页）
- `pages`：该卷正文页数组，长度 = 该卷页数，与 `data/sutra_table.js` 的 `VOLUME_PAGE_COUNTS` 一一对应（生成时已交叉校验；现行断言见 `back/tools/verify_special_cases.mjs`）
- `catalog`：该卷目录封面（C 图）ImgBB ID 数组，`catalog[i]` 即 `C{i+1}` 图；无 C 图的卷为空数组
- `page0`：第 0 页（`0.png`，封面）的 ImgBB ID；仅第 0 部经所在卷 001 存在。0 页是"序列之前的前导"标记，不进入正文 `pages`（`pages` 仍从页 1 起），读取逻辑见 `imageLoader.js` 的 `getImgBBId`（name=`"0"`）

## 图片 URL 拼接规则

| 源 | 规则 | 示例 |
|---|---|---|
| R2 | `https://img.daxumi.top/{卷号}/{页或C图}.png` | `https://img.daxumi.top/001/0.png` |
| ImgBB 正文 | `https://i.ibb.co/{ID}/{卷号}-{页}-png.png` | `https://i.ibb.co/fGqHPrQB/001-0-png.png` |
| ImgBB 目录 | `https://i.ibb.co/{ID}/{卷号}-C{n}-png.png` | `https://i.ibb.co/4RztWvSW/001-C1-png.png` |
| GitHub | `https://abibazhi.github.io/{卷号}/{页}.png` | `https://abibazhi.github.io/001/0.png` |

## 消费方（统一入口）

全站图片加载统一走 `js/imageLoader.js`（唯一入口）：
- 主阅读页：`loadMapping` / `buildSources` / `getBestImageUrl`
- 勘误表页面与 `vols.idx.html`：`getCandidates` / `resolveImage` / `initImageFallback`（`window.__erratumFallback`）

`js/mapping.json` 的定位统一用 `new URL('./mapping.json', import.meta.url)`（基于 `imageLoader.js`），根目录页面与 `/erratum/` 子目录页面均可访问。

## 生成方式

由 `back/tools/gen_unified_mapping.mjs` 生成：
- 输入：`back/tools/legacy_src/mapping.json`（旧每卷数组结构，一次性迁移完成后已删除）+ `back/tools/legacy_src/catalog_imgbb.js`
- 输出：上述新结构 `js/mapping.json`
- 校验：169 卷、每卷 `pages.length` 与 `VOLUME_PAGE_COUNTS` 一致、`catalog` 条目总数与原文件一致

> 2026-08-23 起一次性迁移的遗留输入已整体归档（`~/archive/qldzj-back-20260823.tar.gz`），
> `back/` 目录仅保留 `tools/*.mjs` 生成脚本；`gen_unified_mapping.mjs` 属已完成的历史迁移，不再重跑。

```
node back/tools/gen_unified_mapping.mjs
```

## 数据问题记录

### 2026-08-18 第 0 部经图片编号调整（001 卷）

- 第 0 部经（大清三藏聖教目录）阅读范围由 `1-1` 改为 `1-0`，新增封面图 `0.png`：
  - 三个源同步改名：原目录封面 `C1.png` → `0.png`（R2 / GitHub 直接改名；ImgBB 不可改名，重传得新 ID `fGqHPrQB`，记入 `page0`）
  - 原 `C2.png` → `C1.png`（R2 / GitHub 直接改名；ImgBB 重传得新 ID `4RztWvSW`）
  - `catalog` 相应由 `["PGgZNbDb","5XWm5YKV"]` 改为 `["4RztWvSW"]`
  - 旧 ImgBB ID `PGgZNbDb`（原 C1）、`5XWm5YKV`（原 C2）作废
  - 阅读页从 `001/0.png` 开始，页号不再右移（第 1 页起仍是原册页）

### 系统性数据问题：部分卷 catalog 末张 C 图与正文尾页共用 ImgBB ID（另案）

- 现象：167 卷的 `catalog` 末张 C 图（多为 `C2`）与正文最后几页共用同一 ImgBB ID（如 001 卷 C2 与第 660 页同为 `5XWm5YKV`、100 卷 C2 与第 706 页等）。
- 原因疑似当年上传目录 C 图时直接复用了卷末页图；因 ImgBB 不可改名，原 ID 无法拆分为两张不同图。
- 本次 001 卷已随 C 图重传而消除（新 C1 为独立 ID），其余 166 卷仍存在，需逐卷重传换新 ID（另案处理）。

（此处记录后续发现的任何数据问题，如某卷缺页、图片 ID 异常等）