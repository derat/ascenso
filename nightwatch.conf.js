module.exports = {
  // The .e2e_js directory is created by the "test:e2e" script in package.json,
  // and contains JS code produced by transpiling TypeScript code.
  src_folders: ['.e2e_js/tests'],
  globals_path: '.e2e_js/globals.js',
  output_folder: '.e2e_out',
  screenshots: {
    enabled: true,
    on_failure: true,
    on_error: true,
    path: '.e2e_out',
  },
  webdriver: {
    start_process: true,
    server_path: 'node_modules/.bin/chromedriver',
    port: 9515,
  },
  test_settings: {
    default: {
      desiredCapabilities: {
        browserName: 'chrome',
      },
    },
  },
};
