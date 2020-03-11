# Ascenso

Ascenso is a mobile web app that can be used to track scores in endurance
rock-climbing competitions.

It uses [TypeScript], [Vue.js], and [Vuetify] in its frontend and [Firebase] as
its backend.

See [INSTALL.md] for installation instructions.

[![Build Status](https://travis-ci.org/derat/ascenso.svg?branch=master)](https://travis-ci.org/derat/ascenso)

[TypeScript]: https://www.typescriptlang.org/
[Vue.js]: https://vuejs.org/
[Vuetify]: https://vuetifyjs.com/
[Firebase]: https://firebase.google.com/
[INSTALL.md]: ./INSTALL.md

## Cloud Firestore Schema

Attempting to impose a modicum of order in the brave new NoSQL world:

### `global` collection

Heterogeneous singleton documents:

*   `auth` - Document containing authentication-related information.
    *   `cloudFunctionSHA256` - Hex-encoded SHA256 hash of secret password used
        to restrict HTTP access to Cloud Functions.
*   `config` - Document containing dynamic global configuration. (Static global
    configuration is set in `.env`.)
    *   `startTime` - [firebase.firestore.Timestamp] field containing
        competition start time.
    *   `endTime` - [firebase.firestore.Timestamp] field containing competition
        end time.
*   `indexedData` - Document containing indexed area and route information:
    *   `areas` - Map field containing area information keyed by area ID, e.g.
        `my_area`.
        *   `<area_id>` - Map containing area information:
            *   `name` - String field containing area name, e.g. `My Area`.
            *   `mpId` - Optional string field containing the area's Mountain
                Project ID, e.g. `"105833381"` for
                `"https://www.mountainproject.com/area/105833381/yosemite-national-park"`.
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
            *   `mpId` - Optional string field containing the route's Mountain
                Project ID, e.g. `"105836362"` for
                `"https://www.mountainproject.com/route/105836362/snake-dike"`.
*   `sortedData` - Document containing sorted area and route information:
    *   `areas` - Array of sorted area maps:
        *   `id` - String field containing area ID, e.g. `my_area`.
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
            *   `mpId` - Optional string field containing the route's Mountain
                Project ID, e.g. `"105836362"` for
                `"https://www.mountainproject.com/route/105836362/snake-dike"`.
        *   `mpId` - Optional string field containing the area's Mountain
            Project ID, e.g. `"105833381"` for
            `"https://www.mountainproject.com/area/105833381/yosemite-national-park"`.

[firebase.firestore.Timestamp]: https://firebase.google.com/docs/reference/js/firebase.firestore.Timestamp

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
            *   `climbs` - Map field containing information about the user's
                completed climbs. Keys are route IDs. Values are 0 for not
                climbed, 1 for lead, or 2 for top-rope.
            *   `left`: Boolean field set to true if the user has left the team.

### `users` collection

*   `<uid>` - Document containing information about a user.
    *   `name` - String field containing the user's name, e.g. "Some Climber".
    *   `team` - String field containing ID of a document in the `teams`
        collection. Unset if the user is not on a team.
    *   `filters` - Map field containing route filter data. Unset if no filters
        are set.
        *   `minGrade` - String field containing minimum grade. Unset if equal
            to the easiest route's grade.
        *   `maxGrade` - String field containing maximum grade. Unset if equal
            to the hardest route's grade.
