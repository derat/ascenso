<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-container v-if="userLoaded" grid-list-md text-ms-center>
    <Card :title="$t('individual')">
      <v-layout row>
        <v-flex>
          <v-form v-model="userNameValid" @submit.prevent>
            <!-- It's exceedingly unfortunate that all of these elements have
                 nearly-identical 'id' and 'ref' attributes. Refs are nice since
                 they still work if there are multiple instances of a component,
                 but we need IDs to be able to access elements from end-to-end
                 tests -- refs are only used by Vue and don't even end up in the
                 DOM. Ideally we could also use IDs in unit tests and not define
                 refs, but vue-test-utils' Wrapper class frequently fails to
                 find elements by ID while still being able to find them by ref.
                 Sigh. -->
            <v-text-field
              id="profile-user-name-field"
              ref="userNameField"
              :value="userDoc.name"
              :counter="nameMaxLength"
              :rules="nameRules"
              :label="$t('yourName')"
              @change="updateUserName"
            />
          </v-form>
        </v-flex>
      </v-layout>
    </Card>

    <Card :title="$t('team')" class="mt-3">
      <!-- User is on a team -->
      <template v-if="teamDoc && teamDoc.users">
        <v-layout row>
          <v-flex>
            <v-form v-model="teamNameValid" @submit.prevent>
              <v-text-field
                id="profile-team-name-field"
                ref="teamNameField"
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
            <div v-for="name in teamUserNames" :key="name" class="member-name">
              {{ name }}
            </div>
          </v-flex>
        </v-layout>

        <v-divider class="mt-2 mb-3" />

        <v-card-actions class="pa-0">
          <!-- "Show invite code" button and dialog -->
          <v-dialog
            ref="inviteDialog"
            v-model="inviteDialogShown"
            max-width="512px"
          >
            <template v-slot:activator="{ on }">
              <v-btn
                id="profile-invite-button"
                ref="inviteButton"
                :disabled="teamFull"
                color="primary"
                v-on="on"
              >
                Show invite code
              </v-btn>
            </template>

            <DialogCard title="Invite code">
              <v-card-text>
                <div class="invite-code mb-2">
                  {{ teamDoc.invite }}
                </div>
                <div>
                  Your teammate can enter this code in their profile to join
                  your team. Don't show it to anyone else.
                </div>
              </v-card-text>

              <v-card-actions>
                <v-spacer />
                <v-btn
                  id="profile-invite-dismiss-button"
                  flat
                  color="primary"
                  @click="inviteDialogShown = false"
                >
                  Dismiss
                </v-btn>
              </v-card-actions>
            </DialogCard>
          </v-dialog>

          <v-spacer />

          <!-- "Leave team" button and dialog -->
          <v-dialog
            ref="leaveDialog"
            v-model="leaveDialogShown"
            max-width="512px"
          >
            <template v-slot:activator="{ on }">
              <v-btn
                id="profile-leave-button"
                ref="leaveButton"
                flat
                color="error"
                v-on="on"
                >Leave team</v-btn
              >
            </template>

            <DialogCard title="Leave team">
              <v-card-text>
                Are you sure you want to leave your team?
              </v-card-text>

              <v-card-actions>
                <v-btn flat color="primary" @click="leaveDialogShown = false">
                  Cancel
                </v-btn>
                <v-spacer />
                <v-btn
                  id="profile-leave-confirm-button"
                  ref="leaveConfirmButton"
                  flat
                  color="error"
                  :disabled="leavingTeam"
                  @click="leaveTeam"
                >
                  Leave team
                </v-btn>
              </v-card-actions>
            </DialogCard>
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
          <v-dialog
            ref="joinDialog"
            v-model="joinDialogShown"
            max-width="512px"
          >
            <template v-slot:activator="{ on }">
              <v-btn
                id="profile-join-button"
                ref="joinButton"
                color="primary"
                v-on="on"
                >Join team</v-btn
              >
            </template>

            <DialogCard title="Join team">
              <v-card-text>
                <div>
                  Ask your teammate to give you the {{ inviteCodeLength }}-digit
                  invite code from their profile page.
                </div>
                <v-form
                  ref="joinForm"
                  v-model="joinTeamValid"
                  @submit.prevent="joinTeam"
                >
                  <!-- The v-if fixes autofocus on reopen. See
                       https://github.com/vuetifyjs/vuetify/issues/1731 -->
                  <!-- Use type="tel" instead of "number" since the latter
                       doesn't support supplying a mask:
                       https://github.com/vuetifyjs/vuetify/issues/3282 -->
                  <v-text-field
                    id="profile-join-code-field"
                    ref="joinCodeField"
                    v-model="joinInviteCode"
                    v-if="joinDialogShown"
                    :mask="inviteCodeMask"
                    :counter="inviteCodeLength"
                    :rules="joinInviteCodeRules"
                    label="Invite code"
                    type="tel"
                    class="mt-2"
                    autofocus
                    required
                  />
                </v-form>
              </v-card-text>

              <v-card-actions>
                <v-spacer />
                <v-btn
                  id="profile-join-confirm-button"
                  ref="joinConfirmButton"
                  :disabled="!joinTeamValid || joiningTeam"
                  color="primary"
                  flat
                  @click="joinTeam"
                >
                  Join
                </v-btn>
              </v-card-actions>
            </DialogCard>
          </v-dialog>

          <!-- Push buttons to left and right side -->
          <v-spacer />

          <!-- "Create team" button and dialog -->
          <v-dialog
            ref="createDialog"
            v-model="createDialogShown"
            max-width="512px"
          >
            <template v-slot:activator="{ on }">
              <v-btn
                id="profile-create-button"
                ref="createButton"
                color="primary"
                v-on="on"
                >Create team</v-btn
              >
            </template>

            <DialogCard title="Create team">
              <v-card-text>
                <div>
                  After creating a new team, you'll get an invite code to give
                  to your teammate so they can join.
                </div>
                <v-form
                  ref="createForm"
                  v-model="createTeamValid"
                  @submit.prevent="createTeam"
                >
                  <v-text-field
                    id="profile-create-name-field"
                    ref="createNameField"
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
                  id="profile-create-confirm-button"
                  ref="createConfirmButton"
                  :disabled="!createTeamValid || creatingTeam"
                  color="primary"
                  flat
                  @click="createTeam"
                >
                  Create
                </v-btn>
              </v-card-actions>
            </DialogCard>
          </v-dialog>
        </v-card-actions>
      </template>
    </Card>
  </v-container>
  <Spinner v-else />
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { logInfo, logError } from '@/log';
import { ClimbState } from '@/models';

