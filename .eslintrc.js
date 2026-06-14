/**
 * Linting for the n8n community node. The `eslint-plugin-n8n-nodes-base`
 * rules mirror what the n8n verified-community-node directory checks.
 */
module.exports = {
  root: true,
  env: { node: true, es2021: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { sourceType: 'module', ecmaVersion: 2021 },
  ignorePatterns: ['dist/**', 'node_modules/**', '*.js'],
  overrides: [
    {
      files: ['credentials/**/*.ts', 'nodes/**/*.ts', 'package.json'],
      plugins: ['eslint-plugin-n8n-nodes-base'],
      extends: ['plugin:n8n-nodes-base/community'],
      rules: {
        'n8n-nodes-base/node-dirname-against-convention': 'off',
      },
    },
  ],
};
