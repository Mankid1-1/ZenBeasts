// @ts-check

import globals from "globals";
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  // 1. Global ignores
  {
    ignores: ["**/dist/**", "**/target/**", "frontend/.next/**", "node_modules/**", "**/auto-generated/**"],
  },

  // 2. Base JS files (configs, scripts) - NO TS PARSER
  {
    files: ['*.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      ...eslint.configs.recommended.rules,
      'no-unused-vars': 'warn',
    },
  },

  // 3. Backend & Test TS files
  {
    files: ['tests/**/*.ts', 'scripts/**/*.ts'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node, ...globals.mocha },
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // 4. Frontend TS/TSX files
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react': eslintPluginReact,
      'react-hooks': eslintPluginReactHooks,
      'jsx-a11y': eslintPluginJsxA11y,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: 'frontend/tsconfig.json',
        ecmaFeatures: { jsx: true },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser, ...globals.node }, // Add node globals for Buffer, process, etc.
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...eslintPluginReact.configs.recommended.rules,
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginJsxA11y.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // 5. Prettier config must be last
  eslintConfigPrettier,
);
