import { maybeActivateSheet } from '../src/maybeActivateSheet';

describe('maybeActivateSheet', () => {
  const setActiveSheet = jest.fn();
  const sleep = jest.fn();
  const sheet = {} as any;

  beforeEach(() => {
    (global as any).SpreadsheetApp = { setActiveSheet };
    (global as any).Utilities = { sleep };
    setActiveSheet.mockClear();
    sleep.mockClear();
  });

  test('activates sheet within threshold', () => {
    const start = Date.now();
    maybeActivateSheet(sheet, start);
    expect(setActiveSheet).toHaveBeenCalledWith(sheet);
    expect(sleep).toHaveBeenCalled();
  });

  test('does not activate sheet after threshold', () => {
    const start = Date.now() - 30000;
    maybeActivateSheet(sheet, start);
    expect(setActiveSheet).not.toHaveBeenCalled();
  });
});
