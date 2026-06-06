import re
from pathlib import Path

def modify_vols_html_simple(input_file, output_file=None):
    """
    使用正则表达式修改HTML文件（不需要BeautifulSoup）
    """
    
    if output_file is None:
        output_file = input_file.replace('.vols.html', '.idx.html')
    
    # 读取HTML文件
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 找到所有sutra.html链接
    pattern = r'(<a[^>]*href="sutra\.html\?start=(\d+)&end=(\d+)"[^>]*>)'
    matches = list(re.finditer(pattern, content))
    
    if not matches:
        print("未找到任何包含sutra.html的链接")
        return
    
    # 第一个链接是封面
    cover_start = matches[0].group(2)
    cover_end = matches[0].group(3)
    
    # 最后一卷的end
    last_end = matches[-1].group(3)
    
    print(f"封面起始页: {cover_start}")
    print(f"最后一卷结束页: {last_end}")
    print(f"找到 {len(matches)} 个卷链接")
    
    # 替换所有链接
    new_content = content
    for match in matches:
        original_href = match.group(1)
        original_start = match.group(2)
        
        # 构建新的href
        new_href = f'sutra.html?start={cover_start}&end={last_end}&idx={original_start}'
        
        # 替换原链接中的href部分
        new_link = re.sub(
            r'href="sutra\.html\?start=\d+&end=\d+"',
            f'href="{new_href}"',
            original_href
        )
        
        new_content = new_content.replace(original_href, new_link)
        print(f"  卷: 原start={original_start} -> idx={original_start}")
    
    # 保存修改后的HTML
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"\n✅ 修改完成！")
    print(f"   原文件: {input_file}")
    print(f"   新文件: {output_file}")

def main():
    input_file = "sutra1.vols.html"  # 修改为你的文件路径
    
    if not Path(input_file).exists():
        print(f"错误：文件 '{input_file}' 不存在！")
        return
    
    modify_vols_html_simple(input_file)

if __name__ == "__main__":
    main()
