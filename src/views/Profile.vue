<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-container v-if="userLoaded">
    <Card :title="$t('Profile.individualTitle')">
      <v-spacer class="mt-3" />
      <v-form v-model="userNameValid" @submit.prevent>
        <!-- It's exceedingly unfortunate that all of these elements have
             nearly-identical 'id' and 'ref' attributes. Refs are nice since
             they still work if there are multiple instances of a component, but
             we need IDs to be able to access elements from end-to-end tests --
             refs are only used by Vue and don't even end up in the DOM. Ideally
             we could also use IDs in unit tests and not define refs, but
             vue-test-utils' Wrapper class frequently fails to find elements by
             ID while still being able to find them by ref. Sigh. -->
        <v-text-field
          id="profile-user-name-field"
          ref="userNameField"
          :value="userDoc.name"
          :counter="nameMaxLength"
          :rules="nameRules"
          :label="$t('Profile.yourNameLabel')"
          @change="updateUserName"
        />
      </v-form>
    </Card>

    <Card :title="$t('Profile.teamTitle')" class="mt-0">
      <v-spacer class="mt-3" />

      <!-- User is on a team -->
      <template v-if="teamDoc && teamDoc.users">
        <v-form v-model="teamNameValid" @submit.prevent>
          <v-text-field
            id="profile-team-name-field"
            ref="teamNameField"
            :value="teamDoc.name"
            :counter="nameMaxLength"
            :rules="nameRules"
            :label="$t('Profile.teamNameLabel')"
            @change="updateTeamName"
          />
        </v-form>

        <div class="caption grey--text text--darken-1">
          {{ $t('Profile.teamMembersLabel') }}
        </div>
        <div id="profile-team-members">
          <div v-for="user in teamMembers" :key="user.name" class="member-name">
            {{ user.name }}
            <span v-if="user.left">
              {{ $t('Profile.teamMemberLeftLabel') }}
            </span>
          </div>
        </div>

        <v-divider class="mt-2 mb-4" />

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
                :small="useSmallButtons"
                color="primary"
                v-on="on"
              >
                {{ $t('Profile.showInviteCodeButton') }}
              </v-btn>
            </template>

            <DialogCard :title="$t('Profile.inviteCodeTitle')">
              <v-card-text>
                <div class="invite-code mb-2">
                  {{ teamDoc.invite }}
                </div>
                <div>{{ $t('Profile.inviteCodeText') }}</div>
              </v-card-text>

              <v-divider />
              <v-card-actions>
                <v-spacer />
                <v-btn
                  id="profile-invite-dismiss-button"
                  text
                  color="primary"
                  @click="inviteDialogShown = false"
                >
                  {{ $t('Profile.dismissButton') }}
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
                :small="useSmallButtons"
                text
                color="error"
                v-on="on"
              >
                {{ $t('Profile.leaveTeamButton') }}
              </v-btn>
            </template>

            <DialogCard title="Leave team">
              <v-card-text>{{ $t('Profile.leaveTeamText') }}</v-card-text>

              <v-divider />
              <v-card-actions>
                <v-btn text @click="leaveDialogShown = false">
                  {{ $t('Profile.cancelButton') }}
                </v-btn>
                <v-spacer />
                <v-btn
                  id="profile-leave-confirm-button"
                  ref="leaveConfirmButton"
                  text
                  color="error"
                  :disabled="leavingTeam"
                  @click="leaveTeam"
                >
                  {{ $t('Profile.leaveTeamButton') }}
                </v-btn>
              </v-card-actions>
            </DialogCard>
          </v-dialog>
        </v-card-actions>
      </template>

      <!-- User is not on a team -->
      <template v-else>
        <div class="no-team-text mt-2">{{ $t('Profile.notOnTeamText') }}</div>

        <v-divider class="mt-2 mb-4" />

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
                :small="useSmallButtons"
                color="primary"
                v-on="on"
              >
                {{ $t('Profile.joinTeamButton') }}
              </v-btn>
            </template>

            <DialogCard :title="$t('Profile.joinTeamTitle')">
              <v-card-text>
                <div>
                  {{ $t('Profile.joinTeamText', [inviteCodeLength]) }}
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
                    v-mask="'#'.repeat(inviteCodeLength)"
                    :counter="inviteCodeLength"
                    :rules="joinInviteCodeRules"
                    :label="$t('Profile.inviteCodeLabel')"
                    type="tel"
                    class="mt-2"
                    autofocus
                    required
                  />
                </v-form>
              </v-card-text>

              <v-divider />
              <v-card-actions>
                <v-btn text @click="joinDialogShown = false">
                  {{ $t('Profile.cancelButton') }}
                </v-btn>
                <v-spacer />
                <v-btn
                  id="profile-join-confirm-button"
                  ref="joinConfirmButton"
                  :disabled="!joinTeamValid || joiningTeam"
                  color="primary"
                  text
                  @click="joinTeam"
                >
                  {{ $t('Profile.joinTeamButton') }}
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
                :small="useSmallButtons"
                color="primary"
                v-on="on"
              >
                {{ $t('Profile.createTeamButton') }}
              </v-btn>
            </template>

            <DialogCard :title="$t('Profile.createTeamTitle')">
              <v-card-text>
                <div>{{ $t('Profile.createTeamText') }}</div>
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
                    :label="$t('Profile.teamNameLabel')"
                    class="mt-2"
                    autofocus
                    required
                  />
                </v-form>
              </v-card-text>

              <v-divider />
              <v-card-actions>
                <v-btn text @click="createDialogShown = false">
                  {{ $t('Profile.cancelButton') }}
                </v-btn>
                <v-spacer />
                <v-btn
                  id="profile-create-confirm-button"
                  ref="createConfirmButton"
                  :disabled="!createTeamValid || creatingTeam"
                  color="primary"
                  text
                  @click="createTeam"
                >
                  {{ $t('Profile.createTeamButton') }}
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
// @ts-ignore: No TypeScript definitions for vue-the-mask. :-/
import { mask } from 'vue-the-mask';
import firebase from 'firebase/app';

