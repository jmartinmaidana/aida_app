const path = require('path');

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  globalSetup: path.resolve(__dirname, './__tests__/setup_testing.ts'),
  verbose: true,
  // Le dice a Jest dónde buscar módulos si se pierde
  modulePaths: ['<rootDir>'], 
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testPathIgnorePatterns: ['<rootDir>/__tests__/setup_testing.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        // Esto ayuda a que el setup se compile correctamente
        tsconfig: 'tsconfig.json', 
      },
    ],
  },
};