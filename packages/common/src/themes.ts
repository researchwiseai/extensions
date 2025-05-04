import { compareSimilarity, Theme } from './apiClient.js';
import { topN } from './similarity.js';

/**
 * Interface for persistent storage of key/value data.
 */
export interface Storage {
    /** Retrieve a value by key, or undefined if not present. */
    get<T>(key: string): Promise<T | undefined>;
    /** Store a value by key. */
    set<T>(key: string, value: T): Promise<void>;
    /** Delete a value by key. */
    delete(key: string): Promise<void>;
}

export type ShortTheme = Omit<Theme, 'description' | 'shortLabel'>;

/** A named set of themes */
export interface ThemeSet<T = Theme> {
    name: string;
    themes: T[];
}

const STORAGE_KEY = 'themeSets';
let storage: Storage;

/**
 * Configure the storage backend for theme sets.
 */
export function configureStorage(s: Storage): void {
    storage = s;
}

/**
 * Get all saved theme sets.
 */
export async function getThemeSets(): Promise<ThemeSet<ShortTheme>[]> {
    if (!storage) throw new Error('Storage not configured');
    const sets = await storage.get<ThemeSet<ShortTheme>[]>(STORAGE_KEY);
    return sets ?? [];
}

/**
 * Save or overwrite a theme set by name.
 */
export async function saveThemeSet(
    name: string,
    themes: ShortTheme[],
): Promise<void> {
    if (!storage) throw new Error('Storage not configured');
    const sets = await getThemeSets();
    const existing = sets.find((s) => s.name === name);
    if (existing) {
        existing.themes = themes;
    } else {
        sets.push({ name, themes });
    }
    await storage.set(STORAGE_KEY, sets);
}

/**
 * Delete a theme set by name.
 */
export async function deleteThemeSet(name: string): Promise<void> {
    if (!storage) throw new Error('Storage not configured');
    const sets = await getThemeSets();
    const filtered = sets.filter((s) => s.name !== name);
    if (filtered.length !== sets.length) {
        await storage.set(STORAGE_KEY, filtered);
    }
}

/**
 * Rename an existing theme set.
 */
export async function renameThemeSet(
    oldName: string,
    newName: string,
): Promise<void> {
    if (!storage) throw new Error('Storage not configured');
    const sets = await getThemeSets();
    const setObj = sets.find((s) => s.name === oldName);
    if (!setObj) throw new Error(`Theme set not found: ${oldName}`);
    if (sets.some((s) => s.name === newName)) {
        throw new Error(`Theme set already exists: ${newName}`);
    }
    setObj.name = newName;
    await storage.set(STORAGE_KEY, sets);
}

interface AllocateThemeOptions {
    fast?: boolean;
    onProgress?: (message: string) => void;
}


/**
 * Allocate a single theme to each input
 * 
 * @param inputs The input strings to allocate
 * @param themes The themes to allocate to
 * @returns A list of objects containing the theme and the score
 */
export async function allocateThemes<T extends ShortTheme>(inputs: string[], themes: T[], options?: AllocateThemeOptions): Promise<Array<{ theme: T; score: number }>> {
    const similarityResponse = await compareSimilarity(inputs, themes.map(t => t.representatives.join('\n')), options);

    const best = topN(similarityResponse.matrix, 1, true).flat()

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
