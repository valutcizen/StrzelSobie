// @ts-check

import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

export default [
  {
    ignores: ['**/*.js', '**/dist/**'],
  },
  eslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', 'src/**/*.tsx', 'src/**/*.mts', 'src/**/*.cts'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // For Node.js environment (e.g., crypto, console)
        NodeJS: true,
        // For Cloudflare Workers environment (e.g., Response, D1Database, KVNamespace)
        D1Database: true,
        KVNamespace: true,
        Response: true,
        Request: true,
        Headers: true,
        crypto: true,
        console: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-undef': 'error',
      'no-redeclare': 'error',
      // Add any specific rules for TypeScript files here
    },
  },
  {
    files: ['src/client/src/**/*.vue', 'src/client/src/**/*.ts'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        browser: true,
        // For Node.js environment (e.g., crypto, console)
        NodeJS: true,
        // For Cloudflare Workers environment (e.g., Response, D1Database, KVNamespace)
        D1Database: true,
        KVNamespace: true,
        Response: true,
        Request: true,
        Headers: true,
        crypto: true,
        console: true,
        window: true,
        document: true,
        setTimeout: true,
        clearTimeout: true,
        setInterval: true,
        clearInterval: true,
        fetch: true,
        alert: true,
        confirm: true,
        prompt: true,
        location: true,
        history: true,
        MutationObserver: true,
        SVGElement: true,
        MathMLElement: true,
        Element: true,
        Event: true,
        requestAnimationFrame: true,
        cancelAnimationFrame: true,
        performance: true,
        ResizeObserver: true,
        FormData: true,
        Blob: true,
        Buffer: true,
        URLSearchParams: true,
        navigator: true,
        WorkerGlobalScope: true,
        XMLHttpRequest: true,
        AbortController: true,
        ReadableStream: true,
        btoa: true,
        Node: true,
        HTMLElement: true,
        PointerEvent: true,
        ShadowRoot: true,
        HTMLTextAreaElement: true,
        HTMLInputElement: true,
        CSS: true,
        visualViewport: true,
        Image: true,
        IntersectionObserver: true,
        setImmediate: true,
        queueMicrotask: true,
        process: true,
        URL: true,
        __INTLIFY_PROD_DEVTOOLS__: true,
        __INTLIFY_JIT_COMPILATION__: true,
        __INTLIFY_DROP_MESSAGE_COMPILER__: true,
        __VUE_I18N_LEGACY_API__: true,
        __VUE_I18N_FULL_INSTALL__: true,
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_DEVTOOLS__: true,
      },
    },
    plugins: {
      vue: vue,
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...vue.configs['vue3-recommended'].rules,
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-undef': 'error',
      'no-redeclare': 'error',
      // Add any specific rules for Vue files here
    },
  },
];
