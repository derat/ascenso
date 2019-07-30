<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-container v-if="ready" grid-list-md text-ms-center>
    <!-- "Individual" card -->
    <v-card class="pa-3">
      <div class="caption">Individual</div>
      <v-layout row>
        <v-flex>
          <v-form v-model="userNameValid" @submit.prevent>
            <v-text-field
              :value="userDoc.name"
              :counter="nameMaxLength"
              :rules="nameRules"
              label="Your name"
              @change="updateUserName"
            />
          </v-form>
        </v-flex>
      </v-layout>
    </v-card>

    <v-spacer class="mt-3" />

    <!-- "Team" card -->
    <v-card class="pa-3">
      <div class="caption">Team</div>

      <!-- User is on a team -->
      <template v-if="teamDoc.users">
        <v-layout row>
          <v-flex>
            <v-form v-model="teamNameValid" @submit.prevent>
              <v-text-field
                :value="teamDoc.name"
                :counter="nameMaxLength"
                :rules="nameRules"
                label="Name"
                @change="updateTeamName"
              />
            </v-form>
          </v-flex>
        </v-layout>

        <v-layout row>
          <v-flex>
            <div class="caption grey--text text--darken-1">Members</div>
            <div
              v-for="name in teamUserNames"
              v-bind:key="name"
              class="member-name"
            >
              {{ name }}
            </div>
          </v-flex>
        </v-layout>

        <v-divider class="mt-2 mb-3" />

        <v-card-actions class="pa-0">
          <!-- "Show invite code" button and dialog -->
          <v-dialog v-model="inviteDialogShown">
            <template v-slot:activator="{ on }">
              <v-btn :disabled="teamFull" color="primary" v-on="on">
                Show invite code
              </v-btn>
            </template>

            <v-card>
              <v-card-title class="title grey lighten-2" primary-title>
                Invite Code
              </v-card-title>

              <v-card-text>
                <div class="invite-code mb-2">{{ teamDoc.invite }}</div>
                <div>
                  Your teammate can enter this code in their profile to join
                  your team. Don't show it to anyone else.
                </div>
              </v-card-text>

              <v-card-actions>
                <v-spacer />
                <v-btn flat color="primary" @click="inviteDialogShown = false">
                  Dismiss
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <v-spacer />

          <!-- "Leave team" button and dialog -->
          <v-dialog v-model="leaveDialogShown">
            <template v-slot:activator="{ on }">
              <v-btn flat color="error" v-on="on">Leave team</v-btn>
            </template>

            <v-card>
              <v-card-title class="title grey lighten-2" primary-title>
                Leave Team
              </v-card-title>

              <v-card-text>
                Are you sure you want to leave your team?
              </v-card-text>

              <v-card-actions>
                <v-btn flat color="primary" @click="leaveDialogShown = false">
                  Cancel
                </v-btn>
                <v-spacer />
                <v-btn
                  flat
                  color="error"
                  :disabled="leavingTeam"
                  @click="leaveTeam"
                >
                  Leave team
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-card-actions>
      </template>

      <!-- User is not on a team -->
      <template v-else>
        <div class="no-team-text mt-2">
          You are not on a team.
        </div>

        <v-divider class="mt-2 mb-3" />

        <v-card-actions class="pa-0">
          <!-- "Join team" button and dialog -->
          <v-dialog v-model="joinDialogShown">
            <template v-slot:activator="{ on }">
              <v-btn color="primary" v-on="on">Join team</v-btn>
            </template>

            <v-card>
              <v-card-title class="title grey lighten-2" primary-title>
                Join Team
              </v-card-title>

              <v-card-text>
                <div>
                  Ask your teammate to give you the {{ inviteCodeLength }}-digit
                  invite code from their profile page.
                </div>
                <v-form v-model="joinTeamValid" @submit.prevent="joinTeam">
                  <!-- The v-if fixes autofocus on reopen. See
                       https://github.com/vuetifyjs/vuetify/issues/1731 -->
                  <v-text-field
                    v-model="joinInviteCode"
                    v-if="joinDialogShown"
                    :mask="inviteCodeMask"
                    :counter="inviteCodeLength"
                    :rules="joinInviteCodeRules"
                    label="Invite code"
                    class="mt-2"
                    autofocus
                    required
                  />
                </v-form>
              </v-card-text>

              <v-card-actions>
                <v-spacer />
                <v-btn
                  :disabled="!joinTeamValid || joiningTeam"
                  color="primary"
                  flat
                  @click="joinTeam"
                >
                  Join
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- Push buttons to left and right side -->
          <v-spacer />

          <!-- "Create team" button and dialog -->
          <v-dialog v-model="createDialogShown">
            <template v-slot:activator="{ on }">
              <v-btn color="primary" v-on="on">Create team</v-btn>
            </template>

            <v-card>
              <v-card-title class="title grey lighten-2" primary-title>
                Create Team
              </v-card-title>

              <v-card-text>
                <div>
                  After creating a new team, you'll get an invite code to give
                  to your teammate so they can join.
                </div>
                <v-form v-model="createTeamValid" @submit.prevent="createTeam">
                  <v-text-field
                    v-model="createTeamName"
                    v-if="createDialogShown"
                    :counter="nameMaxLength"
                    :rules="nameRules"
                    label="Team name"
                    class="mt-2"
                    autofocus
                    required
                  />
                </v-form>
              </v-card-text>

              <v-card-actions>
                <v-spacer />
                <v-btn
                  :disabled="!createTeamValid || creatingTeam"
                  color="primary"
                  flat
                  @click="createTeam"
                >
                  Create
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-card-actions>
      </template>
    </v-card>
  </v-container>
  <Spinner v-else />
