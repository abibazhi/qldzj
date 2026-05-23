import os
data = []
with open('merged_simple.txt', 'r') as f:
    next(f)
    for line in f:
        if line.strip():
            parts = line.strip().split(',')
            if len(parts) >= 3:
                data.append(parts)
errors = []
for i in range(len(data)-1):
    no1, end = data[i][0], data[i][2]
    no2, start2 = data[i+1][0], data[i+1][1]
    if not (end.isdigit() and start2.isdigit()):
        errors.append(f'行{no1}->行{no2}: 非数字 {end}->{start2}')
        continue
    e, s = int(end), int(start2)
    if s == e + 1: continue
    e_str, s_str = str(e).zfill(6), str(s).zfill(6)
    if len(e_str)>=3 and len(s_str)>=3:
        if int(s_str[:3]) == int(e_str[:3]) + 1 and s_str[-3:] == '001': continue
    errors.append(f'行{no1}->行{no2}: {end}->{start2} 不连续')



with open('errors.txt', 'w', encoding='utf-8') as f:
    if errors:
        f.write(f'找到{len(errors)}个错误:\n\n')
        for err in errors: 
            f.write(err + '\n')
        print(f'发现{len(errors)}个错误，已保存到errors.txt')
    else:
        f.write('✅ 所有数据连续\n')
        print('✅ 所有数据连续')


'''
with open('errors.txt', 'w') as f:
    if errors:
        f.write(f'找到{len(errors)}个错误:\\n\\n')
        for err in errors: f.write(err + '\\n')
        print(f'发现{len(errors)}个错误，已保存到errors.txt')
    else:
        f.write('✅ 所有数据连续\\n')
        print('✅ 所有数据连续')
'''
