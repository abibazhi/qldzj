import os
import re

def simple_td_continuity_check():
    """简化版本：验证所有td的连续性"""
    
    parent_dir = '..'
    log_file = 'td_continuity_simple.txt'
    
    # 获取并排序文件
    files = []
    for f in os.listdir(parent_dir):
        if f.startswith('sutra') and f.endswith('.vols.html'):
            match = re.search(r'sutra(\d+)\.vols\.html', f)
            if match:
                files.append((int(match.group(1)), f))
    
    if not files:
        print("未找到文件")
        return
    
    # 按序号排序
    files.sort(key=lambda x: x[0])
    
    all_errors = []
    
    with open(log_file, 'w', encoding='utf-8') as log:
        log.write("表格td连续性检查（按文件序号排序）\n\n")
        
        for file_no, filename in files:
            filepath = os.path.join(parent_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 提取所有td中的start和end
            td_matches = re.findall(r'start=(\d+)&end=(\d+)', content)
            
            if len(td_matches) < 2:
                continue
            
            file_errors = []
            
            # 检查连续性
            for i in range(len(td_matches) - 1):
                end = td_matches[i][1]
                next_start = td_matches[i + 1][0]
                
                if end.isdigit() and next_start.isdigit():
                    if int(next_start) != int(end) + 1:
                        file_errors.append((i+1, i+2, end, next_start))
            
            if file_errors:
                all_errors.append((file_no, filename, file_errors))
                log.write(f"{filename} (序号: {file_no}):\n")
                log.write("-" * 50 + "\n")
                
                for link_from, link_to, end, next_start in file_errors:
                    log.write(f"  链接{link_from}->链接{link_to}: {end}+1≠{next_start}\n")
                    print(f"{filename}: 链接{link_from}->链接{link_to}: {end}+1≠{next_start}")
                
                log.write("\n")
    
    # 输出汇总
    print(f"\n检查完成!")
    print(f"检查了 {len(files)} 个文件")
    print(f"发现 {len(all_errors)} 个文件有连续性错误")
    print(f"详细错误已保存到: {log_file}")
    
    # 显示错误统计
    if all_errors:
        total_errors = sum(len(errors) for _, _, errors in all_errors)
        print(f"总错误数: {total_errors}")
        
        print("\n按文件序号的错误统计:")
        for file_no, filename, errors in all_errors[:10]:  # 只显示前10个
            print(f"  {filename}: {len(errors)} 个错误")

if __name__ == '__main__':
    simple_td_continuity_check()
