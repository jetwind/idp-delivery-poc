#!/usr/bin/env bash
# 回滚 harness 临时改动，恢复 harness 零改动（macOS/Linux，与 harness-setup.sh 配对）。
# 用法：bash harness-reset.sh

set -euo pipefail

HARNESS="$(cd "$(dirname "${BASH_SOURCE[0]}")/../deepseek-harness" && pwd)"

echo "== 1. git restore 修改的文件 =="
git -C "$HARNESS" restore packages/bundle/web-app/package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.host.json tsdown.config.ts

echo "== 2. git clean 删除所有 untracked =="
git -C "$HARNESS" clean -fd

echo "== 3. 删除用户预设根 =="
PRESET_ROOT="${DSH_HOME:-$HOME/.dsh}/.agent-presets"
if [ -d "$PRESET_ROOT" ]; then
  rm -rf "$PRESET_ROOT"
  echo "  已删除 $PRESET_ROOT"
fi

echo ""
echo "== 验证 harness 干净 =="
if [ -z "$(git -C "$HARNESS" status --porcelain)" ]; then
  echo "✓ harness 零改动"
else
  echo "⚠ 仍有改动："
  git -C "$HARNESS" status --short
fi
