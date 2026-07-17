#!/usr/bin/env bash
# ============================================================
# deploy.sh — 一鍵完成講義首頁生成與發布指引
# 執行方式:
#  bash deploy.sh jlwustudio scuds-vide-coding-summer-2026
# ============================================================
set -e

GITHUB_USERNAME="${1}"
REPO_NAME="${2}"

# 1. 嘗試自現有 Git 遠端網址自動偵測 GitHub 帳號與專案名稱
if [ -z "$GITHUB_USERNAME" ] || [ -z "$REPO_NAME" ]; then
    if git remote get-url origin >/dev/null 2>&1; then
        REMOTE_URL=$(git remote get-url origin)
        # 支援 SSH (git@github.com:user/repo.git) 與 HTTPS (https://github.com/user/repo.git) 格式
        if [[ "$REMOTE_URL" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)? ]]; then
            GITHUB_USERNAME="${BASH_REMATCH[1]}"
            REPO_NAME="${BASH_REMATCH[2]}"
            echo "偵測到 Git 遠端設定："
            echo "  - 帳號: $GITHUB_USERNAME"
            echo "  - 專案: $REPO_NAME"
            echo ""
        fi
    fi
fi

# 2. 若自動偵測失敗且未提供參數，則預設使用 scuds-vide-coding-summer-2026 和 jlwustudio
if [ -z "$GITHUB_USERNAME" ] || [ -z "$REPO_NAME" ]; then
    GITHUB_USERNAME="jlwustudio"
    REPO_NAME="scuds-vide-coding-summer-2026"
    echo "使用預設設定："
    echo "  - 帳號: $GITHUB_USERNAME"
    echo "  - 專案: $REPO_NAME"
    echo ""
fi

# 3. 如果沒有設定 remote origin，自動設定為 https://github.com/username/repo.git
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "未偵測到 Git 遠端 (origin)，自動設定遠端網址："
    echo "  https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
    git remote add origin "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
    echo ""
fi

# 4. 檢查/執行 Git 發布
echo "正在檢查 Git 儲存庫狀態..."
# 確保我們在 main 分支
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "注意: 目前分支為 $CURRENT_BRANCH，非預設 main 分支。"
fi

# 檢查是否有未提交的變更
if [ -n "$(git status --porcelain)" ]; then
    echo "偵測到未提交的變更，自動新增並進行 commit..."
    git add .
    git commit -m "init"
    echo "已提交變更。"
else
    echo "無待提交的變更。"
fi

echo "正在推送變更至 GitHub 遠端儲存庫..."
git push origin "$CURRENT_BRANCH"
echo "推送成功！"
echo ""

# 5. 輸出 GitHub Pages 發布指引與網址
PAGES_URL="https://${GITHUB_USERNAME}.github.io/${REPO_NAME}/"
echo "============================================================"
echo "🚀 部署指引與完成狀態："
echo "============================================================"
echo "您的專案已成功推送至 GitHub！"
echo "GitHub Pages 預計部署網址："
echo "  $PAGES_URL"
echo ""
echo "📢 若您的 GitHub Pages 尚未啟用，請完成以下手動設定："
echo "  1. 開啟瀏覽器並前往您的 GitHub 專案頁面："
echo "     https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/settings/pages"
echo "  2. 在 'Build and deployment' -> 'Source' 欄位："
echo "     - 選擇 'Deploy from a branch' 並指定 'main' 分支"
echo "  3. 設定完成後，稍等 1-2 分鐘即可點擊上方網址瀏覽您的工作坊網站！"
echo "============================================================"
