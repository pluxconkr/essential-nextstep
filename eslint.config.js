// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'scripts/*', '.omc/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/app/api/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['@/server', '@/server/*', '**/server/*'], message: 'src/server is imported only from src/app/api/**' }] }],
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['react', 'react-native', 'expo*', '@expo/*', '@/ui/*', '@/store/*', '@/services/*', '@/data/*', '@/server/*'], message: 'src/domain is pure TypeScript: no React, React Native, Expo or app imports' }] }],
    },
  },
]);
