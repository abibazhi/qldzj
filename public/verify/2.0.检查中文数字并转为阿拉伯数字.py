import os
import re

def convert_chinese_page_numbers_smart():
    """智能转换中文页码：连续数字直接替换，带单位的记录到日志"""
    
    parent_dir = '..'
    log_file = 'chinese_conversion_smart_log.txt'
    need_check_file = 'need_check_chinese_numbers.txt'
    backup_dir = 'backup_smart_conversion'
    
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    # 单个中文数字映射
    digit_map = {
        '〇': '0', '零': '0',
        '一': '1', '壹': '1',
        '二': '2', '贰': '2', '两': '2',
        '三': '3', '叁': '3',
        '四': '4', '肆': '4',
        '五': '5', '伍': '5',
        '六': '6', '陆': '6',
        '七': '7', '柒': '7',
        '八': '8', '捌': '8',
        '九': '9', '玖': '9',
    }
    
    # 中文单位（需要核对的）
    units = ['十', '拾', '百', '佰', '千', '仟', '万', '萬', '亿', '億']
    
    # 特殊文本（保持不变）
    special_texts = ['封面', '封底', '目录', '序', '前言', '附录']
    
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
    
    print(f"找到 {len(files)} 个文件，开始智能转换中文页码...")
    print("转换规则:")
    print("1. 连续单个数字: '五七八' -> '578'")
    print("2. 包含'十、百、千'等单位的: 记录到日志需要核对")
    print("3. 特殊文本如'封面': 保持不变")
    print()
    
    total_converted = 0
    total_need_check = 0
    modified_files = []
    all_conversions = []
    need_check_items = []
    
    with open(log_file, 'w', encoding='utf-8') as log:
        log.write("中文页码智能转换日志\n\n")
        log.write("转换规则:\n")
        log.write("1. 连续单个数字直接替换连接\n")
        log.write("2. 包含单位的需要人工核对\n")
        log.write("3. 特殊文本保持不变\n\n")
        
        for filename in files:
            filepath = os.path.join(parent_dir, filename)
            file_no = get_file_no(filename)
            
            print(f"处理: {filename} (序号: {file_no})")
            
            # 备份
            import shutil
            shutil.copy2(filepath, os.path.join(backup_dir, filename))
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original = content
            
            # 查找page标签
            page_pattern = r'(<span[^>]*class="[^"]*page[^"]*"[^>]*>)([^<]+)(</span>)'
            
            def process_page_content(text):
                """处理页码内容"""
                text = text.strip()
                
                # 1. 如果是特殊文本，保持不变
                if text in special_texts:
                    return text, 'special'
                
                # 2. 如果已经是阿拉伯数字，保持不变
                if text.isdigit():
                    return text, 'already_digit'
                
                # 3. 检查是否包含单位（需要核对）
                has_unit = any(unit in text for unit in units)
                if has_unit:
                    return text, 'has_unit'
                
                # 4. 检查是否都是单个数字字符
                all_digits = True
                for char in text:
                    if char not in digit_map:
                        all_digits = False
                        break
                
                if all_digits and len(text) > 0:
                    # 转换连续数字：五七八 -> 578
                    result = ''.join(digit_map[char] for char in text)
                    return result, 'converted_digits'
                
                # 5. 其他情况（无法确定）
                return text, 'unknown'
            
            def replace_page_callback(match):
                tag_start, page_content, tag_end = match.groups()
                
                new_content, result_type = process_page_content(page_content)
                
                if result_type == 'converted_digits' and new_content != page_content:
                    return f'{tag_start}{new_content}{tag_end}'
                elif result_type == 'has_unit':
                    # 记录需要核对的项目
                    need_check_items.append({
                        'file': filename,
                        'file_no': file_no,
                        'content': page_content,
                        'line': content.count('\n', 0, match.start()) + 1
                    })
                
                return match.group(0)
            
            new_content = re.sub(page_pattern, replace_page_callback, content, flags=re.IGNORECASE)
            
            if new_content != content:
                # 找出具体的修改
                old_matches = re.findall(page_pattern, content, re.IGNORECASE)
                new_matches = re.findall(page_pattern, new_content, re.IGNORECASE)
                
                changes = []
                for (old_tag, old_page, old_end), (new_tag, new_page, new_end) in zip(old_matches, new_matches):
                    if old_page.strip() != new_page.strip():
                        changes.append((old_page.strip(), new_page.strip()))
                
                # 保存修改
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                modified_files.append((filename, len(changes)))
                total_converted += len(changes)
                
                print(f"  ✅ 转换了 {len(changes)} 处")
                log.write(f"{filename} (序号: {file_no}):\n")
                log.write("-" * 50 + "\n")
                
                for old, new in changes:
                    log.write(f"  {old} -> {new}\n")
                    print(f"    {old} -> {new}")
                
                log.write("\n")
            else:
                print(f"  ℹ️  没有需要转换的连续数字")
            
            # 统计本文件需要核对的项目
            file_need_check = [item for item in need_check_items if item['file'] == filename]
            if file_need_check:
                total_need_check += len(file_need_check)
                print(f"  ⚠️  发现 {len(file_need_check)} 处需要核对（包含单位）")
    
    # 输出汇总结果
    print(f"\n完成!")
    print(f"检查了 {len(files)} 个文件")
    print(f"修改了 {len(modified_files)} 个文件")
    print(f"自动转换了 {total_converted} 处连续数字")
    print(f"发现 {total_need_check} 处需要核对（包含单位）")
    print(f"日志已保存到: {log_file}")
    print(f"备份在: {backup_dir}/")
    
    # 保存需要核对的项目（按文件序号排序）
    if need_check_items:
        need_check_items.sort(key=lambda x: x['file_no'])
        
        with open(need_check_file, 'w', encoding='utf-8') as f:
            f.write("=== 需要核对的中文页码（包含单位） ===\n\n")
            f.write(f"总数: {len(need_check_items)}\n\n")
            f.write("按文件序号排序:\n")
            f.write("=" * 70 + "\n\n")
            
            current_file = None
            for item in need_check_items:
                if item['file'] != current_file:
                    if current_file is not None:
                        f.write("\n")
                    f.write(f"文件: {item['file']} (序号: {item['file_no']})\n")
                    f.write("-" * 60 + "\n")
                    current_file = item['file']
                
                f.write(f"  页码内容: '{item['content']}' (大约在第 {item['line']} 行)\n")
        
        print(f"\n⚠️  需要核对的项目已保存到: {need_check_file}")
        
        # 显示需要核对的统计
        print("\n=== 需要核对的页码类型统计 ===")
        content_types = {}
        for item in need_check_items:
            content = item['content']
            if content not in content_types:
                content_types[content] = 0
            content_types[content] += 1
        
        for content, count in sorted(content_types.items(), key=lambda x: x[1], reverse=True)[:20]:
            print(f"  '{content}': {count}次")

