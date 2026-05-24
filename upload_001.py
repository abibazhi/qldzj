#!/usr/bin/env python3
"""上传 pngs/001/ 目录下的所有图片到 ImgBB，使用 url 字段"""

import os
import re
import time
import requests
from pathlib import Path

# ========== 配置区域 ==========
API_KEYS = [
    "4d36328a7f711a8656840d46a565b131"
]
SOURCE_DIR = "./pngs/001"  # 直接指定要上传的目录
OUTPUT_FILE = "./imgbb_links_001.txt"  # 001 目录专用的映射表
API_URL = "https://api.imgbb.com/1/upload"
# =============================

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
            return True, result['data']['url']  # 关键：使用 url
        else:
            error_msg = result.get('error', {}).get('message', '未知错误')
            return False, f"API错误: {error_msg}"
    except Exception as e:
        return False, f"异常: {str(e)}"

def main():
    print("=" * 60)
    print("上传 pngs/001/ 目录到 ImgBB (使用 url 高清链接)")
    print("=" * 60)
    
    # 获取目录下所有 png 文件，使用自然排序
    image_paths = sorted(
        Path(SOURCE_DIR).glob("*.png"),
        key=lambda x: natural_sort_key(x.stem)
    )
    total = len(image_paths)
    print(f"📁 找到 {total} 张图片")
    
    # 打印前5个文件名确认排序
    print("排序示例：")
    for p in image_paths[:5]:
        print(f"  {p.name}")
    
    success_count = 0
    fail_count = 0
    key_index = 0
    
    for idx, img_path in enumerate(image_paths, 1):
        custom_name = f"001_{img_path.stem}.png"
        print(f"[{idx}/{total}] 上传: {img_path.name} -> {custom_name}")
        
        api_key = API_KEYS[key_index % len(API_KEYS)]
        ok, result = upload_image(str(img_path), custom_name, api_key)
        
        if ok:
            with open(OUTPUT_FILE, 'a') as f:
                f.write(f"{img_path}|{result}\n")
            print(f"  ✅ {result}")
            success_count += 1
        else:
            print(f"  ❌ {result}")
            fail_count += 1
        
        key_index += 1
        time.sleep(1)  # 防限流
    
    print("=" * 60)
    print(f"✅ 成功: {success_count}, ❌ 失败: {fail_count}")
    print(f"📋 映射表: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
