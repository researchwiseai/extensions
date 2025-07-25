import { describe, it, expect } from 'bun:test';
import { saveThemesToSheet } from '../src/saveThemesToSheet';
import type { Theme } from '../src/apiClient';

interface MockSheet {
  writes: Array<{ range: string; values: string[][] }>;
  cleared: boolean;
}

describe('saveThemesToSheet', () => {
  const headers = [
    'Label',
    'Short Label',
    'Description',
    'Representative 1',
    'Representative 2',
  ];

  const themes: Theme[] = [
    {
      label: 'L',
      shortLabel: 'SL',
      description: 'D',
      representatives: ['r1', 'r2'],
    },
  ];

  it('writes headers and rows via adapter', async () => {
    const sheet: MockSheet = { writes: [], cleared: false };
    await saveThemesToSheet({
      themes,
      addSheet: () => sheet,
      clearSheet: (s) => {
        s.cleared = true;
      },
      write: (s, range, values) => {
        s.writes.push({ range, values });
      },
    });
    expect(sheet.cleared).toBe(true);
    expect(sheet.writes[0]).toEqual({ range: 'A1:E1', values: [headers] });
    expect(sheet.writes[1]).toEqual({ range: 'A2:E2', values: [
      ['L', 'SL', 'D', 'r1', 'r2'],
    ] });
  });
});
