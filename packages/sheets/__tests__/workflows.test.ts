import type { Theme } from 'pulse-common';
import { analyzeSentiment, allocateThemes } from 'pulse-common/apiClient';
import { getThemeSets } from 'pulse-common/themes';

jest.mock('pulse-common/apiClient', () => ({
    analyzeSentiment: jest.fn(),
    allocateThemes: jest.fn(),
}));

jest.mock('pulse-common/themes', () => ({
    getThemeSets: jest.fn(),
}));

let analyzeSentimentFlow: typeof import('../src/analyzeSentiment').analyzeSentimentFlow;
let allocateThemesFromSet: typeof import('../src/allocateThemesFromSet').allocateThemesFromSet;

const setValuesMock = jest.fn();
const rangeMock = {
    getValues: jest.fn(),
    getRow: jest.fn(() => 1),
    getColumn: jest.fn(() => 1),
    getSheet: jest.fn(),
};
const sheetMock = {
    getRange: jest.fn((a: any, b?: any, c?: any, d?: any) => {
        if (typeof a === 'string') {
            return rangeMock;
        }
        return { setValues: setValuesMock };
    }),
};
rangeMock.getSheet.mockReturnValue(sheetMock);
const ssMock = {
    getSheetByName: jest.fn(() => sheetMock),
    toast: jest.fn(),
};
(global as any).SpreadsheetApp = {
    getActiveSpreadsheet: () => ssMock,
    getUi: () => ({ alert: jest.fn() }),
};

beforeAll(async () => {
    const mod1 = await import('../src/analyzeSentiment');
    analyzeSentimentFlow = mod1.analyzeSentimentFlow;
    const mod2 = await import('../src/allocateThemesFromSet');
    allocateThemesFromSet = mod2.allocateThemesFromSet;
});

afterEach(() => {
    jest.clearAllMocks();
});

test('analyzeSentimentFlow maps results to rows', async () => {
    rangeMock.getValues.mockReturnValue([
        ['Header'],
        ['good'],
        [''],
        ['bad'],
    ]);
    (analyzeSentiment as jest.Mock).mockResolvedValue({
        results: [{ sentiment: 'pos' }, { sentiment: 'neg' }],
    });

    await analyzeSentimentFlow('Sheet1!A1:A4', true);

    expect(analyzeSentiment).toHaveBeenCalledWith(['good', 'bad'], expect.any(Object));
    expect(setValuesMock).toHaveBeenCalledWith([
        ['pos'],
        [''],
        ['neg'],
    ]);
});

test('allocateThemesFromSet maps allocations to rows', async () => {
    rangeMock.getValues.mockReturnValue([
        ['Header'],
        ['foo'],
        [''],
        ['bar'],
    ]);
    (getThemeSets as jest.Mock).mockResolvedValue([
        {
            name: 'Test',
            themes: [
                { label: 'A', representatives: [] },
                { label: 'B', representatives: [] },
            ] as Theme[],
        },
    ]);
    (allocateThemes as jest.Mock).mockResolvedValue([
        { theme: { label: 'A', representatives: [] }, score: 1, belowThreshold: false },
        { theme: { label: 'B', representatives: [] }, score: 1, belowThreshold: false },
    ]);

    await allocateThemesFromSet('Sheet1!A1:A4', 'Test', true);

    expect(allocateThemes).toHaveBeenCalledWith(['foo', 'bar'], expect.any(Object));
    expect(setValuesMock).toHaveBeenCalledWith([
        ['A'],
        [''],
        ['B'],
    ]);
});
