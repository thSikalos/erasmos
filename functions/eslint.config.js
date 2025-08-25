export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2020,
    },
    rules: {
      'no-unused-vars': ['error', {vars: 'all', args: 'after-used'}],
      'object-curly-spacing': ['error', 'never'],
    },
  },
];