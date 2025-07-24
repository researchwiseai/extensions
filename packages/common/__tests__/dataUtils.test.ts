import { extractInputsWithHeader, expandWithBlankRows } from '../src/dataUtils';
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
