#!/bin/bash

# 定义源目录列表和目标目录
SOURCE_DIRS=("001a" "001b" "001c" "001d" "001e")
TARGET_DIR="./merged_images"

# 创建目标目录（如果不存在）
mkdir -p "$TARGET_DIR"

# 初始化计数器
INDEX=0

# 遍历每个源目录
for dir in "${SOURCE_DIRS[@]}"; do
    # 检查目录是否存在
    if [ ! -d "$dir" ]; then
        echo "Warning: Directory $dir does not exist, skipping."
        continue
    fi

    # 获取该目录下的所有JPEG文件并排序
    FILES=($(find "$dir" -type f \( -iname "*.jpg" -o -iname "*.jpeg" \) | sort))

    # 如果没有找到任何文件，打印警告信息
    if [ ${#FILES[@]} -eq 0 ]; then
        echo "Warning: No JPEG files found in directory $dir."
        continue
    fi

    # 打印找到的文件列表以供调试
    echo "Files in $dir:"
    for file in "${FILES[@]}"; do
        echo "$file"
    done

    # 处理每个文件
    for file in "${FILES[@]}"; do
        # 计算新的文件名
        NEW_INDEX=$(printf "%03d" $((INDEX + 1)))
        EXTENSION="${file##*.}"
        NEW_NAME="$TARGET_DIR/${NEW_INDEX}.${EXTENSION}"

        # 复制文件并重命名
        cp "$file" "$NEW_NAME"
        INDEX=$((INDEX + 1))
        echo "Copied and renamed $file to $NEW_NAME"
    done
done

echo "All images have been merged into $TARGET_DIR with continuous naming."
