import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import { writeFileSync } from 'node:fs';
const files = [
  'src/configuration/types.ts', 'src/configuration/api/parametrosApi.ts',
  'src/configuration/hooks/useParametrosGlobales.ts', 'src/configuration/components/ParametrosSection.tsx',
  'src/configuration/pages/ConfigurationPage.tsx', 'src/shared/design-system/Input.tsx',
  'src/configuration/api/parametrosApi.test.ts', 'src/configuration/hooks/useParametrosGlobales.test.tsx',
  'src/configuration/components/ParametrosSection.test.tsx', 'src/configuration/pages/ConfigurationPage.fe04.test.tsx',
  'src/shared/design-system/Input.test.tsx',
];
const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: [{
  files: ['**/*.ts', '**/*.tsx'],
  languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { '@typescript-eslint': tseslint.plugin, 'react-hooks': hooks, react },
  rules: { ...hooks.configs.recommended.rules,
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error', 'react/jsx-uses-react': 'error', 'react/jsx-uses-vars': 'error',
  },
}] });
const results = await eslint.lintFiles(files);
writeFileSync('docs/fe04/lint-targeted.json', JSON.stringify(results, null, 2));
const errors = results.reduce((n, r) => n + r.errorCount, 0);
const warnings = results.reduce((n, r) => n + r.warningCount, 0);
console.log(JSON.stringify({ files: results.length, errors, warnings }));
process.exitCode = errors ? 1 : 0;
