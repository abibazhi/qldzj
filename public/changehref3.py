#!/usr/bin/env python3
import re, sys, shutil, os, subprocess

def usage():
    print("用法: python changehref1.py 1090 [src.html]   # src.html 省略时从 stdin 读)")
    sys.exit(1)

def gzip_file(f):
    """f 为磁盘已有文件，同目录生成 f.gz，-k -9 -f"""
    subprocess.run(['gzip', '-k', '-9', '-f', f], check=False)

def main():
    if len(sys.argv) < 2 or not sys.argv[1].isdigit():
        usage()

    num   = sys.argv[1]
    html  = "index.html"
    bak   = html + ".bak"
    tgt   = f"sutra{num}.vols.html"

    # ---- 读新内容 ----
    if len(sys.argv) == 2:                      # stdin
        print("请输入新文件内容，Ctrl-D 结束：")
        new_content = sys.stdin.read()
    else:                                       # 指定文件
        src = sys.argv[2]
        if not os.path.isfile(src):
            print(f"找不到 {src}")
            sys.exit(1)
        with open(src, 'r', encoding='utf-8') as f:
            new_content = f.read()

    # ---- 写目标文件 ----
    with open(tgt, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"已生成 {tgt}")
    gzip_file(tgt)              # ← 第一条 gzip

    # ---- 改 index.html href ----
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
    gzip_file(html)             # ← 第二条 gzip

if __name__ == '__main__':
    main()
