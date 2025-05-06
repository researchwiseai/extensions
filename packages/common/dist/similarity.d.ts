/**
 * Utilities for working with similarity matrices.
 */
export interface Neighbor {
    /** Index of the neighbor item. */
    index: number;
    /** Similarity value associated with the neighbor. */
    value: number;
}
/**
 * Returns a binary matrix (0 or 1) obtained by thresholding the input matrix.
 * If inclusive is false, entries strictly greater than threshold map to 1; otherwise entries greater than or equal map to 1.
 * @param matrix Input numeric matrix.
 * @param threshold Threshold value.
 * @param inclusive Whether to include values equal to the threshold.
 */
export declare function thresholdMatrix(matrix: number[][], threshold: number, inclusive?: boolean): number[][];
/**
 * For each row in the similarity matrix, returns the top n neighbors,
 * sorted in descending order by similarity value. By default, excludes self-comparison (diagonal).
 * @param matrix Input similarity matrix.
 * @param n Number of top neighbors to return per row.
 * @param includeSelf Whether to include the diagonal element (self) as a neighbor.
 */
export declare function topN(matrix: number[][], n: number, includeSelf?: boolean): Neighbor[][];
/**
 * Given a binary adjacency matrix (entries 0 or 1), returns connected components
 * as arrays of item indices.
 * @param matrix Binary adjacency matrix.
 */
export declare function connectedComponents(matrix: number[][]): number[][];
