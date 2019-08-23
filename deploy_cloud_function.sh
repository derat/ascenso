#!/bin/sh -e

die() {
  echo "$1" 1>&2
  exit 1
}

[ "$#" -eq 1 ] || die "Usage: $0 <function>"
[ -e ./.firebaserc ] || die ".firebaserc not found"
[ -e ./ascenso.go ] || die "Must be run in the checkout root"
command -v jq >/dev/null || die "jq is required: https://stedolan.github.io/jq/"

# Extract the GCP project ID from .firebaserc. Without being instructed
# otherwise, the gcloud program operates on the concept of a "default project"
# (unlike the firebase program, which sensibly just reads a dotfile).
project=$(jq -r .projects.default < ./.firebaserc)

echo "Deploying $1 to ${project}..."

gcloud --project "${project}" functions deploy "$1" \
  --runtime go111 --trigger-http
