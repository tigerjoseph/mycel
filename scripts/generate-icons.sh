#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE="${1:-$SCRIPT_DIR/../src/renderer/src/assets/app-icon.png}"
node "$SCRIPT_DIR/generate-icons.mjs" "$SOURCE"
