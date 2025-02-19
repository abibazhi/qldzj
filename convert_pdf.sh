#!/bin/bash

# 检查是否提供了PDF文件路径
if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_pdf>"
    exit 1
fi

PDF_FILE="$1"
BASENAME=$(basename -- "$PDF_FILE" .pdf)
OUTPUT_DIR="$BASENAME"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 使用 pdfinfo 获取 PDF 总页数
TOTAL_PAGES=$(pdfinfo "$PDF_FILE" | grep Pages | awk '{print $2}')

echo "Converting $PDF_FILE into $TOTAL_PAGES pages in directory $OUTPUT_DIR..."

# 处理每一页
for ((PAGE=0; PAGE<TOTAL_PAGES; PAGE++)); do
    IMAGE_INDEX=$(printf "%03d" $((PAGE+1)))
    TEMP_FILE="/tmp/temp_page_qldzj.tiff"
    OUTPUT_FILE="$OUTPUT_DIR/$IMAGE_INDEX.tiff"

    # 跳过已存在的文件
    if [ ! -f "$OUTPUT_FILE" ]; then
        convert -density 300 "$PDF_FILE[$PAGE]" "$TEMP_FILE"

        # 将图像转换为黑白并使用CCITT Group 4压缩
        convert "$TEMP_FILE" -threshold 50% -type bilevel -compress group4 "$OUTPUT_FILE"

        if [ $? -ne 0 ]; then
            echo "Error converting page $((PAGE+1)) of $PDF_FILE."
            rm -f "$TEMP_FILE"
            exit 1
        fi

        echo "Converted page $((PAGE+1)) of $PDF_FILE to $OUTPUT_FILE."
        rm -f "$TEMP_FILE"
    else
        echo "Skipping existing file $OUTPUT_FILE."
    fi
done

echo "All pages of $PDF_FILE have been successfully converted and saved in $OUTPUT_DIR."




