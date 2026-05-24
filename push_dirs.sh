#!/bin/bash

# 你的图片根目录
BASE_DIR="pngs"

# 从 001 循环到 168
for i in {002..168}; do
  DIR="$BASE_DIR/$i"
  
  # 如果目录不存在，跳过
  if [ ! -d "$DIR" ]; then
    echo "→ 目录 $DIR 不存在，跳过"
    continue
  fi

  echo "========================================"
  echo "🚀 开始上传: $DIR"
  echo "========================================"

  # 只添加这个目录
  git add "$DIR"
  
  # 提交
  git commit -m "上传图片目录 $DIR"
  
  # 推送到 GitHub
  git push origin main

  echo "✅ $DIR 上传完成！"
  echo ""
done

echo "🎉 所有 001~168 目录全部上传完毕！"
