"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureStorage = configureStorage;
exports.getThemeSets = getThemeSets;
exports.saveThemeSet = saveThemeSet;
exports.deleteThemeSet = deleteThemeSet;
exports.renameThemeSet = renameThemeSet;
exports.saveManualThemeSet = saveManualThemeSet;
exports.allocateThemesByThreshold = allocateThemesByThreshold;
const similarity_js_1 = require("./similarity.js");
const STORAGE_KEY = 'themeSets';
let storage;
/**
 * Configure the storage backend for theme sets.
 */
function configureStorage(s) {
    storage = s;
}
/**
 * Get all saved theme sets.
 */
async function getThemeSets() {
    if (!storage)
        throw new Error('Storage not configured');
    const sets = await storage.get(STORAGE_KEY);
    return sets ?? [];
}
/**
 * Save or overwrite a theme set by name.
 */
async function saveThemeSet(name, themes) {
    if (!storage)
        throw new Error('Storage not configured');
    const sets = await getThemeSets();
    const existing = sets.find((s) => s.name === name);
    if (existing) {
        existing.themes = themes;
    }
    else {
        sets.push({ name, themes });
    }
    await storage.set(STORAGE_KEY, sets);
}
/**
 * Delete a theme set by name.
 */
async function deleteThemeSet(name) {
    if (!storage)
        throw new Error('Storage not configured');
    const sets = await getThemeSets();
    const filtered = sets.filter((s) => s.name !== name);
    if (filtered.length !== sets.length) {
        await storage.set(STORAGE_KEY, filtered);
    }
}
/**
 * Rename an existing theme set.
 */
async function renameThemeSet(oldName, newName) {
    if (!storage)
        throw new Error('Storage not configured');
    const sets = await getThemeSets();
    const setObj = sets.find((s) => s.name === oldName);
    if (!setObj)
        throw new Error(`Theme set not found: ${oldName}`);
    if (sets.some((s) => s.name === newName)) {
        throw new Error(`Theme set already exists: ${newName}`);
    }
    setObj.name = newName;
    await storage.set(STORAGE_KEY, sets);
}
/**
 * Save a manually created theme set (alias for saveThemeSet).
 */
async function saveManualThemeSet(name, themes) {
    await saveThemeSet(name, themes);
}
/**
 * Allocate groups (themes) from a similarity matrix by thresholding and
 * finding connected components.
 * @param matrix Similarity matrix to process.
 * @param threshold Threshold value for binarization.
 * @param inclusive Whether to include values equal to the threshold.
 * @returns Array of clusters, each cluster is an array of indices.
 */
function allocateThemesByThreshold(matrix, threshold, inclusive = false) {
    const binary = (0, similarity_js_1.thresholdMatrix)(matrix, threshold, inclusive);
    return (0, similarity_js_1.connectedComponents)(binary);
}
