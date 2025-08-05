import {
  extractInputsWithHeader,
  expandWithBlankRows,
  themesToRows,
  rowsToThemes,
} from '../src/dataUtils';
import type { Pos } from '../src/input';

describe('extractInputsWithHeader', () => {
  const data = [
    ['Header'],
    ['a'],
    [null],
    ['b']
  ];

  it('handles data without header', () => {
    const { header, inputs, positions } = extractInputsWithHeader(data, { hasHeader: false });
    expect(header).toBeUndefined();
    expect(inputs).toEqual(['Header', 'a', 'b']);
    expect(positions).toEqual<Pos[]>([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 3, col: 0 }
    ]);
  });

  it('extracts and removes header when hasHeader=true', () => {
    const { header, inputs, positions } = extractInputsWithHeader(data, { hasHeader: true });
    expect(header).toBe('Header');
    expect(inputs).toEqual(['a', 'b']);
    expect(positions).toEqual<Pos[]>([
      { row: 1, col: 0 },
      { row: 3, col: 0 }
    ]);
  });
});

describe('expandWithBlankRows', () => {
  it('inserts empty strings for missing rows', () => {
    const inputs = ['a', 'b'];
    const positions: Pos[] = [
      { row: 1, col: 1 },
      { row: 3, col: 1 }
    ];
    const result = expandWithBlankRows(inputs, positions);
    expect(result).toEqual(['a', '', 'b']);
  });
});

describe('theme row mapping', () => {
  it('converts themes to rows and back', () => {
    const themes = [
      {
        label: 'L1',
        shortLabel: 'S1',
        description: 'D1',
        representatives: ['r1a', 'r1b']
      },
      {
        label: 'L2',
        shortLabel: 'S2',
        description: '',
        representatives: []
      }
    ];
    const rows = themesToRows(themes);
    expect(rows).toEqual([
      [
        'L1',
        'S1',
        'D1',
        'r1a',
        'r1b',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ],
      [
        'L2',
        'S2',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]
    ]);
    const roundTrip = rowsToThemes(rows);
    expect(roundTrip).toEqual(themes);
  });
});