import Card from '@/components/Card.vue';
import DialogCard from '@/components/DialogCard.vue';
import Perf from '@/mixins/Perf';
import Spinner from '@/components/Spinner.vue';
import UserLoader from '@/mixins/UserLoader';

// Removes excessive/weird whitespace from |name|.
function cleanName(name: string): string {
  return name.replace(/\s+/gm, ' ').trim();
}

@Component({
  components: { Card, DialogCard, Spinner },
})
export default class Profile extends Mixins(Perf, UserLoader) {
  // Maximum length of user and team names.
  readonly nameMaxLength = 50;

  // Rules for user and team name inputs.
  readonly nameRules = [
    (v: string) => !!v || 'Name must not be empty',
    (v: string) =>
      !v ||
      v.length <= this.nameMaxLength ||
      'Name must be ' + this.nameMaxLength + ' characters or shorter',
  ];

  // Whether the user and team name text fields contain valid input.
  userNameValid = false;
  teamNameValid = false;

  // Model for "Create team" dialog visibility.
  createDialogShown = false;
  // Whether "Create team" form contains valid input.
  createTeamValid = false;
  // Model for team name input in "Create team" dialog.
  createTeamName = '';
  // Whether we're in the process of creating a team.
  creatingTeam = false;

  // Model for "Join team" dialog visibility.
  joinDialogShown = false;
  // Whether "Join team" form contains valid input.
  joinTeamValid = false;
  // Model for invite code input in "Join team" dialog.
  joinInviteCode = '';
  // Whether we're in the process of joining a team.
  joiningTeam = false;
  // Rules for invite code input.
  readonly joinInviteCodeRules = [
    (v: string) =>
      (v && v.length == this.inviteCodeLength) ||
      'Code must be ' + this.inviteCodeLength + ' digits',
  ];

  // Model for "Show invite code" dialog visibility.
  inviteDialogShown = false;

  // Model for "Leave team" dialog visibility.
  leaveDialogShown = false;
  // Whether we're in the process of leaving the team.
  leavingTeam = false;

  // Length of invite codes.
  readonly inviteCodeLength = 6;
  // Number of users on a full team.
  static readonly teamSize = 2;

