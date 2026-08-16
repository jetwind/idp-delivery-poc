#!/usr/bin/env bash
# Roll back harness staging presets (macOS/Linux). Harness is untouched.
set -euo pipefail
PRESET_ROOT="${DSH_HOME:-$HOME/.dsh}/.agent-presets"
if [ -d "$PRESET_ROOT" ]; then rm -rf "$PRESET_ROOT"; echo "OK: removed $PRESET_ROOT"; else echo "nothing to clean"; fi