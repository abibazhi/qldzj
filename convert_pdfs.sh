#!/bin/bash

# 定义源目录和进度文件
SOURCE_DIR="./pdfs"  # 存放PDF文件的目录
PROGRESS_FILE="./conversion_progress.txt"
LOG_FILE="./conversion_log.txt"

# 创建或读取进度文件
if [ ! -f "$PROGRESS_FILE" ]; then
    echo "0:000" > $PROGRESS_FILE  # 格式：文件索引:图片索引
fi

# 读取进度信息，并移除可能存在的前导零
IFS=':' read -r CURRENT_INDEX LAST_IMAGE_INDEX < $PROGRESS_FILE
CURRENT_INDEX=$((10#$CURRENT_INDEX))  # 强制解释为十进制
LAST_IMAGE_INDEX=$((10#$LAST_IMAGE_INDEX))  # 强制解释为十进制

echo "CURRENT_INDEX=$CURRENT_INDEX"
echo "LAST_IMAGE_INDEX=$LAST_IMAGE_INDEX"

# 获取PDF文件列表并排序
FILES=($(find "$SOURCE_DIR" -type f -name "*.pdf" | sort))

# 特殊彩色文件列表
COLOR_FILES=("001a.pdf" "001b.pdf" "001c.pdf" "001d.pdf" "001e.pdf")

# 检查是否为彩色文件
is_color_file() {
    local file_name=$(basename -- "$1")
    for color_file in "${COLOR_FILES[@]}"; do
        if [[ "$file_name" == "$color_file" ]]; then
            return 0
        fi
    done
    return 1
}

# 检查页面是否为彩色
is_color_page() {
    local page_image="$1"
    convert "$page_image" -format "%[fx:int(mean*100)]" info: | grep -q '0'
    if [ $? -eq 0 ]; then
        return 1  # 黑白
    else
        return 0  # 彩色
    fi
}

# 遍历PDF文件
for ((i=CURRENT_INDEX; i<${#FILES[@]}; i++)); do
    PDF_FILE="${FILES[$i]}"
    BASENAME=$(basename -- "$PDF_FILE" .pdf)
    OUTPUT_DIR="$BASENAME"

    # 创建输出目录
    mkdir -p "$OUTPUT_DIR"

    # 使用 pdfinfo 获取 PDF 总页数
    TOTAL_PAGES=$(pdfinfo "$PDF_FILE" | grep Pages | awk '{print $2}')

    echo "i=$i"

    # 如果是从头开始处理当前PDF文件，则重置图片索引
    if [ "$i" -eq "$CURRENT_INDEX" ]; then
        START_PAGE=$((LAST_IMAGE_INDEX + 1))
        echo "START_PAGE=$START_PAGE"
    else
        START_PAGE=1
        echo "START_PAGE=$START_PAGE"
    fi

    # 处理每一页
    for ((PAGE=START_PAGE-1; PAGE<TOTAL_PAGES; PAGE++)); do
        IMAGE_INDEX=$(printf "%03d" $((PAGE+1)))
        TEMP_FILE="/tmp/temp_page_qldzj.tiff"

        # 检查文件是否存在以跳过已转换的页面
        if [ ! -f "$OUTPUT_DIR/$IMAGE_INDEX.tiff" ] && [ ! -f "$OUTPUT_DIR/$IMAGE_INDEX.jpg" ]; then
            convert -density 300 "$PDF_FILE[$PAGE]" "$TEMP_FILE"

            # 判断是否为彩色页面
            if is_color_file "$PDF_FILE" || (is_color_page "$TEMP_FILE" && [ "$BASENAME" == "001e" ] && [ $((PAGE+1)) -le 7 ]); then
                # 彩色页面使用JPEG格式
                OUTPUT_FILE="$OUTPUT_DIR/$IMAGE_INDEX.jpg"
                convert "$TEMP_FILE" -quality 92 "$OUTPUT_FILE"  # 使用92的质量因子
            else
                # 黑白页面使用CCITT Group 4压缩并保存为TIFF格式
                OUTPUT_FILE="$OUTPUT_DIR/$IMAGE_INDEX.tiff"
                convert "$TEMP_FILE" -threshold 50% -type bilevel -compress group4 "$OUTPUT_FILE"
            fi

            if [ $? -ne 0 ]; then
                echo "Error converting page $((PAGE+1)) of $PDF_FILE." >> $LOG_FILE
                rm -f "$TEMP_FILE"
                exit 1
            fi

            echo "Converted page $((PAGE+1)) of $PDF_FILE to $OUTPUT_FILE."
            rm -f "$TEMP_FILE"
        else
            echo "Skipping existing file $OUTPUT_DIR/$IMAGE_INDEX.tiff or $OUTPUT_DIR/$IMAGE_INDEX.jpg."
        fi

        # 更新进度
        echo "$i:$IMAGE_INDEX" > $PROGRESS_FILE
    done

    # 重置最后一个图片索引
    LAST_IMAGE_INDEX=0
done

echo "All PDF files have been successfully converted."
