<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div v-if="ready">
    <v-system-bar
      ref="timeMessageSystemBar"
      v-show="timeMessage"
      :color="timeColor"
      class="time-system-bar"
      window
    >
      {{ timeMessage }}
    </v-system-bar>

    <!-- Set 'accordion' here to avoid animating margins between expanded panels
         and their neighbors, which is a Vuetify 2 thing that seems to kill
         performance even on not-slow phones (e.g. Pixel 2). -->
    <!-- TODO: I think that this is probably just a symptom of a more general
         performance regression in Vuetify 2, tracked by
         https://github.com/vuetifyjs/vuetify/issues/8298. Remove it if/when that
         bug is fixed. -->
    <v-expansion-panels accordion multiple>
      <v-expansion-panel
        v-for="area in sortedData.areas"
        :key="area.id"
        :id="'routes-expand-' + area.id"
      >
        <v-expansion-panel-header>
          <v-row no-gutters align="center" justify="space-between">
            <v-col class="area-col">
              <span class="area">{{ area.name }}</span>
              <a
                v-if="area.mpId"
                :href="`https://www.mountainproject.com/area/${area.mpId}`"
                target="_blank"
                class="mp-link"
                @click.stop
              >
                <v-icon class="mp-icon ml-2" :size="20">info</v-icon>
              </a>
            </v-col>
            <v-col class="count mr-6">
              {{ countAvailableRoutes(area.routes) }}
            </v-col>
          </v-row>
        </v-expansion-panel-header>
        <!-- Expansion panel content became lazily-rendered in Vuetify 2. To
             avoid jank whenever the user expands a panel, set 'eager' here so
             that all route lists are rendered upfront. -->
        <!-- TODO: Same comment as above about reevaluating if this is necessary
             after https://github.com/vuetifyjs/vuetify/issues/8298 is fixed.
             -->
        <v-expansion-panel-content eager>
          <RouteList
            :id="'routes-list-' + area.id"
            :climberInfos="teamFull ? climberInfos : []"
            :routes="area.routes"
            :minGrade="minGradeFilter"
            :maxGrade="maxGradeFilter"
            @set-climb-state="onSetClimbState"
          />
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

    <div class="sync" :class="{ active: pendingWrites }">
      <v-icon>sync</v-icon>
      {{ pendingWrites }}
    </div>

    <v-dialog
      ref="filtersDialog"
      v-model="filtersDialogShown"
      max-width="512px"
    >
      <DialogCard :title="$t('Routes.routeFiltersTitle')">
        <v-subheader ref="filtersGradeLabel">{{
          $t('Routes.gradeRangeLabel', [
            filtersDialogGrades[0],
            filtersDialogGrades[1],
          ])
        }}</v-subheader>
        <v-card-text>
          <GradeSlider
            ref="filtersGradeSlider"
            :min="minGrade"
            :max="maxGrade"
            v-model="filtersDialogGrades"
          />
        </v-card-text>

        <!-- TODO: Support filtering by height. -->

        <v-divider />
        <v-card-actions>
          <v-btn text @click="onCancelFilters">
            {{ $t('Routes.cancelButton') }}
          </v-btn>
          <v-spacer />
          <v-btn
            ref="applyFiltersButton"
            text
            color="primary"
            @click="onApplyFilters"
          >
            {{ $t('Routes.applyButton') }}
          </v-btn>
        </v-card-actions>
      </DialogCard>
    </v-dialog>
  </div>
  <Spinner v-else />
</template>

<script lang="ts">
import firebase from 'firebase/app';
import { Component, Mixins, Watch } from 'vue-property-decorator';
import humanizeDuration from 'humanize-duration';

import { app, getFirestorePersistence, FirestorePersistence } from '@/firebase';
import { logInfo, logError } from '@/log';
import {
  ClimberInfo,
  ClimbState,
  Config,
  Grades,
  GradeIndexes,
  Route,
  SetClimbStateEvent,
  SortedData,
  TeamSize,
} from '@/models';

import DialogCard from '@/components/DialogCard.vue';
import GradeSlider from '@/components/GradeSlider.vue';
import Perf from '@/mixins/Perf';
import RouteList from '@/components/RouteList.vue';
import Spinner from '@/components/Spinner.vue';
import UserLoader from '@/mixins/UserLoader';

const secondMs = 1000;
const minuteMs = 60 * secondMs;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs; // hack: not handling DST
const weekMs = 7 * dayMs;

// These functions are exported so they can be exercised by unit tests. Ideally
// we could use a module that lets tests access them without exporting them,
// but:
// - The 'rewire' module is unable to import .vue files.
// - The 'babel-plugin-rewire' module doesn't seem to work with Jest:
//   https://github.com/facebook/create-react-app/issues/5662.

