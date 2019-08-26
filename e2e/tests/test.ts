// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = {
  Test: function(browser) {
    if (!process.env.E2E_URL) throw new Error('E2E_URL undefined');

    // Logs a header at the beginning of a task.
    const task = msg => browser.perform(() => console.log('✏️ ' + msg));

    const userName = 'My Name';
    const teamName = 'My Team';
    const newTeamName = 'Updated Team';

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
      .signIn(process.env.E2E_EMAIL, process.env.E2E_PASSWORD)
      // If the URL is /routes instead, it may indicate that another test
      // instance already signed in with the E2E test user account after this
      // instance deleted the user from Firestore. Disable test concurrency to
      // prevent this from happening.
      .assert.urlContains('/profile');

    task('Changing user name');
    profile.setUserName(userName);

    task('Creating team');
    profile
      .createTeam(teamName, code => {
        inviteCode = code;
      })
      .checkUserOnTeam(userName, teamName);

    task('Changing team name');
    profile.setTeamName(newTeamName);

    task('Showing invite code');
    profile.showInviteCode(code => profile.assert.equal(code, inviteCode));

    task('Leaving team');
    profile.leaveTeam();

    task('Joining team');
    profile
      // Pass a function so |inviteCode| is initialized before it's used.
      .perform(() => profile.joinTeam(inviteCode))
      .checkUserOnTeam(userName, newTeamName);

    task('Climbing a route');
    toolbar.clickNavElement('@routes');
    // Mark the first climber as having led the route.
    routes.toggleArea(areaID).setClimbState(routeID, 0, 0);

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

    task('Signing out');
    toolbar.signOut();

    task('Signing back in');
    login
      .signIn(process.env.E2E_EMAIL, process.env.E2E_PASSWORD)
      .assert.urlContains('/routes');

    task('Checking that route is still climbed');
    routes
      .toggleArea(areaID)
      .getClimbButtonText(routeID, 0, text => routes.assert.equal(text, 'L'));

    // Uncommenting this can be helpful for debugging after a failure.
    //browser.pause(10000);
  },
};
