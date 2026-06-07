module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/env.setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/utils/**/*.test.js',
  ],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
};
