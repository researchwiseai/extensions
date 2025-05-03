import { Pos } from './input.js';

/**
 * Map results to positions using a writer callback.
 * @param results Array of result values
 * @param positions Array of positions corresponding to each result
 * @param writer Function that writes a single result at a given position
 */
export function mapResults<T>(
  results: T[],
  positions: Pos[],
  writer: (pos: Pos, value: T) => void
): void {
  if (results.length !== positions.length) {
    throw new Error(
      `Results length (${results.length}) does not match positions length (${positions.length})`
    );
  }
  for (let i = 0; i < results.length; i++) {
    writer(positions[i], results[i]);
  }
}