#!/usr/bin/env python3
import re, sys, shutil, os

def usage():
    print("用法: python patch_href.py 1081")
    sys.exit(1)

def main():
    if len(sys.argv) != 2 or not sys.argv[1].isdigit():
        usage()

    num = sys.argv[1]                       # 1081
    html = "index.html"
    bak  = html + ".bak"

    if not os.path.isfile(html):
        print(f"找不到 {html}")
        sys.exit(1)

    # 读入全文
    with open(html, 'r', encoding='utf-8') as f:
        text = f.read()

    # 正则：匹配整行 <tr> ... </tr>，其中第一个 <td> 是指定序号
    # 分组1=tr前导，分组2=序号，分组3=tr剩余；用前瞻保证</tr>闭合
    pattern = re.compile(
        rf'(<tr>\s*<td>\s*{re.escape(num)}\s*</td>.*?<a\s+href=")([^"]+)("[^>]*>.*?</tr>)',
        re.I | re.S
    )

    def replacer(m):
        # m.group(2) 就是原来的 href
        new_href = f"sutra{num}.vols.html"
        return m.group(1) + new_href + m.group(3)

    new_text, count = pattern.subn(replacer, text)
    if count == 0:
        print(f"未找到序号 {num} 对应的行，无改动")
        sys.exit(0)

    # 备份并写入
    shutil.copy2(html, bak)
    with open(html, 'w', encoding='utf-8') as f:
        f.write(new_text)

    print(f"已改写 {count} 处，备份文件 {bak}")

if __name__ == '__main__':
    main()
