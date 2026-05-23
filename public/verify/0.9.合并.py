import os

def simple_merge():
    """简化版本的合并"""
    file1 = 'start_end.txt'
    file2 = 'sutra_ranges.txt'
    output_file = 'merged_simple.txt'
    total = 1669
    
    # 读取文件1
    data1 = {}
    if os.path.exists(file1):
        with open(file1, 'r', encoding='utf-8') as f:
            for line in f.readlines()[1:]:
                parts = line.strip().split(',')
                if len(parts) >= 3 and parts[0].isdigit():
                    data1[int(parts[0])] = (parts[1], parts[2])
    
    # 读取文件2
    data2 = {}
    if os.path.exists(file2):
        with open(file2, 'r', encoding='utf-8') as f:
            for line in f.readlines()[1:]:
                parts = line.strip().split(',')
                if len(parts) >= 3 and parts[0].isdigit():
                    data2[int(parts[0])] = (parts[1], parts[2])
    
    print(f"文件1: {len(data1)} 条记录")
    print(f"文件2: {len(data2)} 条记录")
    
    # 合并
    result = []
    missing = []
    
    for i in range(1, total + 1):
        if i in data1:
            result.append((i, data1[i][0], data1[i][1]))
        elif i in data2:
            result.append((i, data2[i][0], data2[i][1]))
        else:
            result.append((i, "未找到", "未找到"))
            missing.append(i)
    
    # 保存结果
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("No,start,end\n")
        for no, start, end in result:
            f.write(f"{no},{start},{end}\n")
    
    print(f"\n合并完成!")
    print(f"生成记录: {len(result)} 条")
    print(f"缺失记录: {len(missing)} 条")
    if missing:
        print(f"缺失的序号: {missing[:20]}{'...' if len(missing) > 20 else ''}")
    
    # 检查剩余记录
    all_nos = set(range(1, total + 1))
    remaining1 = [no for no in data1 if no not in all_nos]
    remaining2 = [no for no in data2 if no not in all_nos]
    
    if remaining1:
        print(f"\n文件1剩余记录 ({len(remaining1)}条): {remaining1[:10]}{'...' if len(remaining1) > 10 else ''}")
    if remaining2:
        print(f"文件2剩余记录 ({len(remaining2)}条): {remaining2[:10]}{'...' if len(remaining2) > 10 else ''}")

if __name__ == '__main__':
    simple_merge()
