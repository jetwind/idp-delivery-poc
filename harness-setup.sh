#!/usr/bin/env bash
# Prepare harness staging presets (macOS/Linux). No plugin copy/build needed now:
# artifacts go through files + git. Only copy stage presets into the user preset root.
set -euo pipefail
DELIVERY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRESET_ROOT="${DSH_HOME:-$HOME/.dsh}/.agent-presets"
mkdir -p "$PRESET_ROOT"
cp -R "$DELIVERY/packages/bundle/presets/"* "$PRESET_ROOT/"
echo "OK: presets copied to $PRESET_ROOT (harness itself unchanged)"