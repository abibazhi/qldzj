# data/mapping.json 说明

本文件为全站统一图片映射数据（ImgBB 图片 ID），替代原「每卷一个 R2 mapping.js」的多源依赖方案。

## 结构

```json
{
  "000": ["ImgBB图片ID", ...],   // 校勘卷（62 张）
  "001": ["ImgBB图片ID", ...],   // 第 1 册（660 张）
  ...
  "168": ["ImgBB图片ID", ...]    // 第 168 册（746 张）
}
```

- 键：三位卷号 `000`~`168`
- 值：数组，长度 = 该卷页数，与 `data/sutra_links.js` 的 `VOLUME_PAGE_COUNTS` 一一对应（生成时已交叉校验）

## 图片 URL 拼接规则

| 源 | 规则 | 示例 |
|---|---|---|
| R2 | `https://img.daxumi.top/{卷号}/{页}.png` | `https://img.daxumi.top/000/1.png` |
| ImgBB | `https://i.ibb.co/{ID}/{卷号}-{页}-png.png` | `https://i.ibb.co/LdH060By/000-1-png.png` |
| GitHub | `https://abibazhi.github.io/{卷号}/{页}.png` | `https://abibazhi.github.io/000/1.png` |

## 生成方式

`000`~`168` 全部 169 卷均抓取自 R2 的 `{卷号}/mapping.js`，聚合为单文件。
如需重新生成，参考会话中 `/tmp/opencode/gen_mapping.mjs`（含长度交叉校验）。

## 数据问题记录

（此处记录后续发现的任何数据问题，如某卷缺页、图片 ID 异常等）