  // Input mask passed to <v-text-input> for invite code.
  get inviteCodeMask() {
    return '#'.repeat(this.inviteCodeLength);
  }

  // Stably-ordered names of team members.
  get teamUserNames() {
    if (!this.teamDoc || !this.teamDoc.users) return [];

    // Sort by UID to get stable ordering.
    return Object.keys(this.teamDoc.users)
      .sort()
      .map(uid => {
        if (!this.teamDoc.users) return ''; // required by TypeScript
        const data = this.teamDoc.users[uid];
        return data && data.name ? data.name : '';
      });
  }

  // Whether the team is currently full.
  get teamFull() {
    return (
      this.teamDoc &&
      this.teamDoc.users &&
      Object.keys(this.teamDoc.users).length >= Profile.teamSize
    );
  }

  // Updates the user's name in Firestore when the user name input is changed.
  updateUserName(name: string) {
    // Clean up the input first.
    name = cleanName(name);
    if (!this.userNameValid || !name.length) {
      this.$emit('error-msg', 'Invalid user name');
      return;
    }

    new Promise(resolve => {
      logInfo('set_user_name', { name: name });
      if (!this.userRef) throw new Error('No ref to user doc');
      const batch = this.firestore.batch();
      batch.update(this.userRef, { name: name });
      if (this.teamRef) {
        const key = 'users.' + this.user.uid + '.name';
        batch.update(this.teamRef, { [key]: name });
      }
      resolve(batch.commit());
    }).catch(err => {
      this.$emit('error-msg', `Failed setting user name: ${err.message}`);
      logError('set_user_name_failed', err);
    });
  }

  // Updates the team's name in Firestore when the team name input is changed.
  updateTeamName(name: string) {
    // Clean up the input first.
    name = cleanName(name);
    if (!this.teamNameValid || !name.length) {
      this.$emit('error-msg', 'Invalid team name');
      return;
    }

    new Promise(resolve => {
      logInfo('set_team_name', { team: this.userDoc.team, name: name });
      if (!this.teamRef) throw new Error('No ref to team doc');
      resolve(this.teamRef.update({ name: name }));
    }).catch(err => {
      this.$emit('error-msg', `Failed setting team name: ${err.message}`);
      logError('set_team_name_failed', err);
    });
  }

  // Creates a new team when the "Create" button is clicked in the "Create
  // team" dialog.
  createTeam() {
    if (!this.createTeamValid) {
      this.$emit('error-msg', 'Invalid team information');
      return;
    }

    if (this.creatingTeam) throw new Error('Already creating team');
    this.creatingTeam = true;

    this.findUnusedInviteCode()
      .then((inviteCode: string) => {
        logInfo('create_team', {
          name: this.createTeamName,
          invite: inviteCode,
        });

        // Generate an ID for a new team document. This works offline.
        const teamRef = this.firestore.collection('teams').doc();

        // Perform a single batched write that creates the team document, creates
        // an invite document containing the team ID, and updates the user doc to
        // contain the team ID.
        const batch = this.firestore.batch();
        batch.set(teamRef, {
          name: this.createTeamName,
          users: {
            [this.user.uid]: {
              name: this.userDoc.name,
              climbs: this.userDoc.climbs || {},
            },
          },
          invite: inviteCode,
        });
        batch.set(this.firestore.collection('invites').doc(inviteCode), {
          team: teamRef.id,
        });

        if (!this.userRef) throw new Error('No ref to user doc');
        batch.update(this.userRef, {
          team: teamRef.id,
          // The user's climbs are now stored in the team doc. We do this to avoid
          // needing to write to both the team and user doc every time the user
          // completes another climb, and also to prevent needing to let user A
          // write to teammate B's user doc if A reports a climb performed by B.
          climbs: this.firebase.firestore.FieldValue.delete(),
        });
        return batch.commit();
      })
      .then(() => {
        this.createDialogShown = false;
        this.inviteDialogShown = true;
        this.$emit(
          'success-msg',
          `Created and joined "${this.createTeamName}"`
        );
        this.createTeamName = '';
      })
      .catch(err => {
        this.$emit('error-msg', `Failed creating team: ${err.message}`);
        logError('create_team_failed', err);
      })
      .finally(() => {
        this.creatingTeam = false;
      });
  }

