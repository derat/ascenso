# ascenso

## Configuration

### src/firebase/config.js

A local file similar to the following must be created at
`src/firebase/config.js` to configure the app's use of
[Firebase](https://firebase.google.com/):

```js
export default {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "",
  messagingSenderId: "...",
  appId: "...",
};
```

The appropriate values can be found in the [Firebase
Console](https://console.firebase.google.com/):

*   Open the settings page by clicking the gear icon to the right of `Project
    Overview` in the top left corner of the page and selecting `Project
    settings`.
*   In the `General` tab, scroll down to `Your apps`.
*   Under `Firebase SDK snippet`, click `Config`.

### .firebaserc

The checked-in `firebase.json` file configures Firebase Hosting to use a `prod`
target that deploys to a site with a name that differs from the default (i.e.
`<project ID>.web.app`). Sometimes a desired name won't be available as a
Firebase (or Google Cloud) Project ID, but will still be available as a Firebase
Hosting site name. It's possible to add an additional site in Firebase Hosting
in this scenario.

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

To add an additional `project` target that redirects `myapp-123.web.app` to
`myapp.web.app`, add a field similar to the following to the `hosting` object in
`.firebaserc`:

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
      "type": 301
    }
  ]
}
```

See the [Firebase Hosting docs](https://firebase.google.com/docs/hosting) for
more details.

## Cloud Firestore

Attempting to impose a modicum of order in the brave new NoSQL world:

### `global` collection

Heterogeneous singleton documents:

*   `auth` - Document containing authentication-related information.
    *   `cloudFunctionSHA256` - Hex-encoded SHA256 hash of secret password used
        to restrict HTTP access to Cloud Functions.
*   `config` - Document containing global configuration:
    *   `competitionName` - String field containing competition name, e.g. `"My
        Competition 2019"`.
*   `indexedData` - Document containing indexed area and route information:
    *   `areas` - Map field containing area information keyed by area ID, e.g.
        `my_area`.
        *   `<area_id>` - Map containing area information:
            *   `name` - String field containing area name, e.g. `My Area`.
    *   `routes` - Map field containing route information keyed by route ID,
        e.g. `my_route`.
        *   `<route_id>` - Map containing route information:
            *   `name` - String field containing route name, e.g. `"My Route"`.
            *   `area` - String field containing area ID, e.g. `my_area`.
            *   `grade` - String field containing route grade, e.g. `"5.10c"` or
                `"5.11c/d"`.
            *   `lead` - Number field containing points awarded for leading the
                route.
            *   `tr` - Number field containing points awarded for top-roping the
                route.
*   `sortedData` - Document containing sorted area and route information:
    *   `areas` - Array of sorted area maps:
        *   `name` - String field containing area name, e.g. `My Area`.
        *   `routes` - Array of sorted route maps:
            *   `id` - String containing the unique route ID. This should be a
                `hacker_style` version of the `name` field, e.g. `my_route`.
            *   `name` - String field containing route name, e.g. `"My Route"`.
            *   `grade` - String field containing route grade, e.g. `"5.10c"` or
                `"5.11c/d"`.
            *   `lead` - Number field containing points awarded for leading the
                route.
            *   `tr` - Number field containing points awarded for top-roping the
                route.

### `invites` collection

*   `<invite_id>` - Document containing an invite code. The ID is a six-digit
    number.
    *   `team` - String field containing ID in `teams` collection.

### `teams` collection

*   `<team_id>` - Document containing information about a team.
    *   `name` - Team name, e.g. "Our Team".
    *   `invite` - Invite code, i.e. `<invite_id>` from `invites` collection.
    *   `users` - Map field containing data about team members keyed by UID.
        *   `<uid>` - Map containing user information:
            *   `name` - User name (duplicated from `name` field in `users`
                collection).

### `users` collection

*   `<uid>` - Document containing information about a user.
    *   `name` - String field containing the user's name, e.g. "Some Climber".
    *   `climbs` - Map field containing information about completed climbs. Keys
        are route IDs. Values are 0 for not climbed, 1 for lead, or 2 for
        top-rope.
    *   `team` - String field containing ID of a document in the `teams`
        collection. Unset if the user is not on a team.

## Cloud Functions

In the `functions/routes` directory, deploy the function:

```sh
gcloud functions deploy UpdateRoutes --runtime go111 --trigger-http
```
