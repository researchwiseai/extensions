import { compareSimilarity, Theme } from './apiClient';
import { topN } from './similarity';
import { splitTextIntoClauses } from './split';
import { storage } from './storage';

export type ShortTheme = Omit<Theme, 'description' | 'shortLabel'>;
export const STORAGE_KEY = 'themeSets';

/** A named set of themes */
export interface ThemeSet<T = Theme> {
    name: string;
    themes: T[];
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
 * Alias to save a manual theme set from full Theme objects.
 */
export async function saveManualThemeSet(
    name: string,
    themes: Theme[],
): Promise<void> {
    await saveThemeSet(
        name,
        themes.map(({ label, representatives }) => ({
            label,
            representatives,
        })),
    );
}

export async function saveAllThemeSets(
    themeSets: ThemeSet<ShortTheme | Theme>[],
): Promise<void> {
    if (!storage) throw new Error('Storage not configured');
    const sets = themeSets.map((set) => ({
        name: set.name,
        themes: set.themes.map((theme) => ({
            description: undefined,
            shortLabel: undefined,
            ...theme,
        })),
    }));
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
    threshold?: number;
}

/**
 * Allocate a single theme to each input
 *
 * @param inputs The input strings to allocate
 * @param themes The themes to allocate to
 * @returns A list of objects containing the theme and the score
 */
export async function allocateThemes<T extends ShortTheme | Theme>(
    inputs: string[],
    themes: T[],
    options?: AllocateThemeOptions,
): Promise<Array<{ theme: T; score: number; belowThreshold: boolean }>> {
    const similarityResponse = await compareSimilarity(
        inputs,
        themes.map((theme) =>
            'shortLabel' in theme ? theme.shortLabel : theme.label,
        ),
        {
            ...options,
            split: {
                set_a: {
                    unit: 'word',
                    agg: 'top3',
                    window_size: 4,
                    stride_size: 1,
                },
            },
        },
    );

    const threshold = options?.threshold ?? 0.4; // TODO: auto threshold

    const best = topN(similarityResponse.matrix, 1, true).flat();

    return inputs.map((_, i) => {
        const fit = best[i];
        const theme = themes[fit.index];
        const score = fit.value;
        return {
            theme,
            score,
            belowThreshold: score < threshold,
        };
    });
}

function autoThreshold(matrix: number[][]) {
    return 0.4;
    // const maxMax = 0.707;

    // // Find the maximum per column and then minimum of those
    // const maxes = matrix[0].map((_, i) =>
    //     Math.max(...matrix.map((row) => row[i])),
    // );
    // const minMax = Math.min(...maxes);

    // return minMax > maxMax ? maxMax : minMax;
}

interface AllocateThemesBinaryOptions extends AllocateThemeOptions {
    threshold?: number;
    normalize?: boolean;
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
export async function allocateThemesBinary(
    inputs: string[],
    themes: (ShortTheme | Theme)[],
    options?: AllocateThemesBinaryOptions,
): Promise<boolean[][]> {
    let { threshold, ...rest } = options ?? {};
    const similarityResponse = await compareSimilarity(
        inputs,
        themes.map((t) => ('shortLabel' in t ? t.shortLabel : t.label)),
        {
            ...rest,
            split: {
                set_a: {
                    unit: 'word',
                    agg: 'top3',
                    window_size: 4,
                    stride_size: 1,
                },
            },
        },
    );

    if (threshold === undefined) {
        threshold = autoThreshold(similarityResponse.matrix);
    }

    return similarityResponse.matrix.map((row) =>
        row.map((value) => value >= threshold),
    );
}

export async function multiCode(
    inputs: string[],
    themes: ShortTheme[],
    options?: AllocateThemesBinaryOptions,
): Promise<boolean[][]> {
    const matrix = await splitSimilarityMatrix(inputs, themes, options);
    const threshold = options?.threshold ?? autoThreshold(matrix);
    return matrix.map((row) => row.map((value) => value >= threshold));
}

export async function similarityMatrix(
    inputs: string[],
    themes: (ShortTheme | Theme)[],
    options?: AllocateThemesBinaryOptions,
): Promise<number[][]> {
    const similarityResponse = await compareSimilarity(
        inputs,
        themes.map((t) => ('shortLabel' in t ? t.shortLabel : t.label)),
        options,
    );

    return similarityResponse.matrix;
}

interface SplitSimilarityMatrixOptions extends AllocateThemeOptions {
    normalize?: boolean;
}

export async function splitSimilarityMatrix(
    inputs: string[],
    themes: ShortTheme[] | Theme[],
    options?: SplitSimilarityMatrixOptions,
): Promise<number[][]> {
    // Similarity matrix for the segments and each theme
    const similarityResponse = await compareSimilarity(
        inputs,
        // themes.map((t) => t.label),
        themes.map((t) => ('shortLabel' in t ? t.shortLabel : t.label)),
        {
            ...options,
            split: {
                set_a: {
                    unit: 'word',
                    agg: 'top3',
                    window_size: 4,
                    stride_size: 1,
                },
            },
        },
    );

    if (options?.normalize !== false) {
        // Normalize the similarity matrix to be between 0 and 1

        let max = -Infinity;
        let min = Infinity;

        for (const row of similarityResponse.matrix) {
            for (const value of row) {
                if (value > max) {
                    max = value;
                } else if (value < min) {
                    min = value;
                }
            }
        }

        const range = max - min;
        similarityResponse.matrix = similarityResponse.matrix.map((row) =>
            row.map((value) => (value - min) / (range || 1)),
        );
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
                if (j !== t) return;
                if (value > max) {
                    max = value;
                }
            });

            results[i][t] = max;
        });
    });

    return results;
}
