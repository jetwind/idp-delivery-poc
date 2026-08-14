# 回滚 harness 临时改动，恢复 harness 零改动（与 harness-setup.ps1 配对）。
# 用法：powershell -ExecutionPolicy Bypass -File harness-reset.ps1

$ErrorActionPreference = 'Stop'
$harness = (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..\deepseek-harness')).Path

Write-Host "== 1. git restore 修改的文件 ==" -ForegroundColor Cyan
git -C $harness restore packages/bundle/web-app/package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.host.json tsdown.config.ts

Write-Host "== 2. git clean 删除所有 untracked ==" -ForegroundColor Cyan
git -C $harness clean -fd | Select-Object -Last 3

Write-Host "== 3. 删除用户预设根 ==" -ForegroundColor Cyan
$presetRoot = if ($env:DSH_HOME) { Join-Path $env:DSH_HOME '.agent-presets' } else { Join-Path $env:USERPROFILE '.dsh\.agent-presets' }
if (Test-Path $presetRoot) { Remove-Item $presetRoot -Recurse -Force; Write-Host "  已删除 $presetRoot" }

Write-Host "`n== 验证 harness 干净 ==" -ForegroundColor Cyan
$s = git -C $harness status --short
if ($s) { Write-Host "⚠ 仍有改动：" ; $s } else { Write-Host "✓ harness 零改动" -ForegroundColor Green }
