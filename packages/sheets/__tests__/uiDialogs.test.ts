jest.mock('../src/Code', () => ({
  getActiveRangeA1Notation: jest.fn(),
}));

jest.mock('pulse-common', () => ({
  getThemeSets: jest.fn(),
}));

import { showInputRangeDialog } from '../src/showInputRangeDialog';
import { showAllocationModeDialog } from '../src/showAllocationModeDialog';
import { getActiveRangeA1Notation } from '../src/Code';
import { getThemeSets } from 'pulse-common';

describe('dialog helpers', () => {
  const showModelessDialog = jest.fn();
  const htmlOutput = { setWidth: jest.fn().mockReturnThis(), setHeight: jest.fn().mockReturnThis() } as any;
  let template: any;

  beforeEach(() => {
    (global as any).SpreadsheetApp = { getUi: () => ({ showModelessDialog }) };
    (global as any).HtmlService = {
      createTemplateFromFile: jest.fn(() => {
        template = { evaluate: jest.fn(() => htmlOutput) };
        return template;
      }),
    };
    showModelessDialog.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('showInputRangeDialog uses active range and mode', () => {
    (getActiveRangeA1Notation as jest.Mock).mockReturnValue('Sheet1!A1:A10');

    showInputRangeDialog('generation');

    expect(template.dataRange).toBe('Sheet1!A1:A10');
    expect(template.mode).toBe('generation');
    expect(showModelessDialog).toHaveBeenCalledWith(htmlOutput, 'Select Input Range');
    expect((global as any).HtmlService.createTemplateFromFile).toHaveBeenCalledWith('InputRangeDialog');
  });

  test('showAllocationModeDialog populates theme set names', async () => {
    (getThemeSets as jest.Mock).mockResolvedValue([{ name: 'SetA' }, { name: 'SetB' }]);

    await showAllocationModeDialog('Sheet1!B1:B3', true);

    expect(template.dataRange).toBe('Sheet1!B1:B3');
    expect(template.hasHeader).toBe(true);
    expect(template.themeSetNames).toEqual(['SetA', 'SetB']);
    expect(showModelessDialog).toHaveBeenCalledWith(htmlOutput, 'Theme Allocation Mode');
    expect((global as any).HtmlService.createTemplateFromFile).toHaveBeenCalledWith('AllocationModeDialog');
  });
});
