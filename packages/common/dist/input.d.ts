/**
 * Position of a cell in a 2D data array (zero-based indices).
 */
export interface Pos {
    row: number;
    col: number;
}
/**
 * Extract non-empty string inputs and their positions from a 2D array of values.
 * @param data 2D array of cell values
 * @param options Optional offsets for row and column indices
 * @returns Object with inputs (string[]) and positions (Pos[])
 */
export declare function extractInputs(data: any[][], options?: {
    rowOffset?: number;
    colOffset?: number;
}): {
    inputs: string[];
    positions: Pos[];
};
/**
 * Randomly sample up to max elements from an array.
 * @param arr Input array
 * @param max Maximum number of elements to sample
 * @returns New array of sampled elements
 */
export declare function sampleInputs<T>(arr: T[], max: number): T[];
/**
 * Create batches from an array of inputs.
 * @param inputs Array of inputs
 * @param batchSize Size of each batch
 * @param shuffle Whether to shuffle the inputs before batching
 * @returns Array of batches, each containing a subset of the inputs
 */
export declare function createBatches<T>(inputs: T[], batchSize: number, shuffle?: boolean): T[][];
