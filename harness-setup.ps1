# 一键准备 harness 联调环境（临时改动，学习用，之后可用 harness-reset.ps1 回滚）。
# 用法：在交付文件夹根目录执行  powershell -ExecutionPolicy Bypass -File harness-setup.ps1
# 前置：harness 源码在同级目录 ../deepseek-harness，且已 pnpm install 过。

$ErrorActionPreference = 'Stop'
$delivery = Split-Path -Parent $MyInvocation.MyCommand.Path
$harness = Join-Path $delivery '..\deepseek-harness'
$harness = (Resolve-Path $harness).Path
$dst = Join-Path $harness 'packages\delivery'

Write-Host "== 1. 复制 spec/tool-spec/bundle 到 harness packages/delivery ==" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $dst -Force | Out-Null
foreach ($p in @('spec', 'tool-spec', 'bundle')) {
  Copy-Item (Join-Path $delivery "packages\$p") (Join-Path $dst $p) -Recurse -Force
}

Write-Host "== 2. 去掉 spec 的 dsh.client manifest（host 端联调用） ==" -ForegroundColor Cyan
$specPkg = Join-Path $dst 'spec\package.json'
$json = Get-Content $specPkg -Raw | ConvertFrom-Json
$json.PSObject.Properties.Remove('dsh')
$exports = $json.exports
$exports.PSObject.Properties.Remove('client')
$files = @($json.files | Where-Object { $_ -ne 'lib/client.js' })
$json.files = $files
$json | ConvertTo-Json -Depth 20 | Set-Content $specPkg -Encoding UTF8

Write-Host "== 3. 改 tsconfig 为 harness 视角 ==" -ForegroundColor Cyan
Set-Content (Join-Path $dst 'spec\tsconfig.json') -Encoding UTF8 -Value @'
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "lib/types" },
  "include": ["src"],
  "exclude": ["src/client.ts"],
  "references": [
    { "path": "../../../vendor/cosmokit" },
    { "path": "../../../vendor/cordis" },
    { "path": "../../../vendor/schemastery" },
    { "path": "../../util/brand" },
    { "path": "../../storage/storage-domain" },
    { "path": "../../typert/protocol" },
    { "path": "../../runtime-diagnostics/invariants" }
  ]
}
'@
Set-Content (Join-Path $dst 'tool-spec\tsconfig.json') -Encoding UTF8 -Value @'
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "lib/types" },
  "include": ["src"],
  "references": [
    { "path": "../spec" },
    { "path": "../../../vendor/cosmokit" },
    { "path": "../../../vendor/cordis" },
    { "path": "../../../vendor/schemastery" },
    { "path": "../../core/tools" },
    { "path": "../../runtime-diagnostics/invariants" }
  ]
}
'@
Set-Content (Join-Path $dst 'bundle\tsconfig.json') -Encoding UTF8 -Value @'
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "lib/types" },
  "include": ["src"],
  "references": [
    { "path": "../../../vendor/cosmokit" },
    { "path": "../../../vendor/cordis" },
    { "path": "../../../vendor/schemastery" },
    { "path": "../../runtime-diagnostics/invariants" }
  ]
}
'@

Write-Host "== 4. 注册 workspace + 依赖 + overlay ==" -ForegroundColor Cyan
# pnpm-workspace.yaml
$ws = Join-Path $harness 'pnpm-workspace.yaml'
$c = Get-Content $ws -Raw
if ($c -notmatch 'packages/delivery') {
  $c = $c.Replace("  - packages/*/*", "  - packages/*/*`n  - packages/delivery/*")
  Set-Content $ws $c -Encoding UTF8
}
# tsconfig.host.json
$th = Join-Path $harness 'tsconfig.host.json'
$c = Get-Content $th -Raw
if ($c -notmatch 'packages/delivery/spec') {
  $old = '    { "path": "./packages/lsp/tool-lsp" },'
  $new = $old + "`n    { `"path`": `"./packages/delivery/spec`" },`n    { `"path`": `"./packages/delivery/tool-spec`" },`n    { `"path`": `"./packages/delivery/bundle`" },"
  $c = $c.Replace($old, $new)
  Set-Content $th $c -Encoding UTF8
}
# tsdown.config.ts
$td = Join-Path $harness 'tsdown.config.ts'
$c = Get-Content $td -Raw
if ($c -notmatch 'packages/delivery') {
  $c = $c.Replace("workspace: ['vendor/*', 'packages/*/*', 'apps/cli']", "workspace: ['vendor/*', 'packages/*/*', 'packages/delivery/*', 'apps/cli']")
  Set-Content $td $c -Encoding UTF8
}
# web-app package.json
$wa = Join-Path $harness 'packages\bundle\web-app\package.json'
$c = Get-Content $wa -Raw
if ($c -notmatch 'dsh-tool-spec') {
  $c = $c.Replace('"@deepseek-ai/dsh-spec": "workspace:^",', '"@deepseek-ai/dsh-spec": "workspace:^",`n    "@deepseek-ai/dsh-tool-spec": "workspace:^",')
  Set-Content $wa $c -Encoding UTF8
}
# overlay
$ov = Join-Path $harness 'apps\web\tests\spec-protocol.overlay.yml'
Set-Content $ov -Encoding UTF8 -Value @'
- insert:
    - id: spec-store
      name: '@deepseek-ai/dsh-spec'
'@

Write-Host "== 5. pnpm install ==" -ForegroundColor Cyan
Push-Location $harness
pnpm install --no-frozen-lockfile | Select-Object -Last 3
Pop-Location

Write-Host "== 6. 构建 delivery 包（tsc + tsdown 生成 typert 产物） ==" -ForegroundColor Cyan
Push-Location $harness
pnpm exec tsc -b packages/delivery/spec packages/delivery/tool-spec packages/delivery/bundle
if ($LASTEXITCODE -ne 0) { throw "tsc 构建失败" }
pnpm exec tsdown --env.DSH_BUILD_FACE host | Select-Object -Last 3
Pop-Location

Write-Host "== 7. 复制阶段 preset 到用户预设根 ==" -ForegroundColor Cyan
$presetRoot = if ($env:DSH_HOME) { Join-Path $env:DSH_HOME '.agent-presets' } else { Join-Path $env:USERPROFILE '.dsh\.agent-presets' }
New-Item -ItemType Directory -Path $presetRoot -Force | Out-Null
Copy-Item (Join-Path $dst 'bundle\presets\*') $presetRoot -Recurse -Force

Write-Host "`n✓ harness 准备完成。下一步：启动 harness + 编排 + 前端（见 DEMO.md）" -ForegroundColor Green
