import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'ios']), // ios/ holds the Capacitor shell — its App/public/ carries generated (minified) web assets after cap sync
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', caughtErrors: 'none' }],
      'react-hooks/set-state-in-effect': 'off',
      // React Compiler is NOT in this build (plain @vitejs/plugin-react).
      // This rule only reports compiler-eligibility of hand-written memoization
      // (it can't prove makeProjector()'s return is immutable) — noise here.
      // Re-enable if the compiler is ever adopted.
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
])
