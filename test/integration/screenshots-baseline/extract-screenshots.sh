#!/bin/bash
DEST_DIR="$2/test/integration/screenshots-baseline/"
unzip -o "$1" "*.png" -d "$DEST_DIR"
git add $DEST_DIR\*.png
git commit -m "Update screenshots for $3"
