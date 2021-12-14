#!/bin/bash

set -e

google-chrome --version

# Cloud Build YAML files support copying artifacts to Cloud Storage, but they
# infuriatingly don't actually get saved if the build fails:
# https://stackoverflow.com/questions/61487234/storing-artifacts-from-a-failed-build
# https://issuetracker.google.com/issues/128353446
# https://github.com/GoogleCloudPlatform/cloud-builders/issues/253
#
# They also don't seem to pass -r to gsutil, apparently requiring you to specify
# individual files rather than directories.
function copy_artifacts {
  local tarball="${BUILD_ID}.tgz"
  local dest="gs://${PROJECT_ID}-artifacts/ascenso-test/${tarball}"
  tar czf "$tarball" .test_artifacts
  echo "Copying output to ${dest}"
  gsutil cp "$tarball" "$dest"
}
trap copy_artifacts EXIT

npm run test:e2e:auto
