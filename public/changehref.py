#!/usr/bin/env python3
import re, sys, shutil, os

def usage():
    print("用法 1: python changehref1.py 1090              # 从 stdin 读新内容")
    print("用法 2: python changehref1.py 1090 new.html    # 把 new.html 作为内容")
    sys.exit(1)

def main():
    if len(sys.argv) < 2 or not sys.argv[1].isdigit():
        usage()

    num   = sys.argv[1]
    html  = "index.html"
    bak   = html + ".bak"
    tgt   = f"sutra{num}.vols.html"

    # ---- 读“新内容” ----
    if len(sys.argv) == 2:                     # 从 stdin 读
        print("请输入文件内容，Ctrl-D 结束：")
        new_content = sys.stdin.read()
    else:                                      # 从指定文件读
        src_file = sys.argv[2]
        if not os.path.isfile(src_file):
            print(f"找不到源文件 {src_file}")
            sys.exit(1)
        with open(src_file, 'r', encoding='utf-8') as f:
            new_content = f.read()

    # ---- 写入目标文件 ----
    with open(tgt, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"已生成 {tgt}")

    # ---- 修改 index.html 中的 href ----
    with open(html, 'r', encoding='utf-8') as f:
        text = f.read()

    pattern = re.compile(
        rf'(<tr>\s*<td>\s*{re.escape(num)}\s*</td>.*?<a\s+href=")([^"]+)("[^>]*>.*?</tr>)',
        re.I | re.S
    )
    new_text, count = pattern.subn(lambda m: m.group(1) + tgt + m.group(3), text)

    if count == 0:
        print(f"未找到序号 {num} 的行，index.html 未改动")
        return

    shutil.copy2(html, bak)
    with open(html, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print(f"已改写 index.html 中 {count} 处，备份 -> {bak}")

if __name__ == '__main__':
    main()
