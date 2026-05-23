#!/usr/bin/env python3
import re, sys, shutil, os
import pyperclip   # 剪贴板读写

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

    # ---- 1. 读剪贴板，准备写入同名 html 文件 ----
    clip_content = pyperclip.paste()
    target_file = f"sutra{num}.vols.html"
    with open(target_file, 'w', encoding='utf-8') as f:
        f.write(clip_content)
    print(f"已把剪贴板内容写入 {target_file}")

    # ---- 2. 修改 index.html 中的 href ----
    with open(html, 'r', encoding='utf-8') as f:
        text = f.read()

    pattern = re.compile(
        rf'(<tr>\s*<td>\s*{re.escape(num)}\s*</td>.*?<a\s+href=")([^"]+)("[^>]*>.*?</tr>)',
        re.I | re.S
    )

    def replacer(m):
        new_href = target_file          # sutra1081.vols.html
        return m.group(1) + new_href + m.group(3)

    new_text, count = pattern.subn(replacer, text)
    if count == 0:
        print(f"未找到序号 {num} 对应的行，index.html 无改动")
        return

    shutil.copy2(html, bak)
    with open(html, 'w', encoding='utf-8') as f:
        f.write(new_text)

    print(f"已改写 index.html 中 {count} 处 href，备份 -> {bak}")

if __name__ == '__main__':
    main()
