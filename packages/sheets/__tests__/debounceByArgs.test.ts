jest.mock('pulse-common', () => ({
  configureClient: jest.fn(),
  configureFetch: jest.fn(),
  configureSleep: jest.fn(),
  configureStorage: jest.fn(),
  getThemeSets: jest.fn(),
  saveThemeSet: jest.fn(),
  renameThemeSet: jest.fn(),
  deleteThemeSet: jest.fn(),
}));
jest.mock('pulse-common/auth', () => ({ configureAuth: jest.fn() }));
jest.mock('../src/auth', () => ({}));
jest.mock('../src/config', () => ({ WEB_BASE: '', API_BASE: '' }));
jest.mock('../src/getOAuthService', () => ({}));
jest.mock('../src/showAllocationModeDialog', () => ({}));
jest.mock('../src/showInputRangeDialog', () => ({}));
jest.mock('../src/generateThemes', () => ({}));
jest.mock('../src/splitIntoSentences', () => ({}));
jest.mock('../src/splitIntoTokens', () => ({}));
jest.mock('../src/countWords', () => ({}));
jest.mock('../src/matrixThemesAutomatic', () => ({}));
jest.mock('../src/matrixThemesFromSet', () => ({}));
jest.mock('../src/similarityMatrixThemesAutomatic', () => ({}));
jest.mock('../src/similarityMatrixThemesFromSet', () => ({}));

import { debounceByArgs } from '../src/Code';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(10000);
});

afterEach(() => {
  jest.useRealTimers();
});

test('debounces repeated calls with same args', () => {
  const fn = jest.fn();
  const debounced = debounceByArgs(fn, 1000);

  debounced('a');
  debounced('a');
  jest.advanceTimersByTime(500);
  debounced('a');

  expect(fn).toHaveBeenCalledTimes(1);

  jest.advanceTimersByTime(500);
  debounced('a');
  expect(fn).toHaveBeenCalledTimes(2);
});

test('calls again for different args or after delay', () => {
  const fn = jest.fn();
  const debounced = debounceByArgs(fn, 1000);

  debounced('a');
  debounced('b');
  expect(fn).toHaveBeenCalledTimes(2);

  debounced('a');
  expect(fn).toHaveBeenCalledTimes(2);

  jest.advanceTimersByTime(1000);
  debounced('a');
  expect(fn).toHaveBeenCalledTimes(3);
});
