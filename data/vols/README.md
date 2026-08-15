# data/vols/sutraInfo.json 数据结构说明

全站经卷信息统一 JSON（657 经 / 7474 卷条目 / 约 359KB），
由 `back/tools/extract_sutra_info.mjs` 从 `public/sutra{N}.idx.html` 抽取生成。

## 顶层结构

```json
[
  {
    "n": 70,
    "t": "阿差末菩萨经",
    "s": "023051",
    "e": "023138",
    "r": [
      { "t": "卷一（伐四）", "i": "023052" }
    ]
  }
]
```

- 顶层为**数组**，按经号升序排列。
- 每条对应一部经（sutra）。

## 字段含义（单字母缩写）

| 键 | 含义 | 说明 |
|---|---|---|
| `n` | 经号 (number) | 与 `sutra{N}.idx.html` 对应，如 70 |
| `t` | 经题 (title) | 卷名时指该卷名称 |
| `s` | 起始页 (start) | 封面页，6 位字符串 |
| `e` | 结束页 (end) | 6 位字符串 |
| `r` | 卷列表 (rolls) | 本经所有卷的数组 |
| `i` | 起始页序号 (idx) | 该卷正文第一页，6 位字符串 |

### 关于"6 位字符串"
页码/序号格式：前 3 位 = 册号，后 3 位 = 页号。
例：`023051` = 第 23 册第 51 页；`s="023051"` 即本经封面在 23 册 51 页起。

### 关于卷名中的千字文序号
卷名 `卷一（伐四）` 括号内为乾隆大藏经的千字文函号（本相分离的"天-地-玄-黄..."千字文字序），
用于标识该卷在经帙中的排列位置，非页码。

## 使用约定

- 消费者：`js/sutraInfo.js` 的 `fetchSutraInfoFromVolsJson()`，共享缓存 Promise 只 fetch 一次，按 `parseInt(sutraNum)` 查 `n`。
- 单卷经（无 `idx` URL 参数）不走本文件，走 `data/oneVolSutra.json`。
- 657 个 `public/sutra*.idx.html` 原文件**保留**，作为核对数据源；`parseIdxHtml()` 保留不调用。
- 重新生成 / 核对：
  ```bash
  node back/tools/extract_sutra_info.mjs            # 生成 JSON
  node back/tools/extract_sutra_info.mjs --verify   # 生成并逐卷核对条目数
  ```