import { app } from '@/firebase';
import { logInfo, logError } from '@/log';
import { TeamSize, TeamUserData } from '@/models';

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
  directives: { mask },
})
export default class Profile extends Mixins(Perf, UserLoader) {
  // Maximum length of user and team names.
  readonly nameMaxLength = 50;

  // Rules for user and team name inputs. Handle undefined values since some
  // text fields are bound to fields in Firestore docs.
  get nameRules() {
    return [
      (v?: string) =>
        (v && !!v.trim().length) || this.$t('Profile.nameEmptyRule'),
      (v?: string) =>
        !v ||
        v.length <= this.nameMaxLength ||
        this.$t('Profile.nameTooLongRule', [this.nameMaxLength]),
    ];
  }

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
  get joinInviteCodeRules() {
    return [
      (v: string) =>
        (v && v.length == this.inviteCodeLength) ||
        this.$t('Profile.inviteCodeLengthRule', [this.inviteCodeLength]),
    ];
  }

  // Model for "Show invite code" dialog visibility.
  inviteDialogShown = false;

  // Model for "Leave team" dialog visibility.
  leaveDialogShown = false;
  // Whether we're in the process of leaving the team.
  leavingTeam = false;

  // Length of invite codes.
  readonly inviteCodeLength = 6;

  // Stably-ordered information about the current team's members.
  get teamMembers(): TeamUserData[] {
    // Sort by UID to get stable ordering.
    return Object.keys(this.teamDoc?.users || {})
      .sort()
      .map((uid) => {
        // Required by TypeScript.
        if (!this.teamDoc.users) return { name: '', climbs: {} };
        return this.teamDoc.users[uid];
      });
  }

  // Whether the user's current team is full.
  get teamFull() {
    return Object.keys(this.teamDoc?.users || {}).length >= TeamSize;
  }

  // Number of climbs that the user has reported for their current team.
  get numClimbs() {
    if (!this.teamDoc || !this.teamDoc.users) return 0;
    const userData = this.teamDoc.users[this.user.uid];
    return userData && userData.climbs
      ? Object.keys(userData.climbs).length
      : 0;
  }

  // Whether small buttons should be used in the view.
  get useSmallButtons() {
    return (
      !window.matchMedia ||
      window.matchMedia('screen and (max-width: 400px)').matches
    );
  }

