#!/bin/bash

set -e

CREDS=$(mktemp -t creds.json.XXXXXXXXXX)
printenv DEPLOY_CREDENTIALS >"$CREDS"
export GOOGLE_APPLICATION_CREDENTIALS=$CREDS

firebase --debug use "$FIREBASE_PROJECT_ID"
firebase target:apply hosting prod "$FIREBASE_HOSTING_TARGET"
firebase deploy --project="$FIREBASE_PROJECT_ID" --only=hosting,firestore:rules
