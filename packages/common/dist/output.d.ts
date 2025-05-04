import { Pos } from './input.js';
/**
 * Map results to positions using a writer callback.
 * @param results Array of result values
 * @param positions Array of positions corresponding to each result
 * @param writer Function that writes a single result at a given position
 */
export declare function mapResults<T>(results: T[], positions: Pos[], writer: (pos: Pos, value: T) => void): void;