  // Updates the user's name in Firestore when the user name input is changed.
  updateUserName(name: string) {
    // Clean up the input first.
    name = cleanName(name);
    if (!this.userNameValid || !name.length) {
      this.$emit('error-msg', this.$t('Profile.invalidUserNameError'));
      return;
    }

    new Promise((resolve) => {
      logInfo('set_user_name', { name: name });
      if (!this.userRef) throw new Error('No ref to user doc');
      const batch = app.firestore().batch();
      batch.update(this.userRef, { name: name });
      if (this.teamRef) {
        const key = 'users.' + this.user.uid + '.name';
        batch.update(this.teamRef, { [key]: name });
      }
      resolve(batch.commit());
    }).catch((err) => {
      this.$emit(
        'error-msg',
        this.$t('Profile.failedSettingUserNameError', [err.message])
      );
      logError('set_user_name_failed', err);
    });
  }

  // Updates the team's name in Firestore when the team name input is changed.
  updateTeamName(name: string) {
    // Clean up the input first.
    name = cleanName(name);
    if (!this.teamNameValid || !name.length) {
      this.$emit('error-msg', this.$t('Profile.invalidTeamNameError'));
      return;
    }

    new Promise((resolve) => {
      logInfo('set_team_name', { team: this.userDoc.team, name: name });
      if (!this.teamRef) throw new Error('No ref to team doc');
      resolve(this.teamRef.update({ name: name }));
    }).catch((err) => {
      this.$emit(
        'error-msg',
        this.$t('Profile.failedSettingTeamNameError', [err.message])
      );
      logError('set_team_name_failed', err);
    });
  }

  // Creates a new team when the "Create" button is clicked in the "Create
  // team" dialog.
  createTeam() {
    const name = cleanName(this.createTeamName);
    if (!this.createTeamValid || !name.length) {
      this.$emit('error-msg', this.$t('Profile.invalidTeamInfoError'));
      return;
    }

    if (this.creatingTeam) {
      throw new Error(this.$t('Profile.alreadyCreatingTeamError'));
    }
    this.creatingTeam = true;

    this.findUnusedInviteCode()
      .then((inviteCode: string) => {
        logInfo('create_team', { name, invite: inviteCode });

        // Generate an ID for a new team document. This works offline.
        const teamRef = app.firestore().collection('teams').doc();

        // Perform a single batched write that creates the team document, creates
        // an invite document containing the team ID, and updates the user doc to
        // contain the team ID.
        const batch = app.firestore().batch();
        batch.set(teamRef, {
          name,
          users: {
            [this.user.uid]: { name: this.userDoc.name, climbs: {} },
          },
          invite: inviteCode,
        });
        batch.set(app.firestore().collection('invites').doc(inviteCode), {
          team: teamRef.id,
        });

        if (!this.userRef) throw new Error('No ref to user doc');
        batch.update(this.userRef, { team: teamRef.id });
        return batch.commit();
      })
      .then(() => {
        this.createDialogShown = false;
        this.inviteDialogShown = true;
        this.$emit(
          'success-msg',
          this.$t('Profile.createdTeamMessage', [this.createTeamName])
        );
        this.createTeamName = '';
      })
      .catch((err) => {
        this.$emit(
          'error-msg',
          this.$t('Profile.failedCreatingTeamError', [err.message])
        );
        logError('create_team_failed', err);
      })
      .finally(() => {
        this.creatingTeam = false;
      });
  }

