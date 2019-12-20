module.exports = {
  moduleFileExtensions: ['js', 'jsx', 'json', 'vue', 'ts', 'tsx'],
  transform: {
    '^.+\\.vue$': 'vue-jest',
    '.+\\.(css|styl|less|sass|scss|svg|png|jpg|ttf|woff|woff2)$':
      'jest-transform-stub',
    '^.+\\.tsx?$': 'ts-jest',
  },
  // By default, Jest is configured to not transform '/node_modules/'. Vuetify's
  // locale files need to be transformed from TS to JS when they're imported by
  // src/testutil.ts, though.
  // See e.g. https://github.com/nrwl/nx/issues/812#issue-369650585.
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!vuetify/src/locale/.*)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  snapshotSerializers: ['jest-serializer-vue'],
  testMatch: ['**/*.test.ts'],
  testURL: 'http://localhost/',
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  globals: {
    'ts-jest': {
      babelConfig: true,
      // Needed to avoid a weird "TypeError: Unable to require `.d.ts` file."
      // error when importing en.ts. More discussion at
      // https://github.com/kulshekhar/ts-jest/issues/805.
      isolatedModules: true,
    },
  },
};
