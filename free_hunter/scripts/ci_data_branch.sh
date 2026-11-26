#!/usr/bin/env bash
# GitHub Actions 用: データブランチ（DB とスマホ用一覧）の取得と保存
#   load: freehunter-data ブランチを fh-data/ に展開（無ければ空フォルダ）
#   save: fh-data/ の中身を 1 コミットにまとめて強制 push（履歴を溜めず容量を増やさない）
set -euo pipefail
BRANCH="${FH_DATA_BRANCH:-freehunter-data}"
DIR="${GITHUB_WORKSPACE:-$PWD}/fh-data"
case "${1:-}" in
  load)
    mkdir -p "$DIR"
    if git ls-remote --exit-code --heads origin "$BRANCH" > /dev/null; then
      git fetch --depth=1 origin "$BRANCH"
      git --work-tree="$DIR" checkout FETCH_HEAD -- .
      git reset -q   # 作業ツリー側の index を元に戻す
      echo "データブランチを読み込みました"
    else
      echo "データブランチはまだありません（初回）"
    fi
    ;;
  save)
    cd "$DIR"
    rm -rf .git
    git init -q -b "$BRANCH"
    git config user.name "github-actions[bot]"
    git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
    git add -A
    git commit -q -m "FREE HUNTER data $(date -u +%Y-%m-%dT%H:%MZ)"
    REMOTE="${FH_DATA_REMOTE:-https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git}"
    git push -q -f "$REMOTE" "$BRANCH"
    echo "保存しました: $BRANCH"
    ;;
  *) echo "usage: $0 load|save"; exit 2 ;;
esac