  // Joins a team when the "Join" button is clicked in the "Join team" dialog.
  joinTeam() {
    if (!this.joinTeamValid) {
      this.$emit('error-msg', this.$t('Profile.invalidTeamInfoError'));
      return;
    }

    if (this.joiningTeam) {
      throw new Error(this.$t('Profile.alreadyJoiningTeamError'));
    }
    this.joiningTeam = true;

    logInfo('join_team', { invite: this.joinInviteCode });

    // We need to access these throughout the promise chain.
    let teamRef: firebase.firestore.DocumentReference | null;
    let teamName = '';

    // First get the invite doc to find the team ID.
    app
      .firestore()
      .collection('invites')
      .doc(this.joinInviteCode)
      .get()
      .then((inviteSnap) => {
        // Now get the team doc.
        const data = inviteSnap.data();
        if (!data) {
          throw new Error(this.$t('Profile.badInviteCodeError'));
        }
        const team = data.team;
        if (!team) throw new Error('No team ID in invite');
        teamRef = app.firestore().collection('teams').doc(data.team);
        return teamRef.get();
      })
      .then((teamSnap) => {
        // These checks are required by TypeScript.
        if (!this.userRef) throw new Error('No ref to user doc');
        if (!teamRef) throw new Error('No ref to team doc');

        teamName = teamSnap.get('name');

        // Update the team doc and the user doc atomically.
        const batch = app.firestore().batch();

        const uid = this.user.uid;
        const users = teamSnap.get('users');
        if (users && users[uid]) {
          // If we're already listed as a member of the team, presumably we left
          // it earlier after reporting some climbs. Update our name and mark us
          // as no longer having left.
          batch.update(teamRef, {
            [`users.${uid}.name`]: this.userDoc.name,
            [`users.${uid}.left`]: firebase.firestore.FieldValue.delete(),
          });
        } else if (Object.keys(users).length < TeamSize) {
          // Otherwise, we're joining the team for the first time.
          batch.update(teamRef, {
            [`users.${uid}`]: { name: this.userDoc.name, climbs: {} },
          });
        } else {
          throw new Error(this.$t('Profile.teamFullError'));
        }

        batch.update(this.userRef, { team: teamRef.id });
        return batch.commit();
      })
      .then(() => {
        this.joinDialogShown = false;
        this.joinInviteCode = '';
        this.$emit(
          'success-msg',
          this.$t('Profile.joinedTeamMessage', [teamName])
        );
      })
      .catch((err) => {
        this.$emit(
          'error-msg',
          this.$t('Profile.failedJoiningTeamError', [err.message])
        );
        logError('join_team_failed', err);
      })
      .finally(() => {
        this.joiningTeam = false;
      });
  }

  // Leaves the current team when the "Leave team" button is clicked in the
  // "Leave team" dialog.
  leaveTeam() {
    if (this.leavingTeam) {
      throw new Error(this.$t('Profile.alreadyLeavingTeamError'));
    }
    this.leavingTeam = true;

    // Grab this before leaving so we can use it in a message later.
    const teamName = this.teamDoc?.name || '';

    new Promise((resolve) => {
      if (!this.userRef) throw new Error('No user ref');
      if (!this.teamRef) throw new Error('No team ref');

      logInfo('leave_team', { team: this.teamRef.id });

      // Perform a batched update that updates the team and user docs.
      const batch = app.firestore().batch();

      const uid = this.user.uid;
      if (this.numClimbs != 0) {
        // If we already reported climbs, preserve our user entry and mark us as
        // having left.
        batch.update(this.teamRef, { [`users.${uid}.left`]: true });
      } else {
        // Otherwise, delete our user entry so someone else can take our place.
        batch.update(this.teamRef, {
          [`users.${uid}`]: firebase.firestore.FieldValue.delete(),
        });
      }

      batch.update(this.userRef, {
        team: firebase.firestore.FieldValue.delete(),
      });
      resolve(batch.commit());
    })
      .then(() => {
        this.$emit(
          'success-msg',
          this.$t('Profile.leftTeamMessage', [teamName])
        );
        this.leaveDialogShown = false;
      })
      .catch((err) => {
        this.$emit(
          'error-msg',
          this.$t('Profile.failedLeavingTeamError', [err.message])
        );
        logError('leave_team_failed', err);
      })
      .finally(() => {
        this.leavingTeam = false;
      });
  }

  // Helper method for createTeam() that returns a promise for a new, unused
  // invite code.
  findUnusedInviteCode(remainingTries = 9): Promise<string> {
    // We get a string like "0.4948219742736113" and then chop off the left.
    const code = Math.random()
      .toString()
      .slice(2, 2 + this.inviteCodeLength);

    // Check if the code is already taken. If it is, call ourselves again.
    return app
      .firestore()
      .collection('invites')
      .doc(code)
      .get()
      .then((snap) => {
        if (!snap.exists) return code;
        if (remainingTries == 0) {
          throw new Error(this.$t('Profile.cantFindUnusedCodeError'));
        }
        return this.findUnusedInviteCode(remainingTries - 1);
      });
  }

  @Watch('userLoaded')
  onUserLoaded(val: boolean) {
    if (val) this.logReady('profile_loaded');
  }

  @Watch('userLoadError')
  onUserLoadError(err: Error) {
    this.$emit(
      'error-msg',
      this.$t('Profile.failedLoadingDataError', [err.message])
    );
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
