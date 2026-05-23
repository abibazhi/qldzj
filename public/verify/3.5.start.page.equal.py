import os
import re

def auto_fix_start_page_mismatch():
    """自动修复start和page不一致的问题"""
    
    parent_dir = '..'
    log_file = 'auto_fix_start_page_log.txt'
    backup_dir = 'backup_before_page_fix'
    
    # 创建备份目录
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    files = []
    for f in os.listdir(parent_dir):
        if f.startswith('sutra') and f.endswith('.vols.html'):
            files.append(f)
    
    if not files:
        print("未找到文件")
        return
    
    # 按数字排序
    def get_file_no(f):
        m = re.search(r'sutra(\d+)\.vols\.html', f)
        return int(m.group(1)) if m else 0
    
    files.sort(key=get_file_no)
    
    print(f"找到 {len(files)} 个文件，开始自动修复...")
    print("修复规则: 根据page的位数取start的最后几位")
    print()
    
    total_fixes = 0
    modified_files = []
    all_changes = []
    
    for filename in files:
        file_path = os.path.join(parent_dir, filename)
        file_no = get_file_no(filename)
        
        print(f"处理: {filename} (序号: {file_no})")
        
        # 备份文件
        backup_path = os.path.join(backup_dir, filename)
        import shutil
        shutil.copy2(file_path, backup_path)
        
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        original_content = content
        
        # 查找所有需要修复的地方
        # 使用非贪婪匹配，确保只匹配最近的page标签
        pattern = r'(start=(\d+).*?<span[^>]*class="[^"]*page[^"]*"[^>]*>)(\d+)(</span>)'
        
        def replace_callback(match):
            full_prefix = match.group(1)  # start=xxx...<span...>
            start_str = match.group(2)    # start参数的值
            old_page = match.group(3)     # 旧的page值
            suffix = match.group(4)       # </span>
            
            if start_str.isdigit() and old_page.isdigit():
                start_num = int(start_str)
                page_digits = len(old_page)
                
                # 根据page的位数取start的最后几位
                correct_page = start_num % (10 ** page_digits)
                
                if correct_page != int(old_page):
                    # 返回修正后的内容
                    return f'{full_prefix}{correct_page}{suffix}'
            
            # 没有修改，返回原样
            return match.group(0)
        
        # 执行替换
        new_content = re.sub(pattern, replace_callback, content, flags=re.DOTALL)
        
        # 检查实际修改了多少处
        if new_content != content:
            # 统计修改
            old_matches = re.findall(r'start=(\d+).*?<span[^>]*class="[^"]*page[^"]*"[^>]*>(\d+)</span>', 
                                    content, re.DOTALL)
            new_matches = re.findall(r'start=(\d+).*?<span[^>]*class="[^"]*page[^"]*"[^>]*>(\d+)</span>', 
                                    new_content, re.DOTALL)
            
            file_changes = []
            for (old_start, old_page), (new_start, new_page) in zip(old_matches, new_matches):
                if old_page != new_page:
                    file_changes.append((old_start, old_page, new_page))
                    all_changes.append({
                        'file': filename,
                        'file_no': file_no,
                        'start': old_start,
                        'old': old_page,
                        'new': new_page
                    })
            
            # 保存修改
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(new_content)
            
            modified_files.append(filename)
            total_fixes += len(file_changes)
            
            print(f"  ✅ 修复了 {len(file_changes)} 处")
            for start, old, new in file_changes[:3]:  # 显示前3处修改
                print(f"    start={start}: {old} -> {new}")
            if len(file_changes) > 3:
                print(f"    ... 还有 {len(file_changes)-3} 处")
        else:
            print(f"  ℹ️  无需修复")
    
    # 保存日志（按文件序号排序）
    if all_changes:
        # 按文件序号排序
        all_changes.sort(key=lambda x: x['file_no'])
        
        with open(log_file, 'w', encoding='utf-8') as out:
            out.write("=== start和page自动修复日志（按文件序号排序） ===\n\n")
            out.write(f"修复规则: 根据page的位数取start的最后几位\n")
            out.write(f"示例: start=1621013, page=1013 -> 取后4位得1013\n")
            out.write(f"       start=063080, page=080 -> 取后3位得080\n")
            out.write(f"总文件数: {len(files)}\n")
            out.write(f"修改文件数: {len(modified_files)}\n")
            out.write(f"总修复数: {total_fixes}\n\n")
            
            out.write("详细修复记录:\n")
            out.write("=" * 70 + "\n\n")
            
            current_file = None
            for change in all_changes:
                if change['file'] != current_file:
                    if current_file is not None:
                        out.write("\n")
                    out.write(f"文件: {change['file']} (序号: {change['file_no']})\n")
                    out.write("-" * 50 + "\n")
                    current_file = change['file']
                
                out.write(f"  start={change['start']}: {change['old']} -> {change['new']}\n")
        
        print(f"\n✅ 完成! 修复了 {total_fixes} 处不一致")
        print(f"✅ 日志已保存到: {log_file}")
        print(f"✅ 原始文件已备份到: {backup_dir}/")
        
        # 显示摘要
        print("\n=== 修复摘要（按文件序号） ===")
        file_groups = {}
        for change in all_changes:
            if change['file'] not in file_groups:
                file_groups[change['file']] = []
            file_groups[change['file']].append(change)
        
        # 按文件序号排序显示
        sorted_files = sorted(file_groups.keys(), 
                             key=lambda x: int(re.search(r'sutra(\d+)', x).group(1)))
        
        for filename in sorted_files[:20]:  # 只显示前20个文件
            changes = file_groups[filename]
            print(f"{filename}: {len(changes)}处")
            for change in changes[:2]:  # 每文件显示前2处
                print(f"  start={change['start']}: {change['old']}->{change['new']}")
            if len(changes) > 2:
                print(f"  ... 还有{len(changes)-2}处")
        
        if len(sorted_files) > 20:
            print(f"\n... 还有 {len(sorted_files)-20} 个文件")
    else:
        print("\n✅ 所有文件都已正确，无需修复")

