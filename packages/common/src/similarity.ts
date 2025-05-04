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
export function thresholdMatrix(
  matrix: number[][],
  threshold: number,
  inclusive = false
): number[][] {
  return matrix.map((row) =>
    row.map((value) => (inclusive ? (value >= threshold ? 1 : 0) : value > threshold ? 1 : 0))
  );
}

/**
 * For each row in the similarity matrix, returns the top n neighbors,
 * sorted in descending order by similarity value. By default, excludes self-comparison (diagonal).
 * @param matrix Input similarity matrix.
 * @param n Number of top neighbors to return per row.
 * @param includeSelf Whether to include the diagonal element (self) as a neighbor.
 */
export function topN(
  matrix: number[][],
  n: number,
  includeSelf = false
): Neighbor[][] {
  return matrix.map((row, i) => {
    const neighbors: Neighbor[] = row
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
export function connectedComponents(matrix: number[][]): number[][] {
  const n = matrix.length;
  const visited = new Array<boolean>(n).fill(false);
  const components: number[][] = [];
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    const queue: number[] = [i];
    visited[i] = true;
    const component: number[] = [i];
    while (queue.length) {
      const u = queue.shift()!;
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