// Formats the supplied duration as a string, e.g. '1 day, 3 hours' or '4 hours,
// 23 minutes'.
// - If longer than a week, we display it with day granularity.
// - If longer than a day, we display it with hour granularity.
// - If longer than an hour, we display it with minute granularity.
// - Otherwise, we display it with second granularity.
export function formatDuration(ms: number, language: string): string {
  let units: humanizeDuration.Unit[];
  if (ms > weekMs) {
    units = ['w', 'd'];
  } else if (ms > dayMs) {
    units = ['d', 'h'];
  } else if (ms > hourMs) {
    units = ['h', 'm'];
  } else {
    units = ['m', 's'];
  }
  return humanizeDuration(ms, { units, language, round: true });
}

// Gets the next timeout for updating the competition time message, given
// |remainMs| until the upcoming event (i.e. competition start or end).
export function getNextTimeout(remainMs: number): number {
  if (remainMs <= 0) throw new Error(`Invalid duration ${remainMs}`);

  // Computes the delay to return.
  // |granularityMs| is the granularity used to display durations.
  // |thresholdMs| is the duration at which we switch to a lower granularity.
  const f = (granularityMs: number, thresholdMs: number) => {
    if (remainMs <= thresholdMs) {
      throw new Error(`Remaining time ${remainMs} <= ${thresholdMs}`);
    }
    // Compute the time until the next update.
    let delayMs = remainMs % granularityMs;

    // If we're more than halfway to the next update (i.e. we're displaying it
    // already), skip it.
    if (delayMs < 0.5 * granularityMs) delayMs += granularityMs;

    // Make sure that we don't wait beyond the threshold.
    return Math.min(remainMs - thresholdMs, delayMs);
  };

  // The granularities and thresholds here correspond to when the strings
  // returned by formatDuration() would change.
  if (remainMs > weekMs) return f(dayMs, weekMs);
  if (remainMs > dayMs) return f(hourMs, dayMs);
  if (remainMs > hourMs) return f(minuteMs, hourMs);
  return f(secondMs, 0);
}

@Component({
  components: { DialogCard, GradeSlider, RouteList, Spinner },
})
export default class Routes extends Mixins(Perf, UserLoader) {
  // Colors associated with climbers.
  static readonly climbColors = ['red', 'indigo'];

  // Cloud Firestore document containing sorted areas and routes.
  readonly sortedData: Partial<SortedData> = {};
  // True after |sortedData| is loaded.
  loadedSortedData = false;

  // Cloud Firestore document containing global configuration.
  readonly config: Partial<Config> = {};
  // True after |config| is loaded.
  loadedConfig = false;
  // Number of pending Firestore writes to update climb states.
  pendingWrites = 0;

  // Minimum and maximum grades of routes in |sortedData|.
  minGrade = Grades[0];
  maxGrade = Grades[Grades.length - 1];

  // Controls whether the filters dialog is shown or not.
  filtersDialogShown = false;
  // Grades currently selected in the filters dialog. These grades may not have
  // been applied yet; the filter data from |userDoc| should be used instead for
  // actually performing filtering.
  filtersDialogGrades = [this.minGrade, this.maxGrade];

  // Describes whether the competition is starting, is ongoing, or has ended.
  // Empty if no message should be displayed.
  timeMessage = '';
  // Vuetify 'color' attribute for v-system-bar used to display |timeMessage|.
  timeColor = '';
  // ID of timeout that calls updateTimeMessage().
  updateTimeMessageTimer = 0;

  // Sorted UIDs from the team. Empty if the user is not currently on a team.
  get teamMembers(): string[] {
    // Sort by UID to get stable ordering.
    return Object.keys(this.teamDoc?.users || {}).sort();
  }

  // Info for each climber on the team.
  // Empty if the user is not currently on a team.
  get climberInfos(): ClimberInfo[] {
    return this.teamMembers.map((uid, i) => {
      const data = this.teamDoc?.users ? this.teamDoc.users[uid] : null;
      if (!data) throw new Error('No data found for user ' + uid);
      return new ClimberInfo(
        data.name || '',
        data.climbs || {},
        Routes.climbColors[i % Routes.climbColors.length]
      );
    });
  }

  // True if the team is full.
  get teamFull() {
    return Object.keys(this.teamDoc?.users || {}).length == TeamSize;
  }

  // Minimum and maximum grade filters to pass to RouteList components.
  // Returns undefined if the filter is unset or matches the min/max grade
  // across all routes (making it a no-op).
  get minGradeFilter(): string | undefined {
    return this.userDoc &&
      this.userDoc.filters &&
      this.userDoc.filters.minGrade != this.minGrade
      ? this.userDoc.filters.minGrade
      : undefined;
  }
  get maxGradeFilter(): string | undefined {
    return this.userDoc &&
      this.userDoc.filters &&
      this.userDoc.filters.maxGrade != this.maxGrade
      ? this.userDoc.filters.maxGrade
      : undefined;
  }

