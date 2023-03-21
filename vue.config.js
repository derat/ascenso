// Define a variable containing the git commit:
// https://stackoverflow.com/a/38401256/6882947
// https://cli.vuejs.org/guide/mode-and-env.html
//
// Note that this does not dynamically update under "npm run serve".
process.env.VUE_APP_GIT_COMMIT = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString()
  .trim();

module.exports = {
  chainWebpack: (config) => {
    // html-webpack-plugin performs substitution of environment variables in
    // public/index.html, but doesn't touch any other files in the public dir.
    // Tap into copy-webpack-plugin (which is used to copy the dir) and set its
    // 'transform' option to process additional files. See
    // https://cli.vuejs.org/guide/webpack.html#modifying-options-of-a-plugin
    // and https://github.com/vuejs/vue-cli/issues/2436 for more details. 'vue
    // inspect' can be used to see the existing config.
    config.plugin('copy').tap((args) => {
      const options = args[0][0];
      // |content| is a Node buffer: https://nodejs.org/api/buffer.html
      // |path| contains the source file's absolute path.
      options.transform = (content, path) => {
        // Replace '{{ VUE_APP_SOME_ENV_VAR }}' with the value of the
        // corresponding environment variable (defined in .env or .env.local).
        if (path.endsWith('/browserconfig.xml')) {
          content = Buffer.from(
            content.toString().replace(/{{\s*(\S+)\s*}}/g, (match, p1) => {
              const val = process.env[p1];
              if (val === undefined) {
                throw new Error(`Environment variable "${p1}" undefined`);
              }
              return val;
            })
          );
        }
        return content;
      };
      return args;
    });
  },
  devServer: {
    disableHostCheck: true,
  },
  pluginOptions: {
    webpackBundleAnalyzer: {
      openAnalyzer: false,
    },
  },
  pwa: {
    // See https://www.npmjs.com/package/@vue/cli-plugin-pwa.
    //
    // We used to have a checked-in public/manifest.json file with
    // '{{ VUE_APP_SOME_ENV_VAR }}' placeholders that were replaced by the
    // copy-webpack-plugin transformation above, but after cli-plugin-pwa was
    // upgraded from 3.10.0 to 4.1.2, it apparently decided to start reading in
    // public/manifest.json before the transformation and writing
    // dist/manifest.json itself without replacing the placeholders.
    //
    // Setting |manifestOptions| here apparently instructs cli-plugin-pwa to
    // generate dist/manifest.json itself using the provided values.
    // cli-plugin-pwa also injects tags into index.html and uses
    // |workboxOptions| to generate service-worker.js).
    name: process.env.VUE_APP_COMPETITION_NAME,
    manifestPath: 'manifest.json',
    manifestOptions: {
      name: process.env.VUE_APP_COMPETITION_NAME,
      short_name: process.env.VUE_APP_MANIFEST_SHORT_NAME || 'Ascenso',
      icons: [
        {
          src: '/assets/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/assets/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
      theme_color: '#1e88e5',
      background_color: '#ffffff',
      start_url: '/index.html',
      scope: '/',
      display: 'standalone',
    },
    workboxOptions: {
      // Serve the index for non-precached URLs.
      navigateFallback: '/index.html',
      // Don't serve index.html for Google-served FirebaseUI auth junk:
      // https://firebase.google.com/docs/auth/web/redirect-best-practices
      navigateFallbackDenylist: [/^\/__\/auth\//],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
          handler: 'CacheFirst',
          method: 'GET',
        },
      ],
    },
    // We could just declare all of the following values ourselves in
    // public/index.html, but cli-plugin-pwa insists on inserting them there.
    themeColor: '#1e88e5', // colors.blue.darken1
    msTileColor: '#ffc40d',
    iconPaths: {
      favicon32: 'assets/favicon-32x32.png',
      favicon16: 'assets/favicon-16x16.png',
      appleTouchIcon: 'assets/apple-touch-icon.png',
      maskIcon: 'assets/safari-pinned-tab.svg',
      msTileImage: 'assets/mstile-150x150.png',
    },
    // TODO: Enable Apple's partial PWA support?
  },
};
