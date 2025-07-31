import { jest } from '@jest/globals';

const updateItem = jest.fn();
const getFeed = jest.fn(() => [{ jobId: '1' }]);

jest.mock('pulse-common/jobs', () => ({
  updateItem: (...args: any[]) => updateItem(...args),
  getFeed: (...args: any[]) => getFeed(...args),
}));

let feedToast: typeof import('../src/feedToast').feedToast;

beforeAll(async () => {
  feedToast = (await import('../src/feedToast')).feedToast;
});

beforeEach(() => {
  (global as any).SpreadsheetApp = {
    getActiveSpreadsheet: () => ({ toast: jest.fn() }),
  };
});

afterEach(() => {
  jest.clearAllMocks();
});

test('updates feed with last item', () => {
  feedToast('hello');
  // We no longer show a Spreadsheet toast; feed is updated instead
  expect(updateItem).toHaveBeenCalledWith({ jobId: '1', message: 'hello' });
});