  get ready() {
    return this.loadedSortedData && this.loadedConfig && this.userLoaded;
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
        ? firebase.firestore.FieldValue.delete()
        : ev.state;

    if (!this.teamRef) throw new Error('No ref to team doc');
    this.teamRef
      .update({
        ['users.' + uid + '.climbs.' + ev.route]: value,
      })
      .catch((err) => {
        this.$emit(
          'error-msg',
          this.$t('Routes.failedSettingClimbStateError', [err])
        );
        logError('set_climb_state_failed', err);
      });

    this.pendingWrites++;
    app
      .firestore()
      .waitForPendingWrites()
      .then(() => {
        this.pendingWrites--;
      });
  }

  // Returns the number of routes in |routes| that are still available, i.e. not
  // yet climbed by all team members and not filtered out.
  countAvailableRoutes(routes: Route[]) {
    const min = this.minGradeFilter ? GradeIndexes[this.minGradeFilter] : -1;
    const max = this.maxGradeFilter ? GradeIndexes[this.maxGradeFilter] : -1;

    let count = 0;
    for (const r of routes) {
      // Skip routes that are filtered out.
      const i: number | undefined = GradeIndexes[r.grade];
      if ((i !== undefined && min != -1 && i < min) || (max != -1 && i > max)) {
        continue;
      }

      // Skip routes that have been climbed by all team members.
      let climbs = 0;
      for (const info of this.climberInfos) {
        if (!r.id) continue;
        const state: ClimbState | undefined = info.states[r.id];
        if (state !== undefined && state != ClimbState.NOT_CLIMBED) climbs++;
      }
      if (climbs == this.climberInfos.length) continue;

      count++;
    }
    return count;
  }

  @Watch('sortedData')
  onSortedDataChanged() {
    // Update the minimum and maximum grades available for filtering.
    let min = Grades.length - 1;
    let max = 0;
    if (this.sortedData && this.sortedData.areas) {
      for (const a of this.sortedData.areas) {
        if (!a.routes) continue;
        for (const r of a.routes) {
          const i: number | undefined = GradeIndexes[r.grade];
          if (i === undefined) continue;
          min = Math.min(min, i);
          max = Math.max(max, i);
        }
      }
    }

    // If we didn't see any recognizable grades, just use the full range.
    if (min > max) {
      min = 0;
      max = Grades.length - 1;
    }

    // Update the filter for the allowable range.
    this.minGrade = Grades[min];
    this.maxGrade = Grades[max];
    this.filtersDialogGrades = [
      Grades[Math.max(GradeIndexes[this.filtersDialogGrades[0]], min)],
      Grades[Math.min(GradeIndexes[this.filtersDialogGrades[1]], max)],
    ];
  }

  @Watch('ready')
  onReady(val: boolean) {
    if (val) this.logReady('routes_loaded');
  }

  @Watch('userLoadError')
  onUserLoadError(err: Error) {
    this.$emit(
      'error-msg',
      this.$t('Routes.failedLoadingUserOrTeamError', [err.message])
    );
    logError('routes_load_user_or_team_failed', err);
  }

  // Resets the filter dialog to match the filters in the user doc.
  @Watch('userDoc.filters')
  resetFilterDialog() {
    if (this.userDoc && this.userDoc.filters) {
      this.filtersDialogGrades = [
        this.userDoc.filters.minGrade || this.minGrade,
        this.userDoc.filters.maxGrade || this.maxGrade,
      ];
    } else {
      this.filtersDialogGrades = [this.minGrade, this.maxGrade];
    }
  }

  // Called periodically to update |timeMessage| and |timeColor|.
  // Schedules the next call to itself and updates |updateTimeMessageTimer|.
  @Watch('config.startTime')
  @Watch('config.endTime')
  @Watch('$i18n.locale')
  updateTimeMessage() {
    if (this.updateTimeMessageTimer) {
      window.clearTimeout(this.updateTimeMessageTimer);
      this.updateTimeMessageTimer = 0;
    }

    // Start/end times aren't defined.
    if (!this.config.startTime || !this.config.endTime) {
      this.timeMessage = '';
      return;
    }

    const nowMs = Date.now();
    const startMs = this.config.startTime.toMillis();
    const endMs = this.config.endTime.toMillis();

    // We use e.g. 'en-US' as locale names, but humanize-duration wants 'en'.
    const langCode = this.$i18n.locale.split('-')[0];

    if (nowMs < startMs) {
      // Competition hasn't started yet.
      const remainMs = startMs - nowMs;
      this.timeMessage = this.$t('Routes.timeUntilStartMessage', [
        formatDuration(remainMs, langCode),
      ]);
      this.timeColor = 'blue lighten-4';
      this.updateTimeMessageTimer = window.setTimeout(
        this.updateTimeMessage,
        getNextTimeout(remainMs)
      );
    } else if (nowMs < endMs) {
      // Competition is ongoing.
      const remainMs = endMs - nowMs;
      this.timeMessage = this.$t('Routes.timeRemainingMessage', [
        formatDuration(remainMs, langCode),
      ]);
      this.timeColor = 'green lighten-3';
      this.updateTimeMessageTimer = window.setTimeout(
        this.updateTimeMessage,
        getNextTimeout(remainMs)
      );
    } else {
      // Competition ended.
      this.timeMessage = this.$t('Routes.competitionEndedMessage');
      this.timeColor = 'blue-grey lighten-4';
    }
  }

