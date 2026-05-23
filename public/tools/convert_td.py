import re

# 读取文件
input_file = 'sutra2.vols.html'      # 修改为你的文件名
output_file = 'sutra2.vols.updated.html'

# 正则：匹配整个 td 内容，提取 href, title, page
pattern = re.compile(
    r'<td\s+class="left-col">\s*'
    r'<a\s+href="([^"]+)"[^>]*>\s*'
    r'<span\s+class="entry">\s*'
    r'<span\s+class="title">\s*([^<]+?)\s*</span>\s*'
    r'<span\s+class="dots">\s*</span>\s*'
    r'<span\s+class="page">\s*([^<]+?)\s*</span>\s*'
    r'</span>\s*'
    r'</a>\s*'
    r'</td>',
    re.DOTALL | re.IGNORECASE
)

def replace_td(match):
    href = match.group(1).strip()
    title = match.group(2).strip()
    page = match.group(3).strip()
    return f'''<td class="left-col">
  <div class="entry">
    <span class="title">
      <a href="{href}" class="scroll-link">{title}</a>
    </span>
    <span class="dots"></span>
    <span class="page">{page}</span>
  </div>
</td>'''

# 处理 right-col 同样结构（如果存在）
pattern_right = re.compile(
    r'<td\s+class="right-col">\s*'
    r'<a\s+href="([^"]+)"[^>]*>\s*'
    r'<span\s+class="entry">\s*'
    r'<span\s+class="title">\s*([^<]+?)\s*</span>\s*'
    r'<span\s+class="dots">\s*</span>\s*'
    r'<span\s+class="page">\s*([^<]+?)\s*</span>\s*'
    r'</span>\s*'
    r'</a>\s*'
    r'</td>',
    re.DOTALL | re.IGNORECASE
)

def replace_td_right(match):
    href = match.group(1).strip()
    title = match.group(2).strip()
    page = match.group(3).strip()
    return f'''<td class="right-col">
  <div class="entry">
    <span class="title">
      <a href="{href}" class="scroll-link">{title}</a>
    </span>
    <span class="dots"></span>
    <span class="page">{page}</span>
  </div>
</td>'''

# 读取原始内容
with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 执行替换（左列和右列）
content = pattern.sub(replace_td, content)
content = pattern_right.sub(replace_td_right, content)

# 写入新文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ 转换完成！已保存为: {output_file}")
