#!/usr/bin/env python3
"""
批量上传 pngs/ 下所有子目录的图片到 ImgBB，使用 url 高清链接
自动遍历 001, 002, ..., 168, erratum
"""

import os
import re
import time
import requests
from pathlib import Path

# ========== 配置区域 ==========
API_KEYS = [
    "9c0108d21e790e132ad1747798605f52",
    "3c39dd4d68b0129115c64c7aa2bfd3b6"
    "4b94cb80badf578490a7a5c94ed10b9b",
    "4bfdca7082db88c2a8b7f2e8e74aa15c",
    "cfcf390712e9f290013f5ea76cfccfd4"
    # 如果你有更多 Key，可以继续添加
]

SOURCE_ROOT = "./pngs"          # 图片根目录
OUTPUT_FILE = "./imgbb_links.txt"  # 统一映射表
API_URL = "https://api.imgbb.com/1/upload"

# 目录排序规则：数字目录按数值排，特殊目录（如 erratum）放最后
def dir_sort_key(name):
    if name.isdigit():
        return (0, int(name))
    else:
        return (1, name)

def natural_sort_key(filename):
    """自然排序：数字部分按数值比较，字母部分按字母比较"""
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', filename)]

def upload_image(image_path, custom_name, api_key):
    try:
        with open(image_path, 'rb') as f:
            image_data = f.read()
        files = {'image': (custom_name, image_data, 'image/png')}
        data = {'name': custom_name}
        params = {'key': api_key}
        response = requests.post(API_URL, params=params, files=files, data=data, timeout=60)
        result = response.json()
        if result.get('success'):
            return True, result['data']['url']
        else:
            error_msg = result.get('error', {}).get('message', '未知错误')
            return False, f"API错误: {error_msg}"
    except Exception as e:
        return False, f"异常: {str(e)}"

def main():
    print("=" * 60)
    print("批量上传 pngs/ 下所有图片到 ImgBB (使用 url 高清链接)")
    print("=" * 60)
    
    # 获取所有子目录并排序
    subdirs = [d for d in Path(SOURCE_ROOT).iterdir() if d.is_dir()]
    subdirs.sort(key=lambda x: dir_sort_key(x.name))
    
    total_dirs = len(subdirs)
    print(f"📁 找到 {total_dirs} 个子目录")
    
    # 统计总图片数（可选，用于进度显示）
    total_images = 0
    for subdir in subdirs:
        total_images += len(list(subdir.glob("*.png")))
    print(f"🖼️ 共发现 {total_images} 张图片")
    print("-" * 60)
    
    # 全局统计
    total_success = 0
    total_fail = 0
    key_index = 0
    
    # 记录已上传的路径（断点续传）
    uploaded_paths = set()
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, 'r') as f:
            for line in f:
                if '|' in line:
                    uploaded_paths.add(line.split('|')[0])
        print(f"📋 发现已有 {len(uploaded_paths)} 条上传记录，将跳过已上传的图片")
    
    for dir_idx, subdir in enumerate(subdirs, 1):
        print(f"\n📁 正在处理目录 [{dir_idx}/{total_dirs}]: {subdir.name}")
        
        # 获取当前目录下所有 png 文件并自然排序
        image_paths = sorted(subdir.glob("*.png"), key=lambda x: natural_sort_key(x.stem))
        print(f"   该目录共 {len(image_paths)} 张图片")
        
        dir_success = 0
        dir_fail = 0
        
        for img_path in image_paths:
            # 断点续传：跳过已上传的
            if str(img_path) in uploaded_paths:
                print(f"   ⏭️ 跳过已上传: {img_path.name}")
                dir_success += 1
                total_success += 1
                continue
            
            custom_name = f"{subdir.name}_{img_path.stem}.png"
            print(f"   ☁️ 上传: {img_path.name} -> {custom_name}")
            
            api_key = API_KEYS[key_index % len(API_KEYS)]
            ok, result = upload_image(str(img_path), custom_name, api_key)
            
            if ok:
                with open(OUTPUT_FILE, 'a') as f:
                    f.write(f"{img_path}|{result}\n")
                print(f"      ✅ {result}")
                dir_success += 1
                total_success += 1
                uploaded_paths.add(str(img_path))
            else:
                print(f"      ❌ {result}")
                dir_fail += 1
                total_fail += 1
            
            key_index += 1
            time.sleep(1)  # 避免请求过快
        
        print(f"   📊 目录 {subdir.name} 完成: 成功 {dir_success}, 失败 {dir_fail}")
        print("-" * 40)
    
    # 最终统计
    print("=" * 60)
    print("🎉 全部上传完成！")
    print(f"✅ 总成功: {total_success}")
    print(f"❌ 总失败: {total_fail}")
    print(f"📋 映射表已保存到: {OUTPUT_FILE}")
    print("=" * 60)

if __name__ == "__main__":
    main()
