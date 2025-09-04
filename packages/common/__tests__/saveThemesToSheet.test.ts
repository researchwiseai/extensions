import { saveThemesToSheet } from '../src/saveThemesToSheet';
import type { Theme } from '../src/apiClient';

describe('saveThemesToSheet', () => {
  test('handles undefined themes defensively (writes only header)', async () => {
    const writes: Array<{ range: string; values: string[][] }> = [];
    const sheet = { id: 'sheet1' };

    await expect(
      // @ts-expect-error: simulate runtime undefined themes
      saveThemesToSheet({
        themes: undefined as unknown as Theme[],
        addSheet: async () => sheet,
        clearSheet: async () => {},
        write: async (_sheet, range, values) => {
          writes.push({ range, values });
        },
      }),
    ).resolves.toBe(sheet);

    // First write is the header row
    expect(writes[0]).toBeDefined();
    expect(writes[0].range).toMatch(/^A1:[A-Z]+1$/);
    expect(writes[0].values[0]).toEqual(
      expect.arrayContaining(['Label', 'Short Label', 'Description'])
    );

    // No body rows should be written for undefined/empty themes
    expect(writes.length).toBe(1);
  });

  test('writes body rows when themes provided', async () => {
    const writes: Array<{ range: string; values: string[][] }> = [];
    const sheet = { id: 'sheet2' };
    const themes: Theme[] = [
      {
        label: 'Theme A',
        shortLabel: 'A',
        description: 'Desc A',
        representatives: ['r1', 'r2'],
      },
    ];

    await saveThemesToSheet({
      themes,
      addSheet: async () => sheet,
      clearSheet: async () => {},
      write: async (_sheet, range, values) => {
        writes.push({ range, values });
      },
    });

    // Should have header + body writes
    expect(writes.length).toBe(2);
    expect(writes[1].range).toMatch(/^A2:[A-Z]+\d+$/);
    expect(writes[1].values.length).toBe(1);
    expect(writes[1].values[0][0]).toBe('Theme A');
  });
});