  // Joins a team when the "Join" button is clicked in the "Join team" dialog.
  joinTeam() {
    if (!this.joinTeamValid) {
      this.$emit('error-msg', 'Invalid team information');
      return;
    }

    if (this.joiningTeam) throw new Error('Already joining team');
    this.joiningTeam = true;

    logInfo('join_team', { invite: this.joinInviteCode });

    // We need to access these throughout the promise chain.
    let teamRef: firebase.firestore.DocumentReference | null;
    let teamName = '';

    // First get the invite doc to find the team ID.
    this.firestore
      .collection('invites')
      .doc(this.joinInviteCode)
      .get()
      .then(inviteSnap => {
        // Now get the team doc.
        const data = inviteSnap.data();
        if (!data) throw new Error('Bad invite code');
        const team = data.team;
        if (!team) throw new Error('No team ID in invite');
        teamRef = this.firestore.collection('teams').doc(data.team);
        return teamRef.get();
      })
      .then(teamSnap => {
        // These checks are required by TypeScript.
        if (!this.userRef) throw new Error('No ref to user doc');
        if (!teamRef) throw new Error('No ref to team doc');

        if (Object.keys(teamSnap.get('users')).length >= Profile.teamSize) {
          throw new Error('Team is full');
        }
        teamName = teamSnap.get('name');

        // Update the team doc and the user doc.
        const batch = this.firestore.batch();
        batch.update(teamRef, {
          ['users.' + this.user.uid]: {
            name: this.userDoc.name,
            climbs: this.userDoc.climbs || {},
          },
        });
        batch.update(this.userRef, {
          team: teamRef.id,
          climbs: this.firebase.firestore.FieldValue.delete(),
        });
        return batch.commit();
      })
      .then(() => {
        this.joinDialogShown = false;
        this.joinInviteCode = '';
        this.$emit('success-msg', `Joined "${teamName}"`);
      })
      .catch(err => {
        this.$emit('error-msg', `Failed joining team: ${err.message}`);
        logError('join_team_failed', err);
      })
      .finally(() => {
        this.joiningTeam = false;
      });
  }

  // Leaves the current team when the "Leave team" button is clicked in the
  // "Leave team" dialog.
  leaveTeam() {
    if (this.leavingTeam) throw new Error('Already leaving team');
    this.leavingTeam = true;

    logInfo('leave_team', {});

    // Grab this before leaving so we can use it in a message later.
    const teamName = this.teamDoc.name;

    new Promise(resolve => {
      if (!this.userRef) throw new Error('No user ref');
      if (!this.teamRef) throw new Error('No team ref');

      // Grab the user's climbs from the team doc.
      const uid = this.user.uid;
      let climbs: Record<string, ClimbState> = {};
      const userData = this.teamDoc.users ? this.teamDoc.users[uid] : null;
      if (userData && userData.climbs) {
        climbs = userData.climbs;
      }

      // Perform a batched update that removes the user from the team doc and
      // removes the team from the user doc.
      const batch = this.firestore.batch();
      batch.update(this.teamRef, {
        ['users.' + uid]: this.firebase.firestore.FieldValue.delete(),
      });
      batch.update(this.userRef, {
        team: this.firebase.firestore.FieldValue.delete(),
        // Move the climbs back from the team doc to the user doc.
        climbs: climbs,
      });
      resolve(batch.commit());
    })
      .then(() => {
        this.$emit('success-msg', `Left "${teamName}"`);
        this.leaveDialogShown = false;
      })
      .catch(err => {
        this.$emit('error-msg', `Failed leaving team: ${err.message}`);
        logError('leave_team_failed', err);
      })
      .finally(() => {
        this.leavingTeam = false;
      });
  }

  // Helper method for createTeam() that returns a promise for a new, unused
  // invite code.
  findUnusedInviteCode(remainingTries: number = 9): Promise<string> {
    // We get a string like "0.4948219742736113" and then chop off the left.
    const code = Math.random()
      .toString()
      .slice(2, 2 + this.inviteCodeLength);

    // Check if the code is already taken. If it is, call ourselves again.
    return this.firestore
      .collection('invites')
      .doc(code)
      .get()
      .then(snap => {
        if (!snap.exists) return code;
        if (remainingTries == 0) throw new Error("Can't find unused code");
        return this.findUnusedInviteCode(remainingTries - 1);
      });
  }

  @Watch('userLoaded')
  onUserLoaded(val: boolean) {
    if (val) this.logReady('profile_loaded');
  }

  @Watch('userLoadError')
  onUserLoadError(err: Error) {
    this.$emit('error-msg', `Failed loading data: ${err.message}`);
    logError('profile_load_failed', err);
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
