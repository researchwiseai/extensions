"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.thresholdMatrix = thresholdMatrix;
exports.topN = topN;
exports.connectedComponents = connectedComponents;
/**
 * Returns a binary matrix (0 or 1) obtained by thresholding the input matrix.
 * If inclusive is false, entries strictly greater than threshold map to 1; otherwise entries greater than or equal map to 1.
 * @param matrix Input numeric matrix.
 * @param threshold Threshold value.
 * @param inclusive Whether to include values equal to the threshold.
 */
function thresholdMatrix(matrix, threshold, inclusive = false) {
    return matrix.map((row) => row.map((value) => (inclusive ? (value >= threshold ? 1 : 0) : value > threshold ? 1 : 0)));
}
/**
 * For each row in the similarity matrix, returns the top n neighbors,
 * sorted in descending order by similarity value. By default, excludes self-comparison (diagonal).
 * @param matrix Input similarity matrix.
 * @param n Number of top neighbors to return per row.
 * @param includeSelf Whether to include the diagonal element (self) as a neighbor.
 */
function topN(matrix, n, includeSelf = false) {
    return matrix.map((row, i) => {
        const neighbors = row
            .map((value, index) => ({ index, value }))
            .filter(({ index }) => includeSelf || index !== i)
            .sort((a, b) => b.value - a.value)
            .slice(0, n);
        return neighbors;
    });
}
/**
 * Given a binary adjacency matrix (entries 0 or 1), returns connected components
 * as arrays of item indices.
 * @param matrix Binary adjacency matrix.
 */
function connectedComponents(matrix) {
    const n = matrix.length;
    const visited = new Array(n).fill(false);
    const components = [];
    for (let i = 0; i < n; i++) {
        if (visited[i])
            continue;
        const queue = [i];
        visited[i] = true;
        const component = [i];
        while (queue.length) {
            const u = queue.shift();
            for (let v = 0; v < n; v++) {
                if (!visited[v] && ((matrix[u] && matrix[u][v] === 1) || (matrix[v] && matrix[v][u] === 1))) {
                    visited[v] = true;
                    queue.push(v);
                    component.push(v);
                }
            }
        }
        components.push(component);
    }
    return components;
}
