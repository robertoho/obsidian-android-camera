#!/usr/bin/env bash
set -euo pipefail

DIST_DIR="dist"

rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

cp "manifest.json" "main.js" "${DIST_DIR}/"

echo "Created dist/ with manifest.json and main.js"
