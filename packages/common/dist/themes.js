"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORAGE_KEY = void 0;
exports.getThemeSets = getThemeSets;
exports.saveThemeSet = saveThemeSet;
exports.saveAllThemeSets = saveAllThemeSets;
exports.deleteThemeSet = deleteThemeSet;
exports.renameThemeSet = renameThemeSet;
exports.allocateThemes = allocateThemes;
exports.allocateThemesBinary = allocateThemesBinary;
exports.multiCode = multiCode;
exports.similarityMatrix = similarityMatrix;
exports.splitSimilarityMatrix = splitSimilarityMatrix;
const apiClient_1 = require("./apiClient");
const similarity_1 = require("./similarity");
const storage_1 = require("./storage");
exports.STORAGE_KEY = 'themeSets';
/**
 * Get all saved theme sets.
 */
async function getThemeSets() {
    if (!storage_1.storage)
        throw new Error('Storage not configured');
    const sets = await storage_1.storage.get(exports.STORAGE_KEY);
    return sets ?? [];
}
/**
 * Save or overwrite a theme set by name.
 */
async function saveThemeSet(name, themes) {
    if (!storage_1.storage)
        throw new Error('Storage not configured');
    const sets = await getThemeSets();
    const existing = sets.find((s) => s.name === name);
    if (existing) {
        existing.themes = themes;
    }
    else {
        sets.push({ name, themes });
    }
    await storage_1.storage.set(exports.STORAGE_KEY, sets);
}
async function saveAllThemeSets(themeSets) {
    if (!storage_1.storage)
        throw new Error('Storage not configured');
    const sets = themeSets.map((set) => ({
        name: set.name,
        themes: set.themes.map((theme) => ({
            description: undefined,
            shortLabel: undefined,
            ...theme,
        })),
    }));
    await storage_1.storage.set(exports.STORAGE_KEY, sets);
}
/**
 * Delete a theme set by name.
 */
async function deleteThemeSet(name) {
    if (!storage_1.storage)
        throw new Error('Storage not configured');
    const sets = await getThemeSets();
    const filtered = sets.filter((s) => s.name !== name);
    if (filtered.length !== sets.length) {
        await storage_1.storage.set(exports.STORAGE_KEY, filtered);
    }
}
/**
 * Rename an existing theme set.
 */
async function renameThemeSet(oldName, newName) {
    if (!storage_1.storage)
        throw new Error('Storage not configured');
    const sets = await getThemeSets();
    const setObj = sets.find((s) => s.name === oldName);
    if (!setObj)
        throw new Error(`Theme set not found: ${oldName}`);
    if (sets.some((s) => s.name === newName)) {
        throw new Error(`Theme set already exists: ${newName}`);
    }
    setObj.name = newName;
    await storage_1.storage.set(exports.STORAGE_KEY, sets);
}
/**
 * Allocate a single theme to each input
 *
 * @param inputs The input strings to allocate
 * @param themes The themes to allocate to
 * @returns A list of objects containing the theme and the score
 */
async function allocateThemes(inputs, themes, options) {
    const similarityResponse = await (0, apiClient_1.compareSimilarity)(inputs, themes.map((theme) => theme.representatives.join('\n')), {
        ...options,
        split: {
            set_a: {
                unit: 'sentence',
                agg: 'max',
            },
            set_b: {
                unit: 'newline',
                agg: 'mean',
            },
        },
    });
    const best = (0, similarity_1.topN)(similarityResponse.matrix, 1, true).flat();
    return inputs.map((_, i) => {
        const fit = best[i];
        const theme = themes[fit.index];
        const score = fit.value;
        return {
            theme,
            score,
        };
    });
}
function autoThreshold(matrix) {
    return 0.6;
    // const maxMax = 0.707;
    // // Find the maximum per column and then minimum of those
    // const maxes = matrix[0].map((_, i) =>
    //     Math.max(...matrix.map((row) => row[i])),
    // );
    // const minMax = Math.min(...maxes);
    // return minMax > maxMax ? maxMax : minMax;
}
/**
 * Return a binary matrix of inputs and themes using a similarity threshold
 *
 * @param inputs The input strings to allocate
 * @param themes The themes to allocate to
 * @param options Options for allocation
 * @param options.fast If true, use a faster but less accurate algorithm
 * @param options.onProgress A callback function to report progress
 * @param options.threshold The similarity threshold for allocation
 * @returns A binary matrix of inputs and themes
 */
async function allocateThemesBinary(inputs, themes, options) {
    let { threshold, ...rest } = options ?? {};
    const similarityResponse = await (0, apiClient_1.compareSimilarity)(inputs, themes.map((t) => `${t.label}: - ${t.representatives.join(', ')}`), rest);
    if (threshold === undefined) {
        threshold = autoThreshold(similarityResponse.matrix);
    }
    return similarityResponse.matrix.map((row) => row.map((value) => value >= threshold));
}
async function multiCode(inputs, themes, options) {
    const matrix = await splitSimilarityMatrix(inputs, themes, options);
    const threshold = autoThreshold(matrix);
    return matrix.map((row) => row.map((value) => value >= threshold));
}
async function similarityMatrix(inputs, themes, options) {
    const similarityResponse = await (0, apiClient_1.compareSimilarity)(inputs, themes.map((t) => `${t.label}: - ${t.representatives.join(', ')}`), options);
    return similarityResponse.matrix;
}
async function splitSimilarityMatrix(inputs, themes, options) {
    // Similarity matrix for the segments and each theme
    const similarityResponse = await (0, apiClient_1.compareSimilarity)(inputs, themes.map((t) => t.representatives.join('\n')), {
        ...options,
        split: {
            set_a: { unit: 'sentence', agg: 'max' },
            set_b: { unit: 'newline', agg: 'mean' },
        },
    });
    if (options?.normalize !== false) {
        // Normalize the similarity matrix to be between 0 and 1
        let max = -Infinity;
        let min = Infinity;
        for (const row of similarityResponse.matrix) {
            for (const value of row) {
                if (value > max) {
                    max = value;
                }
                else if (value < min) {
                    min = value;
                }
            }
        }
        const range = max - min;
        similarityResponse.matrix = similarityResponse.matrix.map((row) => row.map((value) => (value - min) / (range || 1)));
    }
    // Now for each input, we find the maximum similarity for each segment
    // for each theme. The result is the input gains the similarity score
    // of the best segment for that theme.
    const results = inputs.map(() => {
        const row = Array.from({ length: themes.length }, () => 0);
        return row;
    });
    themes.forEach((_, t) => {
        inputs.forEach((_, i) => {
            let max = 0;
            const row = similarityResponse.matrix[i];
            row.forEach((value, j) => {
                if (j !== t)
                    return;
                if (value > max) {
                    max = value;
                }
            });
            results[i][t] = max;
        });
    });
    return results;
}
