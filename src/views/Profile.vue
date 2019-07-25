<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-container
    v-if="ready"
    grid-list-md
    text-ms-center
  >
    <!-- "Individual" card -->
    <v-card class="pa-3">
      <div class="caption">Individual</div>
      <v-layout row>
        <v-flex>
          <v-form
            v-model="userNameValid"
            @submit.prevent
          >
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
      <template v-if="!_.isEmpty(teamDoc)">
        <v-layout row>
          <v-flex>
            <v-form
              v-model="teamNameValid"
              @submit.prevent
            >
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
              {{name}}
            </div>
          </v-flex>
        </v-layout>

        <v-divider class="mt-2 mb-3" />

        <v-card-actions class="pa-0">
          <!-- "Show invite code" button and dialog -->
          <v-dialog v-model="inviteDialogShown">
            <template v-slot:activator="{ on }">
              <v-btn
                :disabled="teamFull"
                color="primary"
                v-on="on"
              >
                Show invite code
              </v-btn>
            </template>

            <v-card>
              <v-card-title
                class="title grey lighten-2"
                primary-title
              >
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
                <v-btn
                  flat
                  color="secondary"
                  @click="inviteDialogShown=false"
                >
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
              <v-card-title
                class="title grey lighten-2"
                primary-title
              >
                Leave Team
              </v-card-title>

              <v-card-text>
                Are you sure you want to leave your team?
              </v-card-text>

              <v-card-actions>
                <v-btn
                  flat
                  color="secondary"
                  @click="leaveDialogShown=false"
                >
                  Cancel
                </v-btn>
                <v-spacer />
                <v-btn
                  flat
                  color="error"
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
          <v-dialog v-model="joinDialog">
            <template v-slot:activator="{ on }">
              <v-btn class="primary" v-on="on">Join team</v-btn>
            </template>

            <v-card>
              <v-card-title
                class="title grey lighten-2"
                primary-title
              >
                Join Team
              </v-card-title>

              <v-card-text>
                <div>
                  Ask your teammate to give you the {{inviteCodeLength}}-digit
                  invite code from their profile page.
                </div>
                <v-form
                  v-model="joinTeamValid"
                  @submit.prevent="joinTeam"
                >
                  <!-- The v-if fixes autofocus on reopen. See
                       https://github.com/vuetifyjs/vuetify/issues/1731 -->
                  <v-text-field
                    v-model="joinInviteCode"
                    v-if="joinDialog"
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
              <v-btn class="primary" v-on="on">Create team</v-btn>
            </template>

            <v-card>
              <v-card-title
                class="title grey lighten-2"
                primary-title
              >
                Create Team
              </v-card-title>

              <v-card-text>
                <div>
                  After creating a new team, you'll get an invite code to give
                  to your teammate so they can join.
                </div>
                <v-form
                  v-model="createTeamValid"
                  @submit.prevent="createTeam"
                >
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
                  flat @click="createTeam"
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
import _ from 'lodash';
import firebase from 'firebase/app';
import { auth, db } from '@/firebase';
import Spinner from '@/components/Spinner.vue';

