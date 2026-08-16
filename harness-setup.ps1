# Prepare harness staging presets (Windows). No plugin copy/build needed.
$ErrorActionPreference = 'Stop'
$delivery = Split-Path -Parent $MyInvocation.MyCommand.Path
$presetRoot = if ($env:DSH_HOME) { Join-Path $env:DSH_HOME '.agent-presets' } else { Join-Path $env:USERPROFILE '.dsh\.agent-presets' }
New-Item -ItemType Directory -Path $presetRoot -Force | Out-Null
Copy-Item (Join-Path $delivery 'packages\bundle\presets\*') $presetRoot -Recurse -Force
Write-Host "OK: presets copied to $presetRoot (harness itself unchanged)" -ForegroundColor Green