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
      <template v-if="userDoc.team">
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
            <div class="member-name">First Person</div>
            <div class="member-name">Second Person</div>
          </v-flex>
        </v-layout>

        <v-divider class="mt-2 mb-3" />

        <v-card-actions class="pa-0">
          <!-- "Show invite code" button and dialog -->
          <v-dialog v-model="inviteDialog">
            <template v-slot:activator="{ on }">
              <v-btn color="primary" v-on="on">Show invite code</v-btn>
            </template>

            <v-card>
              <v-card-title
                class="title grey lighten-2"
                primary-title
              >
                Invite Code
              </v-card-title>

              <v-card-text>
                <div class="invite-code mb-2">123456</div>
                <div>
                  Your teammate can enter this code in their profile to join
                  your team. Don't show it to anyone else.
                </div>
              </v-card-text>

              <v-card-actions>
                <v-spacer />
                <v-btn flat color="secondary" @click="inviteDialog=false">Dismiss</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <v-spacer />

          <!-- "Leave team" button and dialog -->
          <v-dialog v-model="leaveDialog">
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
                  @click="leaveDialog=false"
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
                  Ask your teammate to give you the {{teamIDLength}}-digit
                  invite code from their profile page.
                </div>
                <v-form
                  v-model="joinTeamValid"
                  @submit.prevent="joinTeam"
                >
                  <v-text-field
                    v-model="joinTeamID"
                    :mask="teamIDMask"
                    :counter="teamIDLength"
                    :rules="joinTeamIDRules"
                    label="Invite code"
                    class="mt-2"
                    required
                  />
                </v-form>
              </v-card-text>

              <v-card-actions>
                <v-spacer />
                <v-btn
                  :disabled="!joinTeamValid"
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
          <v-dialog v-model="createDialog">
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
                    :counter="nameMaxLength"
                    :rules="nameRules"
                    label="Team name"
                    class="mt-2"
                    required
                  />
                </v-form>
              </v-card-text>

              <v-card-actions>
                <v-spacer />
                <v-btn
                  :disabled="!createTeamValid"
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
import { auth, db } from '@/firebase';
import Spinner from '@/components/Spinner.vue';

export default {
  components: {
    Spinner,
  },
  computed: {
    teamIDMask: function() { return '#'.repeat(this.teamIDLength) },
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

      createDialog: false,
      createTeamValid: false,
      createTeamName: '',

      joinDialog: false,
      joinTeamValid: false,
      joinTeamID: '',
      joinTeamIDRules: [
        v => (v && v.length == this.teamIDLength) ||
          'Code must be ' + this.teamIDLength + ' digits',
      ],

      inviteDialog: false,
      leaveDialog: false,

      teamIDLength: 6,

      teamDoc: {},
      teamDocRef: null,
      userDoc: {},
      userDocRef: null,
      ready: false,
    }
  },
  methods: {
    updateUserName(name) {
      if (!this.userNameValid) {
        return;
      }
      // TODO: Trim whitespace, discard embedded newlines, etc.?
      this.userDocRef.update({ name: name });
    },
    updateTeamName(name) {
      if (!this.teamNameValid) {
        return;
      }
      // TODO: Implement this.
      console.log("updateTeamName:", name);
    },
    createTeam() {
      if (!this.createTeamValid) {
        return;
      }
      // TODO: Create team.
      this.createDialog = false;
      this.inviteDialog = true;
    },
    joinTeam() {
      if (!this.joinTeamValid) {
        return;
      }
      // TODO: Join team.
      this.joinDialog = false;
    },
    leaveTeam() {
      // TODO: Leave the team.
      this.leaveDialog = false;
    },
  },
  mounted() {
    this.userDocRef = db.collection('users').doc(auth.currentUser.uid);
    this.$bind('userDoc', this.userDocRef).then(() => {
      // TODO: Get team doc.
      this.ready = true;
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
