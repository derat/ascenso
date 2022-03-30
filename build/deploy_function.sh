#!/bin/bash

set -e

[ -n "$1" ] || exit 1
[ -n "$FIREBASE_PROJECT_ID" ] || exit 1

gcloud \
  --project="$FIREBASE_PROJECT_ID" \
  functions deploy "$1" \
  --runtime=go113 \
  --trigger-http \
  --set-env-vars="GCP_PROJECT=${FIREBASE_PROJECT_ID}"
