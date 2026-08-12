# js/mapping.json 说明

本文件为全站统一图片映射数据（ImgBB 图片 ID），替代原「每卷一个 R2 mapping.js」的多源依赖方案。
2026-08-12 起改为 `pages + catalog` 结构，同时收纳原 `erratum/data/catalog_imgbb.js`（目录 C 图，旧文件已删，存档于 `back/tools/legacy_src/`）。
2026-08-13 起移至 `js/` 目录，与图片加载入口 `imageLoader.js` 同放一处（mapping 只与图片加载相关），全站仅保留此一份。

## 结构

```json
{
  "000": { "pages": ["ImgBB图片ID", ...], "catalog": [] },
  "001": { "pages": ["ImgBB图片ID", ...], "catalog": ["C1图ID", "C2图ID"] },
  ...
  "168": { "pages": ["ImgBB图片ID", ...], "catalog": ["C1图ID", "C2图ID"] }
}
```

- 键：三位卷号 `000`~`168`（全部补零）
- `pages`：该卷正文页数组，长度 = 该卷页数，与 `data/sutra_links.js` 的 `VOLUME_PAGE_COUNTS` 一一对应（生成时已交叉校验）
- `catalog`：该卷目录封面（C 图）ImgBB ID 数组，`catalog[i]` 即 `C{i+1}` 图；无 C 图的卷为空数组（当前 000 为空）

## 图片 URL 拼接规则

| 源 | 规则 | 示例 |
|---|---|---|
| R2 | `https://img.daxumi.top/{卷号}/{页或C图}.png` | `https://img.daxumi.top/001/C1.png` |
| ImgBB 正文 | `https://i.ibb.co/{ID}/{卷号}-{页}-png.png` | `https://i.ibb.co/LdH060By/000-1-png.png` |
| ImgBB 目录 | `https://i.ibb.co/{ID}/{卷号}-C{n}-png.png` | `https://i.ibb.co/PGgZNbDb/001-C1-png.png` |
| GitHub | `https://abibazhi.github.io/{卷号}/{页}.png` | `https://abibazhi.github.io/000/1.png` |

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

```
node back/tools/gen_unified_mapping.mjs
```

## 数据问题记录

（此处记录后续发现的任何数据问题，如某卷缺页、图片 ID 异常等）