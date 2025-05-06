"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractInputs = extractInputs;
exports.sampleInputs = sampleInputs;
/**
 * Extract non-empty string inputs and their positions from a 2D array of values.
 * @param data 2D array of cell values
 * @param options Optional offsets for row and column indices
 * @returns Object with inputs (string[]) and positions (Pos[])
 */
function extractInputs(data, options) {
    const { rowOffset = 0, colOffset = 0 } = options || {};
    const inputs = [];
    const positions = [];
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        for (let j = 0; j < row.length; j++) {
            const cell = row[j];
            if (cell != null && cell !== "") {
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
function sampleInputs(arr, max) {
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
