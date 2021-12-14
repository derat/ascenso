// The .e2e_js directory is created by the "test:e2e" script in package.json,
// and contains JS code produced by transpiling TypeScript code.
const srcDir = '.e2e_js';
const logDir = '.test_artifacts/e2e';

module.exports = {
  // https://nightwatchjs.org/guide/configuration/settings.html
  src_folders: [srcDir + '/tests'],
  page_objects_path: srcDir + '/pages',
  globals_path: srcDir + '/globals.js',
  output_folder: logDir,
  screenshots: {
    enabled: true,
    on_failure: true,
    on_error: true,
    path: logDir,
  },
  webdriver: {
    start_process: true,
    server_path: 'node_modules/.bin/chromedriver',
    port: 9515,
    verbose: true,
    // chromedriver.log is created within this directory.
    log_path: logDir,
  },
  // https://nightwatchjs.org/guide/browser-drivers-setup/chromedriver.html
  test_settings: {
    default: {
      desiredCapabilities: {
        browserName: 'chrome',
        chromeOptions: {
          args: [
            // Needed to prevent random crashes on Cloud Build:
            // https://stackoverflow.com/a/53970825/6882947
            '--disable-dev-shm-usage',
            // Needed for Chrome to start on Cloud Build.
            '--no-sandbox',
          ],
        },
        // Needed to be able to get console messages via getLog():
        // https://stackoverflow.com/q/29443804/
        loggingPrefs: { browser: 'ALL' },
      },
    },
  },
};
