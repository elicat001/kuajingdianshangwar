import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.module.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@data/(.*)$': '<rootDir>/src/data/$1',
    '^@metrics/(.*)$': '<rootDir>/src/metrics/$1',
    '^@alert/(.*)$': '<rootDir>/src/alert/$1',
    '^@recommendation/(.*)$': '<rootDir>/src/recommendation/$1',
    '^@action/(.*)$': '<rootDir>/src/action/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },
};

export default config;
