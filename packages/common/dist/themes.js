"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureStorage = configureStorage;
exports.getThemeSets = getThemeSets;
exports.saveThemeSet = saveThemeSet;
exports.deleteThemeSet = deleteThemeSet;
exports.renameThemeSet = renameThemeSet;
exports.allocateThemes = allocateThemes;
const apiClient_1 = require("./apiClient");
const similarity_1 = require("./similarity");
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
 * Allocate a single theme to each input
 *
 * @param inputs The input strings to allocate
 * @param themes The themes to allocate to
 * @returns A list of objects containing the theme and the score
 */
async function allocateThemes(inputs, themes, options) {
    const similarityResponse = await (0, apiClient_1.compareSimilarity)(inputs, themes.map(t => t.representatives.join('\n')), options);
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
