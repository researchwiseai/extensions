import { multiCode, splitSimilarityMatrix, getThemeSets } from 'pulse-common/themes';
import { generateThemesFlow } from '../src/generateThemes';

jest.mock('pulse-common/themes', () => ({
    multiCode: jest.fn(),
    splitSimilarityMatrix: jest.fn(),
    getThemeSets: jest.fn(),
}));

jest.mock('../src/generateThemes', () => ({
    generateThemesFlow: jest.fn(),
}));

let splitIntoSentencesFlow: typeof import('../src/splitIntoSentences').splitIntoSentencesFlow;
let splitIntoTokensFlow: typeof import('../src/splitIntoTokens').splitIntoTokensFlow;
let countWordsFlow: typeof import('../src/countWords').countWordsFlow;
let matrixThemesAutomatic: typeof import('../src/matrixThemesAutomatic').matrixThemesAutomatic;
let matrixThemesFromSet: typeof import('../src/matrixThemesFromSet').matrixThemesFromSet;
let similarityMatrixThemesAutomatic: typeof import('../src/similarityMatrixThemesAutomatic').similarityMatrixThemesAutomatic;
let similarityMatrixThemesFromSet: typeof import('../src/similarityMatrixThemesFromSet').similarityMatrixThemesFromSet;

const setValuesMock = jest.fn();
const setValueMock = jest.fn();
const rangeMock = {
    getValues: jest.fn(),
    getRow: jest.fn(() => 1),
    getColumn: jest.fn(() => 1),
    getNumColumns: jest.fn(() => 1),
    getSheet: jest.fn(),
};
const sheetMock = {
    getRange: jest.fn((a: any, b?: any, c?: any, d?: any) => {
        if (typeof a === 'string') return rangeMock;
        return { setValues: setValuesMock, setValue: setValueMock };
    }),
};
rangeMock.getSheet.mockReturnValue(sheetMock);
const newSheetMock = {
    getRange: jest.fn(() => ({ setValues: setValuesMock, setValue: setValueMock })),
};
const ssMock = {
    getSheetByName: jest.fn(() => sheetMock),
    getRange: jest.fn(() => rangeMock),
    insertSheet: jest.fn(() => newSheetMock),
    toast: jest.fn(),
};
const setActiveSheetMock = jest.fn();
const sleepMock = jest.fn();
(global as any).SpreadsheetApp = {
    getActiveSpreadsheet: () => ssMock,
    getUi: () => ({ alert: jest.fn(), prompt: () => ({ getSelectedButton: () => ({}) }) }),
    setActiveSheet: setActiveSheetMock,
};
(global as any).Utilities = { sleep: sleepMock };

beforeAll(async () => {
    const mod1 = await import('../src/splitIntoSentences');
    splitIntoSentencesFlow = mod1.splitIntoSentencesFlow;
    const mod2 = await import('../src/splitIntoTokens');
    splitIntoTokensFlow = mod2.splitIntoTokensFlow;
    const mod3 = await import('../src/countWords');
    countWordsFlow = mod3.countWordsFlow;
    const mod4 = await import('../src/matrixThemesAutomatic');
    matrixThemesAutomatic = mod4.matrixThemesAutomatic;
    const mod5 = await import('../src/matrixThemesFromSet');
    matrixThemesFromSet = mod5.matrixThemesFromSet;
    const mod6 = await import('../src/similarityMatrixThemesAutomatic');
    similarityMatrixThemesAutomatic = mod6.similarityMatrixThemesAutomatic;
    const mod7 = await import('../src/similarityMatrixThemesFromSet');
    similarityMatrixThemesFromSet = mod7.similarityMatrixThemesFromSet;
});

afterEach(() => {
    jest.clearAllMocks();
    setActiveSheetMock.mockClear();
    sleepMock.mockClear();
});

