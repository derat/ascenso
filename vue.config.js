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
};
