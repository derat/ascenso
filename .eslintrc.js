module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    // https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin#recommended-configs
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/essential',
    '@vue/typescript',
  ],
  plugins: ['@typescript-eslint/eslint-plugin', 'vuetify'],
  rules: {
    'no-console': 'off',
    // FFS, why does this even exist?
    '@typescript-eslint/ban-ts-ignore': 'off',
    // TypeScript already infers return types, so this is obnoxious.
    '@typescript-eslint/explicit-function-return-type': 'off',
    // If I use the 'any' type, it's because I meant to use it.
    '@typescript-eslint/no-explicit-any': 'off',
    // Allow '!' non-null assertions.
    '@typescript-eslint/no-non-null-assertion': 'off',
    // Functions are hoisted, so there's no reason to complain if they're called
    // before they're defined:
    // https://eslint.org/docs/rules/no-use-before-define
    '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    // Don't yell when we don't use all args passed by third-party code.
    '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
    'vuetify/no-deprecated-classes': 'error',
    'vuetify/grid-unknown-attributes': 'error',
    'vuetify/no-legacy-grid': 'error',
  },
  parserOptions: {
    parser: '@typescript-eslint/parser',
  },
};
