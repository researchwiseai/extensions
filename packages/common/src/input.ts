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
export function extractInputs(
    data: any[][],
    options?: { rowOffset?: number; colOffset?: number },
): { inputs: string[]; positions: Pos[] } {
    const { rowOffset = 0, colOffset = 0 } = options || {};
    const inputs: string[] = [];
    const positions: Pos[] = [];

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        for (let j = 0; j < row.length; j++) {
            const cell = row[j];
            if (cell != null && cell !== '') {
                inputs.push(cell.toString());
                positions.push({
                    row: i + rowOffset,
                    col: j + colOffset,
                });
            }
        }
    }

    return { inputs, positions };
}

/**
 * Randomly sample up to max elements from an array.
 * @param arr Input array
 * @param max Maximum number of elements to sample
 * @returns New array of sampled elements
 */
export function sampleInputs<T>(arr: T[], max: number): T[] {
    if (arr.length <= max) {
        return arr.slice();
    }
    // Shuffle copy using Fisher-Yates
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, max);
}

/**
 * Create batches from an array of inputs.
 * @param inputs Array of inputs
 * @param batchSize Size of each batch
 * @param shuffle Whether to shuffle the inputs before batching
 * @returns Array of batches, each containing a subset of the inputs
 */
export function createBatches<T>(
    inputs: T[],
    batchSize: number,
    shuffle = false,
): T[][] {
    if (shuffle) {
        inputs = sampleInputs(inputs, inputs.length);
    }
    const batches: T[][] = [];
    for (let i = 0; i < inputs.length; i += batchSize) {
        batches.push(inputs.slice(i, i + batchSize));
    }
    return batches;
}
