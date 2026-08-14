# Roll back harness staging presets (Windows). Harness is untouched.
$ErrorActionPreference = 'Stop'
$presetRoot = if ($env:DSH_HOME) { Join-Path $env:DSH_HOME '.agent-presets' } else { Join-Path $env:USERPROFILE '.dsh\.agent-presets' }
if (Test-Path $presetRoot) { Remove-Item $presetRoot -Recurse -Force; Write-Host "OK: removed $presetRoot" -ForegroundColor Green } else { Write-Host "nothing to clean" }