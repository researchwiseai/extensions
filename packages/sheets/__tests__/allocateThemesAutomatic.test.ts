import { allocateThemes } from 'pulse-common/api';
import { generateThemesFlow } from '../src/generateThemes';

jest.mock('pulse-common/api', () => ({
    allocateThemes: jest.fn(),
}));

jest.mock('../src/generateThemes', () => ({
    generateThemesFlow: jest.fn(),
}));

let allocateThemesAutomatic: typeof import('../src/allocateThemesAutomatic').allocateThemesAutomatic;

const setValuesMock = jest.fn();
const sheetMock = {
    getRange: jest.fn(() => ({ setValues: setValuesMock })),
};
const dataRangeObjMock = {
    getSheet: jest.fn(() => sheetMock),
    getColumn: jest.fn(() => 1),
};
const ssMock = {
    toast: jest.fn(),
};
(global as any).SpreadsheetApp = {
    getActiveSpreadsheet: () => ssMock,
};

beforeAll(async () => {
    const mod = await import('../src/allocateThemesAutomatic');
    allocateThemesAutomatic = mod.allocateThemesAutomatic;
});

afterEach(() => {
    jest.clearAllMocks();
});

test('allocates themes and writes results', async () => {
    (generateThemesFlow as jest.Mock).mockResolvedValue({
        inputs: ['foo', 'bar'],
        positions: [
            { row: 1, col: 1 },
            { row: 3, col: 1 },
        ],
        dataRangeObj: dataRangeObjMock,
        themes: [{ label: 'A', representatives: [] }],
    });
    (allocateThemes as jest.Mock).mockResolvedValue([
        { theme: { label: 'T1', representatives: [] }, belowThreshold: false },
        { theme: { label: 'T2', representatives: [] }, belowThreshold: false },
    ]);

    await allocateThemesAutomatic('Sheet1!A1:A3', true);

    expect(generateThemesFlow).toHaveBeenCalledWith('Sheet1!A1:A3', true);
    expect(allocateThemes).toHaveBeenCalledWith(
        ['foo', 'bar'],
        [{ label: 'A', representatives: [] }],
        expect.any(Object),
    );
    expect(sheetMock.getRange).toHaveBeenCalledWith(1, 2, 3, 1);
    expect(setValuesMock).toHaveBeenCalledWith([
        ['T1'],
        [''],
        ['T2'],
    ]);
});
