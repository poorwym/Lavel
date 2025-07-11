/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: [
    '<rootDir>/test/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node',
        baseUrl: '.',
        paths: {
          '@lavel/api': ['packages/core/api/index.ts'],
          '@lavel/api/*': ['packages/core/api/*']
        }
      }
    }]
  },
  moduleNameMapper: {
    '^@lavel/api$': '<rootDir>/packages/core/api/index.ts',
    '^@lavel/api/(.*)$': '<rootDir>/packages/core/api/$1',
    '^@lavel/(.*)$': '<rootDir>/packages/core/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 15000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'packages/core/api/**/*.ts',
    '!packages/core/api/**/*.d.ts',
    '!packages/core/api/node_modules/**',
    '!packages/core/api/example.ts'
  ],
  coverageDirectory: '<rootDir>/test/coverage',
  coverageReporters: ['text', 'lcov', 'html']
}; 