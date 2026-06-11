# 疑惑
## 大般若经初会序的位置
### 已知特例

《大般若波罗蜜多经》初会序位于 `001017`，而经文正文起始于 `001163`，两者不连续。

这是乾隆大藏经原刻本的实际情况，代码已做边界处理（自动回退到有效范围），不影响正常阅读。

保持原样，以尊重历史原貌。

## 第879部经首页指向
```
索引指向十二经同卷的一个单独封面；
卷一指向实际经文的卷一；
经本身没有单独经文首页，十二部经共享一个"十二经同卷的封面"
```
0. 问题是，它的经题指向"十二经同卷"，而卷一指向经文实际第一卷。两者隔了一页。
0. 实际上，二经同卷，三经同卷，四经同卷时，封面上都有经题，而且这个经题属于第一部经的吧
0. 所以，五经同卷，更多经同卷时，经文题目写不下了，写到后序页中，那么这个封面也属于第一部经比较合适


# qldzj
乾隆大藏经图片

2026.5.26
迁移到gitcode

# 校验
## 样例
```html
<!DOCTYPE html>
<html lang="zh">
 <head>
  <meta charset="utf-8"/>
  <title>
   乾隆大藏经 · 解脱戒本经
  </title>
  <link href="sutra.vols.css" rel="stylesheet">
 </head>
 <body>
  <h1><a href="sutra.html?start=067893&end=067893" title="封面">解脱戒本经</a>
  </h1>
  <div class="container">

<h2>第67册</h2>
<table>
    <tr>
        <td class="left-col">
            <div class="entry">
                <span class="title">
                    <a href="sutra.html?start=067894&end=067894" class="scroll-link">译经缘起序（初七）魏沙门僧昉述</a>
                </span>
                <span class="dots"></span>
                <span class="page">426</span>
            </div>
        </td>
        <td class="right-col">
            <div class="entry">
                <span class="title">
                    <a href="sutra.html?start=067895&end=067916" class="scroll-link">卷一（初七）</a>
                </span>
                <span class="dots"></span>
                <span class="page"></span>
            </div>
        </td>
    </tr>
</table>
```
## 规则
0. <title>中的经文名和<h1>中经文名必须一样
0. <title>中的经文名，应该不带卷数
0. <h1>中的册数(前三位数字)和<h2>中的册数必须一样。
0. 所有start和end必须首尾相续，同一个<a>中，start和end可以相同。
0. 每个page页的数字，必须和它所在的<tr>的<a>的中的start的后面三位相同。如果start长度是7，则是后面四位
0. 

## 新规则
0. 就是每卷的索引，都可以导航本经的最后一页。这样可能翻页的时候更加自然。

# 以经为单位前翻后翻
## 基础数据
0. 经的第一页往前翻才会提示“第一页”，经的最后一页往后翻才会提示“最后一页”
0. 每册的最大页码需要记下来。
```
每个子目录的所有pngs总数，记下来；
和最大的pngs的数字相比，存在否；
这个数字+1的图片，存在否。
就是不多也不少
```

## 第一部经的卷的索引就是600条，会不会太多。600x3=1800，2k不到，应该可以的。

