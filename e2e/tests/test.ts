// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = {
  Test: function(browser) {
    if (!process.env.E2E_URL) throw new Error('E2E_URL undefined');

    // Logs a header at the beginning of a task.
    const task = msg => browser.perform(() => console.log('✏️ ' + msg));

    const userName1 = 'E2E User #1';
    const userName2 = 'E2E User #2';
    const teamName = 'E2E Team';
    const newTeamName = 'E2E Updated Team';

    // Assigned after creating team.
    let inviteCode;

    const areaID = 'pasillo';
    const routeID = 'explore_yosemite';

    const login = browser.page.login();
    const profile = browser.page.profile();
    const routes = browser.page.routes();
    const stats = browser.page.stats();
    const toolbar = browser.page.toolbar();

    task('Loading the app');
    browser.url(process.env.E2E_URL).waitForElementVisible('body');

    task('Signing in');
    login
      .signIn(process.env.E2E_EMAIL_1, process.env.E2E_PASSWORD_1)
      // If the URL is /routes instead, it may indicate that another test
      // instance already signed in with the E2E test user account after this
      // instance deleted the user from Firestore. Disable test concurrency to
      // prevent this from happening.
      .assert.urlContains('/profile');

    task('Changing user name');
    profile.setUserName(userName1);

    task('Creating team');
    profile
      .createTeam(teamName, code => {
        inviteCode = code;
      })
      .checkUserOnTeam(userName1, teamName);

    task('Changing team name');
    profile.setTeamName(newTeamName);

    task('Showing invite code');
    profile.showInviteCode(code => profile.assert.equal(code, inviteCode));

    task('Leaving team');
    profile.leaveTeam();

    task('Re-joining team');
    profile
      // Pass a function so |inviteCode| is initialized before it's used.
      .perform(() => profile.joinTeam(inviteCode))
      .checkUserOnTeam(userName1, newTeamName);

    task('Signing out');
    toolbar.signOut();

    task('Signing in as second user');
    login
      .signIn(process.env.E2E_EMAIL_2, process.env.E2E_PASSWORD_2)
      .assert.urlContains('/profile');

    task('Changing user name');
    profile.setUserName(userName2);

    task('Joining team');
    profile
      .perform(() => profile.joinTeam(inviteCode))
      .checkUserOnTeam(userName1, newTeamName)
      .checkUserOnTeam(userName2, newTeamName);

    task('Climbing a route');
    toolbar.clickNavElement('@routes');
    // Mark the first climber as having led the route.
    // It's arbitrary which team member this is since members are sorted by UID.
    routes.toggleArea(areaID).setClimbState(routeID, 0, 0);

    task('Signing out');
    toolbar.signOut();

    task('Signing back in as first user');
    login
      .signIn(process.env.E2E_EMAIL_1, process.env.E2E_PASSWORD_1)
      .assert.urlContains('/routes');

    task('Checking that route is still climbed');
    routes
      .toggleArea(areaID)
      .getClimbButtonText(routeID, 0, text => routes.assert.equal(text, 'L'));

    task('Checking stats');
    toolbar.clickNavElement('@stats');
    stats
      .getStat(true, 0, 0, (name, value) => {
        stats.assert.equal(name, 'Total points');
        stats.assert.equal(value, '44');
      })
      .getStat(true, 1, 0, (name, value) => {
        stats.assert.equal(name, 'Total climbs');
        stats.assert.equal(value, '1');
      });

    // Uncommenting this can be helpful for debugging after a failure.
    //browser.pause(10000);
  },
};
