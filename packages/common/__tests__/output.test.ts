import { mapResults } from '../src/output';
import { Pos } from '../src/input';

describe('mapResults', () => {
  it('calls writer for each result-position pair', () => {
    const positions: Pos[] = [
      { row: 0, col: 1 },
      { row: 2, col: 3 },
      { row: 5, col: 6 },
    ];
    const results = ['a', 'b', 'c'];
    const calls: Array<{ pos: Pos; value: string }> = [];
    const writer = (pos: Pos, value: string) => {
      calls.push({ pos, value });
    };
    mapResults(results, positions, writer);
    expect(calls).toEqual([
      { pos: positions[0], value: 'a' },
      { pos: positions[1], value: 'b' },
      { pos: positions[2], value: 'c' },
    ]);
  });

  it('throws error when lengths differ', () => {
    const pos: Pos[] = [{ row: 0, col: 0 }];
    const res = ['only', 'two'];
    const writer = jest.fn();
    expect(() => mapResults(res, pos, writer)).toThrow(
      'Results length (2) does not match positions length (1)'
    );
  });
});