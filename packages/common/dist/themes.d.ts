import { Theme } from './apiClient';
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
/**
 * Configure the storage backend for theme sets.
 */
export declare function configureStorage(s: Storage): void;
/**
 * Get all saved theme sets.
 */
export declare function getThemeSets(): Promise<ThemeSet<ShortTheme>[]>;
/**
 * Save or overwrite a theme set by name.
 */
export declare function saveThemeSet(name: string, themes: ShortTheme[]): Promise<void>;
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
export {};
