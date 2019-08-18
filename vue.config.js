module.exports = {
  chainWebpack: config => {
    // html-webpack-plugin performs substitution of environment variables in
    // public/index.html, but doesn't touch any other files in the public dir.
    // Tap into copy-webpack-plugin (which is used to copy the dir) and set its
    // 'transform' option to process additional files. See
    // https://cli.vuejs.org/guide/webpack.html#modifying-options-of-a-plugin
    // and https://github.com/vuejs/vue-cli/issues/2436 for more details. 'vue
    // inspect' can be used to see the existing config.
    config.plugin('copy').tap(args => {
      const options = args[0][0];
      // |content| is a Node buffer: https://nodejs.org/api/buffer.html
      // |path| contains the source file's absolute path.
      options.transform = (content, path) => {
        // Replace '{{ VUE_APP_SOME_ENV_VAR }}' with the value of the
        // corresponding environment variable (defined in .env or .env.local).
        if (
          path.endsWith('/browserconfig.xml') ||
          path.endsWith('/manifest.json')
        ) {
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
    // The model here is weird: all of this is just used to inject tags into
    // index.html (apart from |workboxOptions|, which is used to generate
    // service-worker.js). We're still on the hook for supplying the
    // manifest.json file ourselves.
    name: process.env.VUE_APP_COMPETITION_NAME,
    manifestPath: 'manifest.json',
    workboxOptions: {
      // Serve the index for non-precached URLs.
      navigateFallback: '/index.html',
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
          handler: 'cacheFirst',
          method: 'GET',
        },
      ],
    },
    // We could just declare all of the following values ourselves in
    // public/index.html, but cli-plugin-pwa insists on inserting them there.
    themeColor: '#1e88e5', // colors.blue.darken1
    msTileColor: '#ffc40d',
    iconPaths: {
      favicon32: process.env.VUE_APP_FAVICON_32_PATH,
      favicon16: process.env.VUE_APP_FAVICON_16_PATH,
      appleTouchIcon: process.env.VUE_APP_APPLE_TOUCH_ICON_PATH,
      maskIcon: process.env.VUE_APP_APPLE_MASK_PATH,
      msTileImage: process.env.VUE_APP_MS_TILE_150_PATH,
    },
    // TODO: Enable Apple's partial PWA support?
  },
};
