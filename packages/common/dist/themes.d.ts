import { Theme } from './apiClient';
export type ShortTheme = Omit<Theme, 'description' | 'shortLabel'>;
export declare const STORAGE_KEY = "themeSets";
/** A named set of themes */
export interface ThemeSet<T = Theme> {
    name: string;
    themes: T[];
}
/**
 * Get all saved theme sets.
 */
export declare function getThemeSets(): Promise<ThemeSet<ShortTheme>[]>;
/**
 * Save or overwrite a theme set by name.
 */
export declare function saveThemeSet(name: string, themes: ShortTheme[]): Promise<void>;
export declare function saveAllThemeSets(themeSets: ThemeSet<ShortTheme | Theme>[]): Promise<void>;
/**
 * Delete a theme set by name.
 */
export declare function deleteThemeSet(name: string): Promise<void>;
/**
 * Rename an existing theme set.
 */
export declare function renameThemeSet(oldName: string, newName: string): Promise<void>;
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
export declare function allocateThemes<T extends ShortTheme>(inputs: string[], themes: T[], options?: AllocateThemeOptions): Promise<Array<{
    theme: T;
    score: number;
}>>;
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
export declare function allocateThemesBinary(inputs: string[], themes: ShortTheme[], options?: AllocateThemesBinaryOptions): Promise<boolean[][]>;
export declare function multiCode(inputs: string[], themes: ShortTheme[], options?: AllocateThemesBinaryOptions): Promise<boolean[][]>;
export declare function similarityMatrix(inputs: string[], themes: ShortTheme[], options?: AllocateThemesBinaryOptions): Promise<number[][]>;
interface SplitSimilarityMatrixOptions extends AllocateThemeOptions {
    normalize?: boolean;
}
export declare function splitSimilarityMatrix(inputs: string[], themes: ShortTheme[], options?: SplitSimilarityMatrixOptions): Promise<number[][]>;
export {};
