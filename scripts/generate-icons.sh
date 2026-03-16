#!/bin/bash
set -e

# Generate macOS .icns from a source PNG
# Usage: ./scripts/generate-icons.sh [source.png]
# Default source: src/renderer/src/assets/mycel_trans.png

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SOURCE="${1:-$PROJECT_DIR/src/renderer/src/assets/mycel_trans.png}"
ICONSET_DIR="$PROJECT_DIR/build/icon.iconset"
OUTPUT="$PROJECT_DIR/build/icon.icns"

if [ ! -f "$SOURCE" ]; then
  echo "Source PNG not found: $SOURCE"
  exit 1
fi

echo "Source: $SOURCE"

# Clean and create iconset directory
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

# Required sizes for macOS iconset
# Format: filename dimension
SIZES=(
  "icon_16x16.png 16"
  "icon_16x16@2x.png 32"
  "icon_32x32.png 32"
  "icon_32x32@2x.png 64"
  "icon_128x128.png 128"
  "icon_128x128@2x.png 256"
  "icon_256x256.png 256"
  "icon_256x256@2x.png 512"
  "icon_512x512.png 512"
)

for entry in "${SIZES[@]}"; do
  name=$(echo "$entry" | cut -d' ' -f1)
  size=$(echo "$entry" | cut -d' ' -f2)
  echo "  Generating $name (${size}x${size})"
  sips -z "$size" "$size" "$SOURCE" --out "$ICONSET_DIR/$name" > /dev/null 2>&1
done

# For 512@2x (1024), use the source directly (500px will be upscaled slightly)
echo "  Generating icon_512x512@2x.png (1024x1024)"
sips -z 1024 1024 "$SOURCE" --out "$ICONSET_DIR/icon_512x512@2x.png" > /dev/null 2>&1

# Convert iconset to icns
echo "Converting to .icns..."
iconutil -c icns "$ICONSET_DIR" -o "$OUTPUT"

# Clean up iconset directory
rm -rf "$ICONSET_DIR"

echo "Done: $OUTPUT"
ls -lh "$OUTPUT"
