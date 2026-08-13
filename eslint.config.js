// Flat config (ESLint 9). `eslint-config-expo/flat` brings the RN/Expo rule set;
// `eslint-config-prettier` is applied last so formatting rules never fight
// Prettier. The query plugin catches the two mistakes that actually bite in this
// codebase: unstable query keys and missing deps in query functions.
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const pluginQuery = require('@tanstack/eslint-plugin-query');

module.exports = [
  {
    // Generated native projects and build output are not ours to lint.
    ignores: ['node_modules/**', 'android/**', 'ios/**', 'coverage/**', '.expo/**', 'dist/**'],
  },
  ...expoConfig,
  ...pluginQuery.configs['flat/recommended'],
  prettierConfig,
  {
    rules: {
      // console.error is the one legitimate use (ErrorBoundary); everything
      // else should go through a real logger before it ships.
      'no-console': ['warn', {allow: ['warn', 'error']}],
      eqeqeq: ['error', 'always', {null: 'ignore'}],
    },
  },
  {
    // `@typescript-eslint` is only registered for TS files by the Expo config,
    // so its rules have to be scoped the same way or ESLint can't resolve them.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {argsIgnorePattern: '^_', varsIgnorePattern: '^_'},
      ],
    },
  },
  {
    // Tests legitimately reach for globals and loose assertions.
    files: ['**/*.test.ts', '**/*.test.tsx', 'jest.setup.js', 'jest.config.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
];
