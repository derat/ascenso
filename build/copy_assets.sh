#!/bin/bash

set -e

DEST=public/assets

if [ -n "$ASSETS_URL" ]; then
  mkdir -p "$DEST"
  gsutil -m cp -r "${ASSETS_URL}/*" "$DEST"
else
  cp -r public/assets-fallback "$DEST"
fi
