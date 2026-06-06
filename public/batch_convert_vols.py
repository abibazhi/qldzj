import re
import os
from pathlib import Path

def process_vols_file(input_path, output_path):
    """
    处理单个 vols.html 文件
    """
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 找到所有 sutra.html 链接
    pattern = r'(<a[^>]*href="sutra\.html\?start=(\d+)&end=(\d+)"[^>]*>)'
    matches = list(re.finditer(pattern, content))
    
    if not matches:
        print(f"  警告：{input_path.name} 中没有找到链接，跳过")
        return False
    
    # 第一个链接是封面
    cover_start = matches[0].group(2)
    cover_end = matches[0].group(3)
    
    # 最后一卷的end
    last_end = matches[-1].group(3)
    
    print(f"  封面起始: {cover_start}, 最后结束: {last_end}, 共 {len(matches)} 个链接")
    
    # 替换所有链接
    new_content = content
    for match in matches:
        original_href = match.group(1)
        original_start = match.group(2)
        
        # 构建新的href（start用封面起始，end用最后结束，添加idx）
        new_href = f'sutra.html?start={cover_start}&end={last_end}&idx={original_start}'
        
        # 替换原链接中的href部分
        new_link = re.sub(
            r'href="sutra\.html\?start=\d+&end=\d+"',
            f'href="{new_href}"',
            original_href
        )
        
        new_content = new_content.replace(original_href, new_link)
    
    # 保存新文件
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True

def batch_process(input_dir, output_dir=None):
    """
    批量处理所有 sutra{N}.vols.html 文件
    
    Args:
        input_dir: 输入文件所在目录
        output_dir: 输出目录（默认为输入目录）
    """
    input_path = Path(input_dir)
    
    if output_dir is None:
        output_dir = input_dir
    output_path = Path(output_dir)
    
    # 确保输出目录存在
    output_path.mkdir(parents=True, exist_ok=True)
    
    # 查找所有 sutra{N}.vols.html 文件
    vols_files = sorted(input_path.glob("sutra*.vols.html"))
    
    if not vols_files:
        print(f"未找到任何 sutra*.vols.html 文件在 {input_dir}")
        return
    
    print(f"找到 {len(vols_files)} 个文件:")
    for f in vols_files:
        print(f"  - {f.name}")
    
    print("\n开始处理...")
    print("-" * 50)
    
    success_count = 0
    for vols_file in vols_files:
        # 生成输出文件名：sutra{N}.vols.html -> sutra{N}.idx.html
        output_file = output_path / vols_file.name.replace('.vols.html', '.idx.html')
        
        print(f"处理: {vols_file.name} -> {output_file.name}")
        
        if process_vols_file(vols_file, output_file):
            success_count += 1
    
    print("-" * 50)
    print(f"\n完成！成功处理 {success_count}/{len(vols_files)} 个文件")
    
    # 列出生成的文件
    idx_files = sorted(output_path.glob("sutra*.idx.html"))
    if idx_files:
        print(f"\n生成的 idx 文件:")
        for f in idx_files:
            print(f"  - {f.name}")

def main():
    # 修改为你的实际目录路径
    input_directory = input("请输入 vols.html 文件所在目录: ").strip()
    
    if not os.path.exists(input_directory):
        print(f"错误：目录 '{input_directory}' 不存在！")
        return
    
    batch_process(input_directory)

if __name__ == "__main__":
    main()