  mounted() {
    const db = app.firestore();
    this.$bind('sortedData', db.collection('global').doc('sortedData')).then(
      () => {
        this.loadedSortedData = true;
        this.recordEvent('loadedSortedData');

        // Display a warning to the user if offline Firestore is unavailable.
        // TODO: Would it be better to just display this once?
        if (getFirestorePersistence() == FirestorePersistence.DISABLED) {
          this.$emit(
            'warning-msg',
            this.$t('Routes.offlineUnsupportedMessage')
          );
        }
      },
      (err) => {
        this.$emit(
          'error-msg',
          this.$t('Routes.failedLoadingRoutesError', [err])
        );
        logError('routes_load_sorted_data_failed', err);
      }
    );

    this.$bind('config', db.collection('global').doc('config')).then(
      () => {
        this.loadedConfig = true;
        this.recordEvent('loadedConfig');
      },
      (err) => {
        this.$emit(
          'error-msg',
          this.$t('Routes.failedLoadingConfigError', [err])
        );
        logError('routes_load_config_failed', err);
      }
    );

    // Listen for events emitted by the RoutesNav view.
    this.$root.$on('show-route-filters', this.onShowFilters);
  }

  beforeDestroy() {
    // Remove the listener so the root view doesn't hold a reference to us and
    // cause a memory leak.
    this.$root.$off('show-route-filters', this.onShowFilters);

    if (this.updateTimeMessageTimer) {
      window.clearTimeout(this.updateTimeMessageTimer);
      this.updateTimeMessageTimer = 0;
    }
  }

  // Handles 'show-route-filters' events.
  onShowFilters() {
    this.filtersDialogShown = true;
  }

  // Handles the 'Cancel' button being clicked in the filters dialog.
  // The dialog is reverted to contain the settings from Cloud Firestore.
  onCancelFilters() {
    this.resetFilterDialog();
    this.filtersDialogShown = false;
  }

  // Handles the 'Apply' button being clicked in the filters dialog.
  // The updated filter settings are saved to Cloud Firestore.
  onApplyFilters() {
    new Promise((resolve) => {
      const min = this.filtersDialogGrades[0];
      const max = this.filtersDialogGrades[1];
      logInfo('update_route_filters', { min, max });
      if (!this.userRef) throw new Error('No ref to user doc');

      // TODO: Should we display some sort of spinner while waiting for this to
      // complete? Should we dismiss the dialog immediately and update in the
      // background?
      const filters: Record<string, any> = {};
      if (min != this.minGrade) filters.minGrade = min;
      if (max != this.maxGrade) filters.maxGrade = max;
      resolve(
        this.userRef.update({
          filters: Object.keys(filters).length
            ? filters
            : firebase.firestore.FieldValue.delete(),
        })
      );
    })
      .catch((err) => {
        this.$emit(
          'error-msg',
          this.$t('Routes.failedUpdatingFiltersError', [err.message])
        );
        logError('update_route_filters_failed', err);
      })
      .finally(() => {
        this.filtersDialogShown = false;
      });
  }
}
</script>

<style scoped>
.time-system-bar {
  overflow: hidden;
  white-space: nowrap;
}

.area-col {
  align-items: center;
  display: flex;
}
.area {
  /* This may not work properly: https://css-tricks.com/flexbox-truncated-text/ */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mp-link {
  text-decoration: none;
}
.mp-icon {
  opacity: 0.5;
}
.count {
  opacity: 0.3;
  text-align: right;
}

.sync {
  background-color: rgba(255, 255, 255, 0);
  bottom: 8px;
  color: #333;
  opacity: 0;
  pointer-events: none;
  position: fixed;
  right: 12px;
  transition: 0.4s linear opacity;
  z-index: 1;
}
.sync.active {
  opacity: 0.5;
  transition: none;
}
</style>
