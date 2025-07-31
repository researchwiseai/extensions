import type { ShortTheme } from 'pulse-common';

jest.mock('../src/feedToast', () => ({ feedToast: jest.fn() }));

let writeAllocationsToSheet: typeof import('../src/writeAllocationsToSheet').writeAllocationsToSheet;

const setValueMock = jest.fn();
const sheetMock = {
  getRange: jest.fn(() => ({ setValue: setValueMock })),
};
const toastMock = jest.fn();
const ssMock = { toast: toastMock };
(global as any).SpreadsheetApp = {
  getActiveSpreadsheet: () => ssMock,
};

beforeAll(async () => {
  writeAllocationsToSheet = (await import('../src/writeAllocationsToSheet')).writeAllocationsToSheet;
});

afterEach(() => {
  jest.clearAllMocks();
});

test('writes labels to specified cells and toasts', () => {
  const allocs = [
    { theme: { label: 'A' } as ShortTheme, score: 1 },
    { theme: { label: 'B' } as ShortTheme, score: 1 },
  ];
  const positions = [
    { row: 1, col: 1 },
    { row: 3, col: 2 },
  ];

  writeAllocationsToSheet(allocs, sheetMock as any, positions);

  expect(sheetMock.getRange).toHaveBeenCalledWith(1, 2);
  expect(sheetMock.getRange).toHaveBeenCalledWith(3, 3);
  expect(setValueMock).toHaveBeenNthCalledWith(1, 'A');
  expect(setValueMock).toHaveBeenNthCalledWith(2, 'B');
  // We have moved from toasts to feed updates for job progress
  // writeAllocationsToSheet calls feedToast internally, not ss.toast
  expect((await import('../src/feedToast')).feedToast).toHaveBeenCalledWith('Theme allocation complete');
});
