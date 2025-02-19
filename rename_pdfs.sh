#!/bin/bash

# 检查是否提供了PDF文件路径
if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_pdf>"
    exit 1
fi

PDF_FILE="$1"
BASENAME=$(basename -- "$PDF_FILE" .pdf)
OUTPUT_DIR="$BASENAME"

# 检查输出目录是否存在
if [ ! -d "$OUTPUT_DIR" ]; then
    echo "Output directory $OUTPUT_DIR does not exist."
    exit 1
fi

# 获取当前目录中的所有tiff文件并排序
FILES=($(find "$OUTPUT_DIR" -type f -name "*.tiff" | sort))

echo "Renaming TIFF files in directory $OUTPUT_DIR..."

# 遍历文件并重命名
for ((i=0; i<${#FILES[@]}; i++)); do
    OLD_FILE="${FILES[$i]}"
    NEW_IMAGE_INDEX=$(printf "%03d.tiff" $((i + 158)))
    NEW_FILE="$OUTPUT_DIR/$NEW_IMAGE_INDEX"

    # 跳过已存在的新文件名
    if [ ! -f "$NEW_FILE" ]; then
        mv "$OLD_FILE" "$NEW_FILE"
        echo "Renamed $OLD_FILE to $NEW_FILE"
    else
        echo "New file name $NEW_FILE already exists. Skipping renaming of $OLD_FILE."
    fi
done

echo "All TIFF files have been successfully renamed starting from 158.tiff."




