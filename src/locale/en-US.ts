// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import en from 'vuetify/src/locale/en';

export default {
  $vuetify: en,
  App: {
    // These property names are generated automatically in App.vue based on the
    // names of routes displayed in the main <router-view> component.
    profileTitle: 'Profile',
    routesTitle: 'Routes',
    statsTitle: 'Statistics',
  },
  ClimbDropdown: {
    leadAbbrev: 'L',
    leadItem: 'Lead',
    notClimbedItem: 'Not climbed',
    topRopeAbbrev: 'TR',
    topRopeItem: 'Top-rope',
  },
  Profile: {
    alreadyCreatingTeamError: 'Already creating team',
    alreadyJoiningTeamError: 'Already joining team',
    alreadyLeavingTeamError: 'Already leaving team',
    badInviteCodeError: 'Bad invite code',
    cancelButton: 'Cancel',
    cantFindUnusedCodeError: "Can't find unused code",
    createTeamButton: 'Create team',
    createTeamTitle: 'Create team',
    createTeamText:
      "After creating a new team, you'll get an invite code " +
      'to give to your teammate so they can join.',
    createdTeamMessage: 'Created and joined "{0}"',
    dismissButton: 'Dismiss',
    failedCreatingTeamError: 'Failed creating team: {0}',
    failedJoiningTeamError: 'Failed joining team: {0}',
    failedLeavingTeamError: 'Failed leaving team: {0}',
    failedLoadingDataError: 'Failed loading data: {0}',
    failedSettingTeamNameError: 'Failed setting team name: {0}',
    failedSettingUserNameError: 'Failed setting user name: {0}',
    individualTitle: 'Individual',
    invalidTeamInfoError: 'Invalid team information',
    invalidTeamNameError: 'Invalid team name',
    invalidUserNameError: 'Invalid user name',
    inviteCodeText:
      'Your teammate can enter this code in their profile ' +
      "to join your team. Don't show it to anyone else.",
    inviteCodeLabel: 'Invite code',
    inviteCodeLengthRule: 'Code must be {0} digits',
    inviteCodeTitle: 'Invite code',
    joinedTeamMessage: 'Joined "{0}"',
    joinTeamButton: 'Join team',
    joinTeamText:
      'Ask your teammate to give you the {0}-digit ' +
      'invite code from their profile page.',
    joinTeamTitle: 'Join team',
    leaveTeamButton: 'Leave team',
    leaveTeamText: 'Are you sure you want to leave your team?',
    leftTeamMessage: 'Left {0}',
    nameEmptyRule: 'Name must not be empty',
    nameTooLongRule: 'Name must be {0} characters or shorter',
    notOnTeamText: 'You are not on a team.',
    showInviteCodeButton: 'Invite code', // dropping 'Show' for small screens
    teamFullError: 'Team is full',
    teamMemberLeftLabel: '(left)',
    teamMembersLabel: 'Members',
    teamNameLabel: 'Team name',
    teamTitle: 'Team',
    yourNameLabel: 'Your Name',
  },
  Routes: {
    applyButton: 'Apply',
    cancelButton: 'Cancel',
    competitionEndedMessage: 'Competition ended',
    failedLoadingConfigError: 'Failed loading configuration: {0}',
    failedLoadingRoutesError: 'Failed loading routes: {0}',
    failedLoadingUserOrTeamError: 'Failed loading user or team: {0}',
    failedSettingClimbStateError: 'Failed setting climb state: {0}',
    failedUpdatingFiltersError: 'Failed updating filters: {0}',
    gradeRangeLabel: 'Grades: {0} to {1}',
    offlineUnsupportedMessage: 'Offline mode unsupported',
    routeFiltersTitle: 'Route filters',
    timeUntilStartMessage: '{0} until competition starts',
    timeRemainingMessage: '{0} remaining',
  },
  RoutesNav: {
    filtersButton: 'Filters',
  },
  Statistics: {
    areasClimbedStat: 'Areas climbed',
    climbsCard: 'Climbs',
    failedLoadingRoutesError: 'Failed loading routes: {0}',
    failedLoadingUserOrTeamError: 'Failed loading user or team: {0}',
    heightStat: 'Height (feet)',
    imageClimbs: '0 routes | 1 route | {n} routes',
    imageFeet: '0 feet | 1 foot | {n} feet',
    imagePoints: '0 points | 1 point | {n} points',
    imageTab: 'Image',
    individualTab: 'Individual',
    leadStat: 'Lead',
    otherCard: 'Other',
    pointsCard: 'Points',
    teamTab: 'Team',
    topRopeStat: 'Top-rope',
    totalClimbsStat: 'Total climbs',
    totalPointsStat: 'Total points',
  },
  Toolbar: {
    buildText: 'Build {0}',
    profileItem: 'Profile',
    routesItem: 'Routes',
    signOutCancelButton: 'Cancel',
    signOutConfirmButton: 'Confirm',
    signOutItem: 'Sign out',
    signOutTitle: 'Sign out',
    signOutText: 'Are you sure you want to sign out?',
    statisticsItem: 'Statistics',
  },
};
