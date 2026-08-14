#!/usr/bin/env bash
# 一键准备 harness 联调环境（macOS/Linux，临时改动，学习用，之后用 harness-reset.sh 回滚）。
# 用法：在交付文件夹根目录执行  bash harness-setup.sh
# 前置：harness 源码在同级目录 ../deepseek-harness，且已 pnpm install 过。

set -euo pipefail

DELIVERY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS="$(cd "$DELIVERY/../deepseek-harness" && pwd)"
DST="$HARNESS/packages/delivery"

echo "== 1. 复制 spec/tool-spec/bundle 到 harness packages/delivery =="
mkdir -p "$DST"
for p in spec tool-spec bundle; do
  cp -R "$DELIVERY/packages/$p" "$DST/$p"
done

echo "== 2. 去掉 spec 的 dsh.client manifest（host 端联调用） =="
node -e '
const fs = require("fs");
const p = process.argv[1];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
delete j.dsh;
delete j.exports["./client"];
j.files = j.files.filter(f => f !== "lib/client.js");
fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
' "$DST/spec/package.json"

echo "== 3. 改 tsconfig 为 harness 视角 =="
cat > "$DST/spec/tsconfig.json" <<'EOF'
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
EOF
cat > "$DST/tool-spec/tsconfig.json" <<'EOF'
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
EOF
cat > "$DST/bundle/tsconfig.json" <<'EOF'
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
EOF

echo "== 4. 注册 workspace + 依赖 + overlay =="
node -e '
const fs = require("fs");
const h = process.argv[1];

// pnpm-workspace.yaml
let ws = fs.readFileSync(`${h}/pnpm-workspace.yaml`, "utf8");
if (!ws.includes("packages/delivery")) {
  ws = ws.replace("  - packages/*/*", "  - packages/*/*\n  - packages/delivery/*");
  fs.writeFileSync(`${h}/pnpm-workspace.yaml`, ws);
}

// tsconfig.host.json
let th = fs.readFileSync(`${h}/tsconfig.host.json`, "utf8");
if (!th.includes("packages/delivery/spec")) {
  th = th.replace(
    "{ \"path\": \"./packages/lsp/tool-lsp\" },",
    "{ \"path\": \"./packages/lsp/tool-lsp\" },\n    { \"path\": \"./packages/delivery/spec\" },\n    { \"path\": \"./packages/delivery/tool-spec\" },\n    { \"path\": \"./packages/delivery/bundle\" },"
  );
  fs.writeFileSync(`${h}/tsconfig.host.json`, th);
}

// tsdown.config.ts
let td = fs.readFileSync(`${h}/tsdown.config.ts`, "utf8");
if (!td.includes("packages/delivery")) {
  td = td.replace(
    "workspace: [\u0027vendor/*\u0027, \u0027packages/*/*\u0027, \u0027apps/cli\u0027]",
    "workspace: [\u0027vendor/*\u0027, \u0027packages/*/*\u0027, \u0027packages/delivery/*\u0027, \u0027apps/cli\u0027]"
  );
  fs.writeFileSync(`${h}/tsdown.config.ts`, td);
}

// web-app package.json
let wa = fs.readFileSync(`${h}/packages/bundle/web-app/package.json`, "utf8");
if (!wa.includes("dsh-tool-spec")) {
  wa = wa.replace(
    "\"@deepseek-ai/dsh-spec\": \"workspace:^\",",
    "\"@deepseek-ai/dsh-spec\": \"workspace:^\",\n    \"@deepseek-ai/dsh-tool-spec\": \"workspace:^\","
  );
  fs.writeFileSync(`${h}/packages/bundle/web-app/package.json`, wa);
}
' "$HARNESS"

mkdir -p "$HARNESS/apps/web/tests"
cat > "$HARNESS/apps/web/tests/spec-protocol.overlay.yml" <<'EOF'
- insert:
    - id: spec-store
      name: '@deepseek-ai/dsh-spec'
EOF

echo "== 5. pnpm install =="
(cd "$HARNESS" && pnpm install --no-frozen-lockfile)

echo "== 6. 构建 delivery 包（tsc + tsdown 生成 typert 产物） =="
(cd "$HARNESS" && pnpm exec tsc -b packages/delivery/spec packages/delivery/tool-spec packages/delivery/bundle && pnpm exec tsdown --env.DSH_BUILD_FACE host)

echo "== 7. 复制阶段 preset 到用户预设根 =="
PRESET_ROOT="${DSH_HOME:-$HOME/.dsh}/.agent-presets"
mkdir -p "$PRESET_ROOT"
cp -R "$DST/bundle/presets/"* "$PRESET_ROOT/"

echo ""
echo "✓ harness 准备完成。下一步：启动 harness + 编排 + 前端（见 DEMO.md）"
