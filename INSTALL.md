# Ascenso Installation

## Firebase Console

In the [Firebase Console]:

*   Open the `Authentication` page and enable the `Google` and `Email/Password`
    methods in the `Sign-in method` tab. Under the `Authorized domains` section,
    add any additional hostnames that will be used to access the site.
*   Open the `Database` page and create a Cloud Firestore database with
    fully-restricted permissions.
*   Open the `Hosting` page and enable hosting. Add an additional site if using
    the non-default-site configuration described below.

[Firebase Console]: https://console.firebase.google.com/

## Google Cloud Platform Console

In the [GCP Console]:

*   On the [OAuth Consent Screen] tab, fill in the `Application Homepage link`
    field and click `Save`. This is required in order for the app to use Google
    authentication.
*   Optionally, on the [Credentials] tab, restrict the use of API keys.

[GCP Console]: https://console.cloud.google.com
[OAuth Consent Screen]: https://console.cloud.google.com/apis/credentials/consent
[Credentials]: https://console.cloud.google.com/apis/credentials

## Local checkout

### Dependencies

Run the following command to install required dependencies to the `node_modules`
directory:

```sh
npm install
```

### .env.local

A file named `.env.local` must be created in the root of the repository to
provide site-specific configuration to the app. See the checked-in, fallback
[.env](./.env) file for details.

### .firebaserc

The checked-in [firebase.json](./firebase.json) file configures Firebase Hosting
to use a `prod` target that deploys to a site with a name that differs from the
default (i.e. `<project ID>.web.app`). Sometimes a desired name won't be
available as a Firebase (or Google Cloud) Project ID, but will still be
available as a Firebase Hosting site name. It's possible to add an additional
site in Firebase Hosting in this scenario.

With a project ID of `myapp-1234` and a desired site name of `myapp`, use a
`.firebaserc` similar to the following to deploy the app to `myapp.web.app`
rather than `myapp-1234.web.app`:

```json
{
  "projects": {
    "default": "myapp-1234"
  },
  "targets": {
    "myapp-1234": {
      "hosting": {
        "prod": [
          "myapp"
        ]
      }
    }
  }
}
```

Note that `myapp.web.app` will also need to be added as an authorized domain in
the [Firebase Console] as described earlier.

Optionally, to add an additional `project` target that redirects the default
`myapp-123.web.app` site to `myapp.web.app`, add a field similar to the
following to the `hosting` object in `.firebaserc`:

```json
"unused": [
  "myapp-1234"
]
```

Also add an object similar to the following to the `hosting` list in
`firebase.json`:

```json
{
  "target": "unused",
  "public": "public",
  "redirects": [
    {
      "source": "**",
      "destination": "https://myapp.web.app/",
      "type": 302
    }
  ]
}
```

You can delete this redirect-related configuration from `.firebaserc` and
`firebase.json` after deploying to the default site once.

See the [Firebase Hosting] docs for more details.

[Firebase Hosting]: https://firebase.google.com/docs/hosting

### Deploy the site

Compile the site into the `dist` directory and deploy from there to Firebase
Hosting:

```sh
npm run build
firebase deploy --only hosting
```

### Deploy Cloud Firestore Rules

Deploy Cloud Firestore security rules from `firestore.rules`:

```sh
firebase deploy --only firestore:rules
```

### Deploy Cloud Functions

Deploy Cloud Functions:

```sh
gcloud --project <PROJECT_ID> functions deploy Admin --runtime go111 --trigger-http
gcloud --project <PROJECT_ID> functions deploy Log --runtime go111 --trigger-http
```

`PROJECT_ID` should contain the Firebase project ID, e.g. `myapp-1234`. Without
the `--project` flag, this command uses the `gcloud` command's default project,
which may be changed by running `gcloud config set project <PROJECT_ID>`.

## Cloud Firestore data

### Global configuration

In the [Firebase Console], open the `Database` page and create `global/auth` and
`global/config` documents as described in the schema in [README.md].

The hash in `global/auth` can be created with a command similar to the
following:

```sh
echo -n MYSECRETPASSWORD1234 | sha256sum
```

[README.md]: ./README.md

### Upload area and route data

The `Admin` Cloud Function can be used to import area and route information from
CSV files into the `global/indexedData` and `global/sortedData` documents. Two
CSV files are needed, one describing areas and the other describing routes. Each
file must contain an initial row containing column names.

```csv
id,name
some_area,Some Area
another_area,Another Area
```

```csv
id,name,area,grade,lead,tr
first_route,First Route,some_area,5.10c,18,9
second_route,Second Route,some_area,5.9,13,7
third_route,Third Route,another_area,5.11a,22,11
```

The `Admin` function can be loaded in a web browser at the URL printed when it
was deployed, likely of the form
`https://<gcp-region>-<project-id>.cloudfunctions.net/Admin`. Select the two CSV
files and enter the password that was used to generate the hash in the
`global/auth` Cloud Firestore document.
