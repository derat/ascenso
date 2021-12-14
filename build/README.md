# build

This directory contains files used to run this repository's tests using Google's
[Cloud Build] service.

[test.yaml](./test.yaml) is a [Cloud Build configuration file] that runs tests.

[Dockerfile](./Dockerfile) is used to build a [Docker] container image with
Chrome, the Google Cloud SDK, and related dependencies preinstalled for running
tests. When executed in this directory, the following command uses Cloud Build
to build a container and submit it to the [Container Registry].

```
gcloud --project ${PROJECT_ID} builds submit \
  --tag gcr.io/${PROJECT_ID}/ascenso-test
```

[Cloud Build]: https://cloud.google.com/build
[Cloud Build configuration file]: https://cloud.google.com/build/docs/build-config-file-schema
[Docker]: https://www.docker.com/
[Container Registry]: https://cloud.google.com/container-registry