def show_examples():
    """显示转换示例"""
    print("\n=== 转换示例 ===")
    
    test_cases = [
        ("五七八", "578"),
        ("二三四", "234"),
        ("一二三", "123"),
        ("四五六七", "4567"),
        ("八十", "八十（需要核对-包含'十'）"),
        ("一百二十三", "一百二十三（需要核对-包含'百'）"),
        ("封面", "封面（特殊文本-不变）"),
        ("十", "十（需要核对-包含'十'）"),
        ("五", "5"),
        ("二十五", "二十五（需要核对-包含'十'）"),
        ("三百", "三百（需要核对-包含'百'）"),
        ("一千", "一千（需要核对-包含'千'）"),
    ]
    
    print("示例转换结果:")
    for chinese, expected in test_cases:
        print(f"  '{chinese}' -> '{expected}'")

def find_all_page_formats():
    """查找所有页码格式的统计"""
    print("\n=== 页码格式统计 ===")
    
    parent_dir = '..'
    page_formats = {}
    
    files = []
    for f in os.listdir(parent_dir):
        if f.startswith('sutra') and f.endswith('.vols.html'):
            files.append(f)
    
    # 只检查前30个文件作为样本
    for filename in files[:30]:
        filepath = os.path.join(parent_dir, filename)
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 查找所有page内容
        matches = re.findall(r'<span[^>]*class="[^"]*page[^"]*"[^>]*>([^<]+)</span>', 
                           content, re.IGNORECASE)
        
        for text in matches:
            text = text.strip()
            if text not in page_formats:
                page_formats[text] = 0
            page_formats[text] += 1
    
    # 分类统计
    arabic_count = sum(count for text, count in page_formats.items() if text.isdigit())
    chinese_digits_count = sum(count for text, count in page_formats.items() 
                              if not text.isdigit() and all(c in '〇零一二三四五六七八九' for c in text))
    chinese_with_units = sum(count for text, count in page_formats.items() 
                            if any(unit in text for unit in ['十', '百', '千', '万']))
    special_texts = sum(count for text, count in page_formats.items() 
                       if text in ['封面', '封底', '目录'])
    
    print(f"样本文件数: 30")
    print(f"总页码数: {sum(page_formats.values())}")
    print(f"阿拉伯数字: {arabic_count}")
    print(f"纯中文数字(如'五七八'): {chinese_digits_count}")
    print(f"含单位中文(如'八十'): {chinese_with_units}")
    print(f"特殊文本(如'封面'): {special_texts}")
    
    # 显示最常见的页码
    print("\n最常见的页码格式（前20种）:")
    sorted_formats = sorted(page_formats.items(), key=lambda x: x[1], reverse=True)
    for text, count in sorted_formats[:20]:
        print(f"  '{text}': {count}次")

def main():
    print("开始智能转换中文页码...")
    print("=" * 60)
    
    # 先显示示例
    show_examples()
    
    print("\n" + "=" * 60)
    
    # 查找页码格式统计
    find_all_page_formats()
    
    print("\n" + "=" * 60)
    
    # 确认操作
    response = input("\n这将自动转换连续数字，记录带单位的页码，是否继续？(y/n): ")
    if response.lower() != 'y':
        print("操作已取消")
        return
    
    # 执行转换
    convert_chinese_page_numbers_smart()

if __name__ == '__main__':
    main()
