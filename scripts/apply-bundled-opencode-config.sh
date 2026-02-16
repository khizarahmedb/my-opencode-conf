#!/bin/bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$REPO_ROOT/configs/opencode"
DEST_DIR="$HOME/.config/opencode"
DEST_AGENTS_DIR="$DEST_DIR/agents"

if [ ! -d "$SRC_DIR" ]; then
  echo "Missing source directory: $SRC_DIR"
  exit 1
fi

mkdir -p "$DEST_AGENTS_DIR"

cp "$SRC_DIR/opencode.json" "$DEST_DIR/opencode.json"
cp "$SRC_DIR/agents/"*.md "$DEST_AGENTS_DIR/"

echo "Applied bundled opencode config to: $DEST_DIR"
echo "Agents installed:"
ls -1 "$DEST_AGENTS_DIR" | sed 's/^/- /'