export default {
  components: {
    Spinner,
  },
  computed: {
    _() { return _; },
    inviteCodeMask: function() { return '#'.repeat(this.inviteCodeLength) },
    teamUserNames: function() {
      if (!this.teamDoc.users) {
        return [];
      }
      // Sort by UID to get stable ordering.
      return Object.keys(this.teamDoc.users).sort().map((uid) => {
        return this.teamDoc.users[uid].name;
      });
    },
    teamFull: function() {
      return this.teamDoc.users &&
          Object.keys(this.teamDoc.users).length >= this.teamSize;
    },
  },
  data() {
    return {
      // Share the same rules for user and team names.
      nameMaxLength: 50,
      nameRules: [
        v => !!v || 'Name must not be empty',
        v => (!v || v.length <= this.nameMaxLength) ||
            'Name must be ' + this.nameMaxLength + ' characters or shorter',
      ],

      userNameValid: false,
      teamNameValid: false,

      createDialogShown: false,
      createTeamValid: false,
      createTeamName: '',
      creatingTeam: false,

      joinDialog: false,
      joinTeamValid: false,
      joinInviteCode: '',
      joiningTeam: false,
      joinInviteCodeRules: [
        v => (v && v.length == this.inviteCodeLength) ||
          'Code must be ' + this.inviteCodeLength + ' digits',
      ],

      inviteDialogShown: false,
      leaveDialogShown: false,

      inviteCodeLength: 6,
      teamSize: 2,

      teamDoc: {},
      teamRef: null,
      userDoc: {},
      userRef: null,
      ready: false,
    }
  },
  methods: {
    updateUserName(name) {
      if (!this.userNameValid) {
        return;
      }
      // TODO: Trim whitespace, discard embedded newlines, etc.?
      const batch = db.batch();
      batch.update(this.userRef, { name: name });
      if (this.teamRef) {
        const key = 'users.' + auth.currentUser.uid + '.name';
        batch.update(this.teamRef, { [key]: name });
      }
      batch.commit();
    },

    updateTeamName(name) {
      if (!this.teamNameValid) {
        return;
      }
      // TODO: Trim whitespace, discard embedded newlines, etc.?
      this.teamRef.update({ name: name });
    },

    createTeam() {
      if (!this.createTeamValid || this.creatingTeam) {
        return;
      }
      this.creatingTeam = true;

      const inviteCode =
          Math.random().toString().slice(2, 2 + this.inviteCodeLength);

      // First, create the team doc.
      db.collection('teams').add({
        name: this.createTeamName,
        users: {
          [auth.currentUser.uid]: {
            name: this.userDoc.name,
          },
        },
        invite: inviteCode,
      }).then((teamRef) => {
        // Perform a batched write to add the invite doc and update the user.
        const batch = db.batch();
        batch.set(db.collection('invites').doc(inviteCode), {
          team: teamRef.id,
        });
        batch.update(this.userRef, {
          team: teamRef.id,
        });
        batch.commit().then(() => {
          // Update the UI to reflect the changes.
          this.teamRef = teamRef;
          this.$bind('teamDoc', this.teamRef);
          this.creatingTeam = false;
          this.createDialogShown = false;
          this.createTeamName = '';
          this.inviteDialogShown = true;
        })
      }).catch((err) => {
        // TODO: Surface to the user.
        console.log('Failed to create team:', err);
        this.creatingTeam = false;
      });
    },

    joinTeam() {
      if (!this.joinTeamValid || this.joiningTeam) {
        return;
      }
      this.joiningTeam = true;

      // First get the invite doc to find the team ID.
      const inviteRef = db.collection('invites').doc(this.joinInviteCode);
      inviteRef.get().then((inviteSnap) => {
        // Now get the team doc.
        const teamRef = db.collection('teams').doc(inviteSnap.data().team);
        teamRef.get().then((teamSnap) => {
          if (Object.keys(teamSnap.get('users')).length >= this.teamSize) {
            // TODO: Surface to the user.
            console.log('Team is full');
            this.joiningTeam = false;
            return;
          }

          // Update the team doc and the user doc.
          const batch = db.batch();
          batch.update(teamRef, {
            ['users.' + auth.currentUser.uid]: {
              name: this.userDoc.name,
            },
          });
          batch.update(this.userRef, {team: teamRef.id});
          batch.commit().then(() => {
            // Update the UI to reflect the change.
            this.teamRef = teamRef;
            this.$bind('teamDoc', this.teamRef);
            this.joiningTeam = false;
            this.joinDialog = false;
            this.joinInviteCode = '';
            this.joiningTeam = false;
          }).catch((err) => {
            // TODO: Surface to the user.
            console.log('Failed to join team:', err);
            this.joiningTeam = false;
          });
        });
      }).catch((err) => {
        // TODO: Surface to the user.
        console.log('Failed to get team from invite code:', err);
        this.joiningTeam = false;
      });

      this.joinDialog = false;
    },

    leaveTeam() {
      const uid = auth.currentUser.uid;
      const batch = db.batch();
      this.teamRef.update({
        ['users.' + uid]: firebase.firestore.FieldValue.delete(),
      });
      this.userRef.update({team: firebase.firestore.FieldValue.delete()});
      batch.commit().then(() => {
        this.$unbind('teamDoc');
        this.teamRef = null;
        this.leaveDialogShown = false;
      });
    },
  },

  mounted() {
    this.userRef = db.collection('users').doc(auth.currentUser.uid);
    this.$bind('userDoc', this.userRef).then(() => {
      if (!this.userDoc.team) {
        this.ready = true;
      } else {
        this.teamRef = db.collection('teams').doc(this.userDoc.team);
        this.$bind('teamDoc', this.teamRef).then(() => {
          this.ready = true;
        });
      }
    });
  }
}
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