def verify_fix_results():
    """验证修复结果"""
    print("\n=== 验证修复结果 ===")
    
    parent_dir = '..'
    errors = []
    
    files = [f for f in os.listdir(parent_dir) 
             if f.startswith('sutra') and f.endswith('.vols.html')]
    
    for filename in files[:10]:  # 只检查前10个文件
        file_path = os.path.join(parent_dir, filename)
        
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        matches = re.findall(r'start=(\d+).*?<span[^>]*class="[^"]*page[^"]*"[^>]*>(\d+)</span>', 
                            content, re.DOTALL)
        
        file_errors = []
        for s, p in matches:
            if s.isdigit() and p.isdigit():
                page_digits = len(p)
                correct_page = int(s) % (10 ** page_digits)
                if correct_page != int(p):
                    file_errors.append(f"start={s}, page={p}, 应={correct_page}")
        
        if file_errors:
            errors.append((filename, file_errors))
            print(f"❌ {filename}: 发现 {len(file_errors)} 个错误")
        else:
            print(f"✅ {filename}: 检查通过")
    
    if errors:
        print(f"\n❌ 发现 {sum(len(e) for _, e in errors)} 个未修复的错误")
    else:
        print("\n✅ 所有检查文件都已正确修复")

def main():
    print("开始自动修复start和page不一致的问题...")
    print("=" * 60)
    
    # 先显示将要进行的操作
    print("修复规则说明:")
    print("1. 如果page是4位数（如1013），取start的最后4位")
    print("2. 如果page是3位数（如080），取start的最后3位")
    print("3. 如果page是2位数，取start的最后2位")
    print("\n示例:")
    print("  start=1621013, page=1013 -> 1013 ✓")
    print("  start=063080, page=080 -> 080 ✓")
    print("  start=016517, page=517 -> 517 ✓")
    
    print("\n" + "=" * 60)
    
    # 确认操作
    response = input("这将自动修改HTML文件，是否继续？(y/n): ")
    if response.lower() != 'y':
        print("操作已取消")
        return
    
    # 执行自动修复
    auto_fix_start_page_mismatch()
    
    # 验证结果
    verify_fix_results()

if __name__ == '__main__':
    main()