</template>

<script>
import firebase from 'firebase/app';
import { auth, db } from '@/firebase';
import Spinner from '@/components/Spinner.vue';
import { bindUserAndTeamDocs } from '@/users';

export default {
  components: {
    Spinner,
  },
  computed: {
    // String input mask passed to <v-text-input> for invite code.
    inviteCodeMask: function() {
      return '#'.repeat(this.inviteCodeLength);
    },

    // Stably-ordered array of names of team members.
    teamUserNames: function() {
      if (!this.teamDoc.users) return [];

      // Sort by UID to get stable ordering.
      return Object.keys(this.teamDoc.users)
        .sort()
        .map(uid => {
          return this.teamDoc.users[uid].name;
        });
    },

    // Bool describing whether the team is currently full.
    teamFull: function() {
      return (
        this.teamDoc.users &&
        Object.keys(this.teamDoc.users).length >= this.teamSize
      );
    },
  },
  data() {
    return {
      // Maximum length of user and team names.
      nameMaxLength: 50,
      // Rules for user and team name inputs.
      nameRules: [
        v => !!v || 'Name must not be empty',
        v =>
          !v ||
          v.length <= this.nameMaxLength ||
          'Name must be ' + this.nameMaxLength + ' characters or shorter',
      ],

      // Whether the user and team name text fields contain valid input.
      userNameValid: false,
      teamNameValid: false,

      // Model for "Create team" dialog visibility.
      createDialogShown: false,
      // Whether "Create team" form contains valid input.
      createTeamValid: false,
      // Model for team name input in "Create team" dialog.
      createTeamName: '',
      // Whether we're in the process of creating a team.
      creatingTeam: false,

      // Model for "Join team" dialog visibility.
      joinDialogShown: false,
      // Whether "Join team" form contains valid input.
      joinTeamValid: false,
      // Model for invite code input in "Join team" dialog.
      joinInviteCode: '',
      // Whether we're in the process of joining a team.
      joiningTeam: false,
      // Rules for invite code input.
      joinInviteCodeRules: [
        v =>
          (v && v.length == this.inviteCodeLength) ||
          'Code must be ' + this.inviteCodeLength + ' digits',
      ],

      // Model for "Show invite code" dialog visibility.
      inviteDialogShown: false,

      // Model for "Leave team" dialog visibility.
      leaveDialogShown: false,
      // Whether we're in the process of leaving the team.
      leavingTeam: false,

      // Length of invite codes.
      inviteCodeLength: 6,
      // Number of users on a full team.
      teamSize: 2,

      // Snapshot and reference for team document.
      teamDoc: {},
      teamRef: null,

      // Snapshot and reference for user document.
      userDoc: {},
      userRef: null,

      // Whether view is ready to be initially displayed.
      ready: false,
    };
  },
  methods: {
    // Updates the user's name in Firestore when the user name input is blurred.
    updateUserName(name) {
      if (!this.userNameValid) return;
      // TODO: Trim whitespace, discard embedded newlines, etc.?
      const batch = db.batch();
      batch.update(this.userRef, { name: name });
      if (this.teamRef) {
        const key = 'users.' + auth.currentUser.uid + '.name';
        batch.update(this.teamRef, { [key]: name });
      }
      batch.commit();
    },

    // Updates the team's name in Firestore when the team name input is blurred.
    updateTeamName(name) {
      if (!this.teamNameValid) return;
      // TODO: Trim whitespace, discard embedded newlines, etc.?
      this.teamRef.update({ name: name });
    },

    // Creates a new team when the "Create" button is clicked in the "Create
    // team" dialog.
    createTeam() {
      if (!this.createTeamValid || this.creatingTeam) return;
      this.creatingTeam = true;

      // Generate an ID for a new team document.
      const teamRef = db.collection('teams').doc();

      // We get a string like "0.4948219742736113" and then chop off the left.
      const inviteCode = Math.random()
        .toString()
        .slice(2, 2 + this.inviteCodeLength);

      // Perform a single batched write that creates the team document, creates
      // an invite document containing the team ID, and updates the user doc to
      // contain the team ID.
      const batch = db.batch();
      batch.set(teamRef, {
        name: this.createTeamName,
        users: {
          [auth.currentUser.uid]: {
            name: this.userDoc.name,
            climbs: this.userDoc.climbs || {},
          },
        },
        invite: inviteCode,
      });
      batch.set(db.collection('invites').doc(inviteCode), { team: teamRef.id });
      batch.update(this.userRef, {
        team: teamRef.id,
        // The user's climbs are now stored in the team doc. We do this to avoid
        // needing to write to both the team and user doc every time the user
        // completes another climb, and also to prevent needing to let user A
        // write to teammate B's user doc if A reports a climb performed by B.
        climbs: firebase.firestore.FieldValue.delete(),
      });
      batch
        .commit()
        .then(
          () => {
            // Update the UI to reflect the changes.
            // TODO: Just watch userDoc.team instead?
            this.teamRef = teamRef;
            this.$bind('teamDoc', this.teamRef);
            this.createDialogShown = false;
            this.inviteDialogShown = true;
            this.createTeamName = '';
          },
          err => {
            // TODO: Surface to the user.
            console.log('Failed to create team:', err);
          }
        )
        .finally(() => {
          this.creatingTeam = false;
        });
    },

    // Joins a team when the "Join" button is clicked in the "Join team" dialog.
    joinTeam() {
      if (!this.joinTeamValid || this.joiningTeam) return;
      this.joiningTeam = true;

      // We need to access this throughout the promise chain.
      let teamRef;

      // First get the invite doc to find the team ID.
      db.collection('invites')
        .doc(this.joinInviteCode)
        .get()
        .then(
          inviteSnap => {
            // Now get the team doc.
            teamRef = db.collection('teams').doc(inviteSnap.data().team);
            return teamRef.get();
          },
          err => {
            // Rethrow to skip to the final error handler.
            throw 'Failed to check invite code: ' + err;
          }
        )
        .then(teamSnap => {
          if (Object.keys(teamSnap.get('users')).length >= this.teamSize) {
            throw 'Team is full';
          }
          // Update the team doc and the user doc.
          const batch = db.batch();
          batch.update(teamRef, {
            ['users.' + auth.currentUser.uid]: {
              name: this.userDoc.name,
              climbs: this.userDoc.climbs || {},
            },
          });
          batch.update(this.userRef, {
            team: teamRef.id,
            climbs: firebase.firestore.FieldValue.delete(),
          });
          return batch.commit();
        })
        .then(
          () => {
            // Update the UI to reflect the change.
            // TODO: Just watch userDoc.team instead?
            this.teamRef = teamRef;
            this.$bind('teamDoc', teamRef);
            this.joinDialogShown = false;
            this.joinInviteCode = '';
          },
          err => {
            // TODO: Surface to the user.
            console.log('Failed to join team:', err);
          }
        )
        .finally(() => {
          this.joiningTeam = false;
        });
    },

    // Leaves the current team when the "Leave team" button is clicked in the
    // "Leave team" dialog.
    leaveTeam() {
      if (this.leavingTeam) return;
      this.leavingTeam = true;

      const uid = auth.currentUser.uid;

      // Grab the user's climbs from the team doc.
      let climbs = {};
      const userData = this.teamDoc.users[uid];
      if (userData && userData.climbs) {
        climbs = userData.climbs;
      }

      // Perform a batched update that removes the user from the team doc and
      // removes the team from the user doc.
      const batch = db.batch();
      batch.update(this.teamRef, {
        ['users.' +
        auth.currentUser.uid]: firebase.firestore.FieldValue.delete(),
      });
      batch.update(this.userRef, {
        team: firebase.firestore.FieldValue.delete(),
        // Move the climbs back from the team doc to the user doc.
        climbs: climbs,
      });
      batch
        .commit()
        .then(
          () => {
            // Update the UI to reflect the change.
            // TODO: Just watch userDoc.team instead?
            this.$unbind('teamDoc');
            // $unbind's 'reset' attribute doesn't seem to work correctly.
            // Often this.teamDoc ends up being null instead of an empty object.
            this.teamDoc = {};
            this.teamRef = null;
            this.leaveDialogShown = false;
          },
          err => {
            // TODO: Surface to the user.
            console.log('Failed to leave team:', err);
          }
        )
        .finally(() => {
          this.leavingTeam = false;
        });
    },
  },

  mounted() {
    bindUserAndTeamDocs(this, auth.currentUser.uid, 'userDoc', 'teamDoc');
  },
};
</script>

<style scoped>
.no-team-text {
  font-size: 16px;
}
.member-name {
  font-size: 16px;
}
.invite-code {
  font-size: 24px;
  letter-spacing: 0.1em;
}
</style>