test('splitIntoSentencesFlow creates new sheet', () => {
    rangeMock.getValues.mockReturnValue([["a. b."], ["c"]]);
    splitIntoSentencesFlow('Sheet1!A1:A2');
    expect(ssMock.insertSheet).toHaveBeenCalled();
    expect(setValuesMock).toHaveBeenCalledWith([["Text", "Sentence 1", "Sentence 2"]]);
    expect(setActiveSheetMock).toHaveBeenCalledWith(newSheetMock);
});

test('splitIntoTokensFlow creates new sheet', () => {
    rangeMock.getValues.mockReturnValue([["a b"], ["c"]]);
    splitIntoTokensFlow('Sheet1!A1:A2');
    expect(ssMock.insertSheet).toHaveBeenCalled();
    expect(setValuesMock).toHaveBeenCalledWith([["Text", "Token 1", "Token 2"]]);
    expect(setActiveSheetMock).toHaveBeenCalledWith(newSheetMock);
});

test('countWordsFlow writes counts', () => {
    rangeMock.getValues.mockReturnValue([["a b"], ["c"]]);
    countWordsFlow('Sheet1!A1:A2');
    expect(ssMock.insertSheet).toHaveBeenCalled();
    expect(setValuesMock).toHaveBeenCalledWith([["Text", "Word Count"]]);
    expect(setActiveSheetMock).toHaveBeenCalledWith(newSheetMock);
});

test('matrixThemesAutomatic calls multiCode', async () => {
    (generateThemesFlow as jest.Mock).mockResolvedValue({
        inputs: ['x'],
        positions: [{ row: 1, col: 1 }],
        themes: [{ label: 'A', representatives: [] }],
    });
    (multiCode as jest.Mock).mockResolvedValue([[true]]);

    await matrixThemesAutomatic('Sheet1!A1:A2');

    expect(multiCode).toHaveBeenCalled();
    expect(ssMock.insertSheet).toHaveBeenCalled();
    expect(setActiveSheetMock).toHaveBeenCalledWith(newSheetMock);
});

test('matrixThemesFromSet loads theme set', async () => {
    rangeMock.getValues.mockReturnValue([["x"]]);
    (getThemeSets as jest.Mock).mockResolvedValue([{ name: 'Set1', themes: [{ label: 'A', representatives: [] }] }]);
    (multiCode as jest.Mock).mockResolvedValue([[true]]);

    await matrixThemesFromSet('Sheet1!A1:A1', 'Set1');

    expect(getThemeSets).toHaveBeenCalled();
    expect(multiCode).toHaveBeenCalled();
    expect(setActiveSheetMock).toHaveBeenCalledWith(newSheetMock);
});

test('similarityMatrixThemesAutomatic calls splitSimilarityMatrix', async () => {
    (generateThemesFlow as jest.Mock).mockResolvedValue({
        inputs: ['x'],
        positions: [{ row: 1, col: 1 }],
        themes: [{ label: 'A', representatives: [] }],
    });
    (splitSimilarityMatrix as jest.Mock).mockResolvedValue([[0.5]]);

    await similarityMatrixThemesAutomatic('Sheet1!A1:A2');

    expect(splitSimilarityMatrix).toHaveBeenCalled();
    expect(ssMock.insertSheet).toHaveBeenCalled();
    expect(setActiveSheetMock).toHaveBeenCalledWith(newSheetMock);
});

test('similarityMatrixThemesFromSet uses theme set', async () => {
    rangeMock.getValues.mockReturnValue([["x"]]);
    (getThemeSets as jest.Mock).mockResolvedValue([{ name: 'Set1', themes: [{ label: 'A', representatives: [] }] }]);
    (splitSimilarityMatrix as jest.Mock).mockResolvedValue([[0.2]]);

    await similarityMatrixThemesFromSet('Sheet1!A1:A1', 'Set1');

    expect(getThemeSets).toHaveBeenCalled();
    expect(splitSimilarityMatrix).toHaveBeenCalled();
    expect(setActiveSheetMock).toHaveBeenCalledWith(newSheetMock);
});
