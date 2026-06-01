import { FlatCompat } from '@eslint/eslintrc';
import { globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * Layer order (lower index = lower level; higher layers may import lower ones,
 * but not the other way around):
 *
 *  lib  →  context  →  components  →  app
 */
const eslintConfig = [
  // Wrap legacy eslint-config-next via FlatCompat
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  prettier,

  // ── Import-boundary rules ──────────────────────────────────────────────────
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'lib', pattern: 'lib/**' },
        { type: 'context', pattern: 'context/**' },
        { type: 'components', pattern: 'components/**' },
        { type: 'app', pattern: 'app/**' },
      ],
      'boundaries/ignore': ['**/*.test.*', '**/*.spec.*', '**/tests/**'],
    },
    rules: {
      // Warn so existing violations surface without blocking CI immediately
      'boundaries/element-types': [
        'warn',
        {
          default: 'disallow',
          rules: [
            // lib is the base layer — no imports from upper layers
            { from: 'lib', allow: ['lib'] },
            // context may use lib
            { from: 'context', allow: ['lib', 'context'] },
            // components may use lib and context
            { from: 'components', allow: ['lib', 'context', 'components'] },
            // app (pages/routes) may use everything
            { from: 'app', allow: ['lib', 'context', 'components', 'app'] },
          ],
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),

  // ── Dead code & unreachable branch detection ──────────────────────────────
  {
    rules: {
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      'no-constant-condition': 'error',
      'no-constant-binary-expression': 'error',
      'no-self-compare': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];

export default eslintConfig;
