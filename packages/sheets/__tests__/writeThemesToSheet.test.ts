import type { Theme } from 'pulse-common';

let writeThemesToSheet: typeof import('../src/writeThemesToSheet').writeThemesToSheet;

const headerRangeMock = { setValues: jest.fn() };
const dataRangeMock = { setValues: jest.fn(), clear: jest.fn() };
const sheetMock = {
  getRange: jest.fn((row: number) => (row === 1 ? headerRangeMock : dataRangeMock)),
  clear: jest.fn(),
};
const ssMock = {
  getSheetByName: jest.fn(() => null),
  insertSheet: jest.fn(() => sheetMock),
};
(global as any).SpreadsheetApp = {
  getActiveSpreadsheet: () => ssMock,
};

beforeAll(async () => {
  writeThemesToSheet = (await import('../src/writeThemesToSheet')).writeThemesToSheet;
});

afterEach(() => {
  jest.clearAllMocks();
});

test('inserts sheet and writes headers and rows', () => {
  const themes: Theme[] = [
    {
      label: 'L',
      shortLabel: 'SL',
      description: 'D',
      representatives: ['r1', 'r2'],
    },
  ];

  writeThemesToSheet(themes);

  expect(ssMock.insertSheet).toHaveBeenCalledWith('Themes');
  expect(sheetMock.clear).not.toHaveBeenCalled();
  expect(sheetMock.getRange).toHaveBeenCalledWith(1, 1, 1, 5);
  expect(headerRangeMock.setValues).toHaveBeenCalledWith([
    ['Label', 'Short Label', 'Description', 'Representative 1', 'Representative 2'],
  ]);
  expect(sheetMock.getRange).toHaveBeenCalledWith(2, 1, 1, 5);
  expect(dataRangeMock.setValues).toHaveBeenCalledWith([
    ['L', 'SL', 'D', 'r1', 'r2'],
  ]);
});

test('clears existing sheet and clears target when no rows', () => {
  ssMock.getSheetByName.mockReturnValue(sheetMock);

  writeThemesToSheet([]);

  expect(ssMock.insertSheet).not.toHaveBeenCalled();
  expect(sheetMock.clear).toHaveBeenCalled();
  expect(headerRangeMock.setValues).toHaveBeenCalled();
  expect(dataRangeMock.clear).toHaveBeenCalled();
});
