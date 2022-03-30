# build

This directory contains files used to deploy this app and run its tests using
Google's [Cloud Build] service.

[deploy.yaml](./deploy.yaml) is a [Cloud Build configuration file] to build the
app and deploy it to [Firebase Hosting].

[deploy_functions.yaml](./deploy_functions.yaml) deploys [Cloud Functions].

[test.yaml](./test.yaml) runs tests.

[Dockerfile](./Dockerfile) is used to build a [Docker] container image with
Chrome, the Google Cloud SDK, and related dependencies preinstalled for running
tests. When executed in this directory, the following command uses Cloud Build
to build a container and submit it to the [Container Registry].

```
gcloud --project ${PROJECT_ID} builds submit \
  --tag gcr.io/${PROJECT_ID}/ascenso-test
```

If the deploy-related configs are run in a different GCP project from the one
hosting the Firebase app, the Cloud Build project's
`<id>@cloudbuild.gserviceaccount.com` service account needs to be granted the
following roles via the target Firebase project's IAM page:

*   `Cloud Functions Developer`
*   `Service Account User`
*   `Storage Object Viewer` (to copy assets from a Cloud Storage bucket)

A service account with the following roles should also be created in the
Firebase project:

*   `Cloud Datastore Index Admin`
*   `Firebase Hosting Admin`
*   `Firebase Rules Admin`

This account's JSON key should be passed via the `_DEPLOY_CREDENTIALS`
substitution variable.

[Cloud Build]: https://cloud.google.com/build
[Cloud Build configuration file]: https://cloud.google.com/build/docs/build-config-file-schema
[Firebase Hosting]: https://firebase.google.com/docs/hosting
[Cloud Functions]: https://cloud.google.com/functions
[Docker]: https://www.docker.com/
[Container Registry]: https://cloud.google.com/container-registry
