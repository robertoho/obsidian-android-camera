#!/usr/bin/env bash
set -euo pipefail

VAULT_PATH="/Users/roberto/Documents/S24U/Obsidian"
PLUGIN_ID="android-camera-embed"
PLUGIN_DIR="${VAULT_PATH}/.obsidian/plugins/${PLUGIN_ID}"

mkdir -p "${PLUGIN_DIR}"
cp "manifest.json" "main.js" "${PLUGIN_DIR}/"

echo "Copied manifest.json and main.js to ${PLUGIN_DIR}"
