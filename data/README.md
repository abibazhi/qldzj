# data/ 目录结构说明

乾隆大藏经数据统一为**唯一真源 + 派生切片**：

```
data/
├── sutra_table.js       唯一真源（手维护）：经表 + 卷表合并
└── cache/               派生切片（构建生成，浏览器运行时 fetch）
    ├── rolls.json        卷表（阅读页卷名）
    ├── titles.json       经号→经名（阅读页标题）
    ├── sutras.json      经表（目录页 idx.html）
    ├── category_map.json 分类映射（目录页）
    └── page_counts.json  册页数（翻页）
```

## 唯一真源 data/sutra_table.js

**浏览器端不直接加载本文件**，仅构建期使用；浏览器通过 `data/cache/` 切片按需加载。

记录结构（每条为一个数组，数字经号固定位置）：

```
[经号, start, end, title, translator, multiVolume, alias, tradTitle, rolls, gs?]
```

| 索引 | 字段 | 说明 |
|---|---|---|
| 0 | `sutra` | 经号（非数字如 `""` 为特殊记录，如勘误表） |
| 1 | `start` | 起始页码 `"册-页"` |
| 2 | `end` | 结束页码 `"册-页"` |
| 3 | `title` | 经名（含卷数，简体为主） |
| 4 | `translator` | 译者 |
| 5 | `multiVolume` | 1=多卷（有 idx.html），0=单卷 |
| 6 | `alias` | 别名（亦名/一名，无则 `''`） |
| 7 | `tradTitle` | 繁体经名（无则 `''`） |
| 8 | `rolls` | 卷列表 `[{t,i,title?,b?,f?}]` |
| 9 | `gs` | 多表分组标记（仅经1165，可选） |

卷对象字段：`t`=卷名（单卷经=千字文函号）、`i`=起始页序号（6位）、`title`=会界标记、`b`=加黑子串、`f`=强制整行。

> 多卷经 657 部（有 `sutra{N}.idx.html`），单卷经 1013 部（直接跳转阅读页，`rolls` 只有 1 条，`t` 为函号）。

## 派生切片 data/cache/

由 `back/tools/gen_cache.mjs` 从真源生成（构建产物，随 git 提交，部署无需构建）。

| 文件 | 内容 | 消费者 |
|---|---|---|
| `rolls.json` | `[{n, r:[{t,i}]}]` 全量卷表 | `js/sutraInfo.js`（阅读页卷名） |
| `titles.json` | `{ "经号": 繁体经名 }` | `js/sutraInfo.js`（阅读页标题） |
| `sutras.json` | 经表（真源前 8 字段，不含 rolls） | `idx.html`（目录页） |
| `category_map.json` | 分类映射 | `idx.html` |
| `page_counts.json` | 168 册每册页数 | `js/pageNav.js`（翻页跨册） |

## 构建命令

```bash
node back/tools/gen_cache.mjs        # 重新生成 data/cache/ 切片
node back/tools/gen_index.mjs        # 生成首页 index.html
node back/tools/gen_sutra_idx.mjs    # 生成 public/sutra{N}.idx.html（657 个）
```

---

## sutra{N}.idx.html 排版规则（9 条）

由 `back/tools/gen_sutra_idx.mjs` 从真源生成。

1. **字数阈值**：卷题超过 `js/config.js` 的 `ROLL_FULL_ROW_CHAR_LIMIT`（默认 24，UTF-16 码元计）→ 整行 `colspan="2"`；否则左右半列（`left-col` / `right-col`）。
2. **奇数尾**：半列条目不成对时，右列留空（`<!-- 空单元格保持布局平衡 -->`）。
3. **经0（大清三藏聖教目录）**：全部 10 条一律整行，跟随原版图片排版；页码用中文数字（idx 尾 3 位逐位转，如 `002`→`二`、`010`→`一〇`）。
4. **经1165（摄大乘论释）**：唯一同册内多 table 的经，四译分表（连/友/交/枝），由 `gs:[10,10,11,19]` 显式分组（共 50 卷）。
5. **加黑 `<b>`**：卷条目含 `b` 字段时，按 `indexOf` 定位子串包 `<b></b>`。全库仅经1165 有 4 处。
6. **会界标记**：`<a>` 上的 `title="第X会"` 存为卷条目 `title` 字段。全库仅经1 有 15 处。
7. **页码推导**：6 位 idx 取后 3 位、7 位 idx 取后 4 位，均去前导零；经0 特判中文数字。
8. **分册**：默认按 idx 前 3 位（册号）分 table，每册一个 `<h2>第X册</h2>`；经1165 按 `gs` 分组。
9. **特殊卷**（`f:true`）：强制整行，无视字数阈值。目前仅经1165 三条。

### 决策记录（5 个真取舍）

| # | 问题 | 取舍 |
|---|---|---|
| 1 | title 标签写法 | 统一为 `乾隆大藏经 · {经题}` |
| 2 | ≤24 字但原整行的条目（38 条/24 文件） | 一律改半列（经0、经1165 除外） |
| 3 | 经674 的 `<font>`+`<br>`、经1027 的 `<br>` | 取消特殊标签，内容变纯文本 |
| 4 | 经1165 多余括号 | 修正为"卷一（友一）"，同步入真源 |
| 5 | 经1571 空页码 | 补齐为 214 |

### 变更流程

1. 改真源 `data/sutra_table.js`（卷条目/标记）→ 跑 `gen_sutra_idx.mjs --dry` 审查 → 落盘。
2. 调排版阈值或特殊标记（`gs`/`f`）→ 直接改真源。
3. 改经表 → 跑 `gen_cache.mjs` + `gen_index.mjs` + `gen_sutra_idx.mjs`。
4. 提交前核对：`gen_sutra_idx.mjs --dry` 零 diff、`gen_index.mjs --dry` 零 diff。
