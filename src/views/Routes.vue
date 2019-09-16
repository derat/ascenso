<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <!-- Set 'accordion' here to avoid animating margins between expanded panels
       and their neighbors, which is a Vuetify 2 thing that seems to kill
       performance even on not-slow phones (e.g. Pixel 2). -->
  <!-- TODO: I think that this is probably just a symptom of a more general
       performance regression in Vuetify 2, tracked by
       https://github.com/vuetifyjs/vuetify/issues/8298. Remove it if/when that
       bug is fixed. -->
  <v-expansion-panels v-if="ready" accordion multiple>
    <v-expansion-panel
      v-for="area in sortedData.areas"
      :key="area.id"
      :id="'routes-expand-' + area.id"
    >
      <v-expansion-panel-header class="area">
        {{ area.name }}
      </v-expansion-panel-header>
      <!-- Expansion panel content became lazily-rendered in Vuetify 2. To avoid
           jank whenever the user expands a panel, set 'eager' here so that all
           route lists are rendered upfront. -->
      <!-- TODO: Same comment as above about reevaluating if this is necessary
           after https://github.com/vuetifyjs/vuetify/issues/8298 is fixed. -->
      <v-expansion-panel-content eager>
        <RouteList
          :id="'routes-list-' + area.id"
          :climberInfos="teamFull ? climberInfos : []"
          :routes="area.routes"
          @set-climb-state="onSetClimbState"
        />
      </v-expansion-panel-content>
    </v-expansion-panel>
  </v-expansion-panels>
  <Spinner v-else />
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';

import {
  getFirestore,
  getFirestorePersistence,
  FirestorePersistence,
} from '@/firebase';
import { logInfo, logError } from '@/log';
import {
  ClimberInfo,
  ClimbState,
  SetClimbStateEvent,
  SortedData,
  TeamSize,
} from '@/models';

import Perf from '@/mixins/Perf';
import RouteList from '@/components/RouteList.vue';
import Spinner from '@/components/Spinner.vue';
import UserLoader from '@/mixins/UserLoader';

@Component({
  components: { RouteList, Spinner },
})
export default class Routes extends Mixins(Perf, UserLoader) {
  readonly sortedData: Partial<SortedData> = {};
  // True after information is loaded.
  loadedSortedData = false;

  // Colors associated with climbers.
  static readonly climbColors = ['red', 'indigo'];

  // Sorted UIDs from the team. Empty if the user is not currently on a team.
  get teamMembers(): string[] {
    // Sort by UID to get stable ordering.
    return this.teamDoc.users ? Object.keys(this.teamDoc.users).sort() : [];
  }

  // Info for each climber on the team.
  // Empty if the user is not currently on a team.
  get climberInfos(): ClimberInfo[] {
    return this.teamMembers.map((uid, i) => {
      const data = this.teamDoc.users ? this.teamDoc.users[uid] : null;
      if (!data) throw new Error('No data found for user ' + uid);
      return new ClimberInfo(
        data.name || '',
        data.climbs || {},
        Routes.climbColors[i % Routes.climbColors.length]
      );
    });
  }

  // Returns true if the team is full.
  get teamFull() {
    return (
      this.teamDoc.users && Object.keys(this.teamDoc.users).length == TeamSize
    );
  }

  // Updates team document in response to 'set-climb-state' events from RouteList
  // component.
  onSetClimbState(ev: SetClimbStateEvent) {
    if (ev.index >= this.teamMembers.length) {
      throw new Error('Invalid team member index ' + ev.index);
    }
    const uid = this.teamMembers[ev.index];

    logInfo('set_climb_state', {
      user: uid,
      route: ev.route,
      state: ev.state,
    });

    // Just delete the map entry instead of recording a not-climbed state.
    const value =
      ev.state == ClimbState.NOT_CLIMBED
        ? this.firebase.firestore.FieldValue.delete()
        : ev.state;

    if (!this.teamRef) throw new Error('No ref to team doc');
    this.teamRef
      .update({
        ['users.' + uid + '.climbs.' + ev.route]: value,
      })
      .catch(err => {
        this.$emit('error-msg', `Failed setting climb state: ${err}`);
        logError('set_climb_state_failed', err);
      });
  }

  get ready() {
    return this.loadedSortedData && this.userLoaded;
  }

  @Watch('ready')
  onReady(val: boolean) {
    if (val) this.logReady('routes_loaded');
  }

  @Watch('userLoadError')
  onUserLoadError(err: Error) {
    this.$emit('error-msg', `Failed loading user or team: ${err.message}`);
    logError('routes_load_user_or_team_failed', err);
  }

  mounted() {
    // We can't use this.firestore yet.
    getFirestore().then(db => {
      this.$bind('sortedData', db.collection('global').doc('sortedData')).then(
        () => {
          this.loadedSortedData = true;
          this.recordEvent('loadedSortedData');

          // Display a warning to the user if offline Firestore is unavailable.
          // TODO: Would it be better to just display this once?
          if (getFirestorePersistence() == FirestorePersistence.DISABLED) {
            this.$emit('warning-msg', 'Offline mode unsupported');
          }
        },
        err => {
          this.$emit('error-msg', `Failed loading route data: ${err}`);
          logError('routes_load_sorted_data_failed', err);
        }
      );
    });
  }
}
</script>
