"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapResults = mapResults;
/**
 * Map results to positions using a writer callback.
 * @param results Array of result values
 * @param positions Array of positions corresponding to each result
 * @param writer Function that writes a single result at a given position
 */
function mapResults(results, positions, writer) {
    if (results.length !== positions.length) {
        throw new Error(`Results length (${results.length}) does not match positions length (${positions.length})`);
    }
    for (let i = 0; i < results.length; i++) {
        writer(positions[i], results[i]);
    }
}
