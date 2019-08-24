#!/bin/sh -e

# Builds the site and deploys it to Firebase Hosting.
# Also deploys Cloud Firestore security rules and
# all non-test Cloud Functions.

npm run build
firebase deploy --only hosting,firestore:rules
echo
./deploy_cloud_function.sh Admin
echo
./deploy_cloud_function.sh Log
