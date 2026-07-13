import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // 레거시 웹 코드 기준선 — 신규 코드 품질 게이트는 packages/shared의 strict 설정이 담당.
      // 웹 리디자인 시 재활성화 검토.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Context 파일은 Provider + 훅을 함께 export하는 표준 패턴 (HMR 경고만 해당)
    files: ['src/contexts/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
