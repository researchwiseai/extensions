import { jest } from '@jest/globals';

jest.mock('../src/generateThemes', () => ({
  generateThemesFlow: jest.fn(),
}));

jest.mock('pulse-common', () => {
  const actual = jest.requireActual('pulse-common');
  return { ...actual, saveThemeSet: jest.fn() };
});

let themeGenerationRouting: typeof import('../src/Code').themeGenerationRouting;
let saveManualThemeSet: typeof import('../src/Code').saveManualThemeSet;
let allocateThemesWithRangeSpy: jest.SpyInstance;
let generateThemesFlow: jest.Mock;
let saveThemeSetMock: jest.Mock;

beforeAll(async () => {
  const codeMod = await import('../src/Code');
  themeGenerationRouting = codeMod.themeGenerationRouting;
  saveManualThemeSet = codeMod.saveManualThemeSet;
  allocateThemesWithRangeSpy = jest
    .spyOn(codeMod, 'allocateThemesWithRange')
    .mockImplementation(jest.fn());
  generateThemesFlow = (await import('../src/generateThemes'))
    .generateThemesFlow as jest.Mock;
  saveThemeSetMock = (await import('pulse-common')).saveThemeSet as jest.Mock;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('themeGenerationRouting', () => {
  test('calls generation flow when mode is generation', () => {
    themeGenerationRouting('Sheet1!A1:A2', 'generation', true);
    expect(generateThemesFlow).toHaveBeenCalledWith('Sheet1!A1:A2', true);
    expect(allocateThemesWithRangeSpy).not.toHaveBeenCalled();
  });

  test('calls allocation branch when mode is allocation', () => {
    themeGenerationRouting('Sheet1!A1:A2', 'allocation', false);
    expect(allocateThemesWithRangeSpy).toHaveBeenCalledWith('Sheet1!A1:A2', false);
    expect(generateThemesFlow).not.toHaveBeenCalled();
  });
});

describe('saveManualThemeSet', () => {
  test('saves transformed themes', async () => {
    saveThemeSetMock.mockResolvedValue(undefined);
    const res = await saveManualThemeSet({
      name: 'MySet',
      themes: [{ label: 'A', rep1: 'x', rep2: 'y' }],
    });
    expect(saveThemeSetMock).toHaveBeenCalledWith('MySet', [
      { label: 'A', representatives: ['x', 'y'] },
    ]);
    expect(res).toEqual({ success: true });
  });

  test('returns success false on error', async () => {
    saveThemeSetMock.mockRejectedValue(new Error('bad'));
    const res = await saveManualThemeSet({
      name: 'MySet',
      themes: [{ label: 'A', rep1: 'x', rep2: 'y' }],
    });
    expect(res).toEqual({ success: false });
  });
});

