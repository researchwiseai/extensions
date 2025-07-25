import { allocateThemes } from 'pulse-common';
import { writeAllocationsToSheet } from '../src/writeAllocationsToSheet';

jest.mock('pulse-common', () => {
  const actual = jest.requireActual('pulse-common');
  return { ...actual, allocateThemes: jest.fn() };
});

jest.mock('../src/writeAllocationsToSheet', () => ({
  writeAllocationsToSheet: jest.fn(),
}));

let allocateAndSaveThemeSet: typeof import('../src/allocateAndSaveThemeSet').allocateAndSaveThemeSet;

const uiMock = { alert: jest.fn() };
const sheetMock = {} as any;
const dataRangeMock = {
  getValues: jest.fn(),
  getSheet: jest.fn(() => sheetMock),
  getRow: jest.fn(() => 1),
  getColumn: jest.fn(() => 1),
};
const ssMock = {
  getRange: jest.fn(),
  toast: jest.fn(),
};

(global as any).SpreadsheetApp = {
  getActiveSpreadsheet: () => ssMock,
  getUi: () => uiMock,
};

beforeAll(async () => {
  const mod = await import('../src/allocateAndSaveThemeSet');
  allocateAndSaveThemeSet = mod.allocateAndSaveThemeSet;
});

beforeEach(() => {
  jest.clearAllMocks();
});

test('alerts when data range cannot be read', async () => {
  ssMock.getRange.mockImplementation(() => {
    throw new Error('no range');
  });

  await allocateAndSaveThemeSet({
    dataRange: 'Sheet1!A1:A2',
    labels: 'B1',
    rep1: 'C1',
    rep2: 'D1',
  });

  expect(uiMock.alert).toHaveBeenCalledWith(
    expect.stringContaining('Error reading data range'),
  );
  expect(allocateThemes).not.toHaveBeenCalled();
});

test('alerts when no text found', async () => {
  ssMock.getRange.mockImplementation((a: string) => {
    if (a === 'Sheet1!A1:A2') return dataRangeMock as any;
    throw new Error('unexpected');
  });
  dataRangeMock.getValues.mockReturnValue([[""], [""]]);

  await allocateAndSaveThemeSet({
    dataRange: 'Sheet1!A1:A2',
    labels: 'B1',
    rep1: 'C1',
    rep2: 'D1',
  });

  expect(uiMock.alert).toHaveBeenCalledWith(
    'No text found in selected data range for theme allocation.',
  );
  expect(allocateThemes).not.toHaveBeenCalled();
});

test('alerts on mismatched custom range lengths', async () => {
  ssMock.getRange.mockImplementation((a: string) => {
    if (a === 'Sheet1!A1:A2') return dataRangeMock as any;
    if (a === 'Sheet1!B1:B2') return { getValues: () => [['A'], ['B']] } as any;
    if (a === 'Sheet1!C1:C1') return { getValues: () => [['a1']] } as any;
    if (a === 'Sheet1!D1:D2') return { getValues: () => [['a2'], ['b2']] } as any;
    throw new Error('unexpected');
  });
  dataRangeMock.getValues.mockReturnValue([["foo"], ["bar"]]);

  await allocateAndSaveThemeSet({
    dataRange: 'Sheet1!A1:A2',
    labels: 'Sheet1!B1:B2',
    rep1: 'Sheet1!C1:C1',
    rep2: 'Sheet1!D1:D2',
  });

  expect(uiMock.alert).toHaveBeenCalledWith(
    'Selected ranges must have the same number of cells',
  );
  expect(allocateThemes).not.toHaveBeenCalled();
});

test('allocates themes and writes results', async () => {
  ssMock.getRange.mockImplementation((a: string) => {
    if (a === 'Sheet1!A1:A2') return dataRangeMock as any;
    if (a === 'Sheet1!B1:B2') return { getValues: () => [['A'], ['B']] } as any;
    if (a === 'Sheet1!C1:C2') return { getValues: () => [['a1'], ['b1']] } as any;
    if (a === 'Sheet1!D1:D2') return { getValues: () => [['a2'], ['b2']] } as any;
    throw new Error('unexpected');
  });
  dataRangeMock.getValues.mockReturnValue([["foo"], ["bar"]]);
  const allocs = [
    { theme: { label: 'A', representatives: [] }, score: 1, belowThreshold: false },
    { theme: { label: 'B', representatives: [] }, score: 1, belowThreshold: false },
  ];
  (allocateThemes as jest.Mock).mockResolvedValue(allocs);

  await allocateAndSaveThemeSet({
    dataRange: 'Sheet1!A1:A2',
    labels: 'Sheet1!B1:B2',
    rep1: 'Sheet1!C1:C2',
    rep2: 'Sheet1!D1:D2',
  });

  expect(allocateThemes).toHaveBeenCalledWith(
    ['foo', 'bar'],
    [
      { label: 'A', representatives: ['a1', 'a2'] },
      { label: 'B', representatives: ['b1', 'b2'] },
    ],
    expect.any(Object),
  );
  expect(writeAllocationsToSheet).toHaveBeenCalledWith(
    allocs,
    sheetMock,
    [
      { row: 1, col: 1 },
      { row: 2, col: 1 },
    ],
  );
});
