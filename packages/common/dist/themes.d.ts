import { Theme } from "./apiClient.js";
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
/** A named set of themes */
export interface ThemeSet {
    name: string;
    themes: Theme[];
}
/**
 * Configure the storage backend for theme sets.
 */
export declare function configureStorage(s: Storage): void;
/**
 * Get all saved theme sets.
 */
export declare function getThemeSets(): Promise<ThemeSet[]>;
/**
 * Save or overwrite a theme set by name.
 */
export declare function saveThemeSet(name: string, themes: Theme[]): Promise<void>;
/**
 * Delete a theme set by name.
 */
export declare function deleteThemeSet(name: string): Promise<void>;
/**
 * Rename an existing theme set.
 */
export declare function renameThemeSet(oldName: string, newName: string): Promise<void>;
/**
 * Save a manually created theme set (alias for saveThemeSet).
 */
export declare function saveManualThemeSet(name: string, themes: Theme[]): Promise<void>;
/**
 * Allocate groups (themes) from a similarity matrix by thresholding and
 * finding connected components.
 * @param matrix Similarity matrix to process.
 * @param threshold Threshold value for binarization.
 * @param inclusive Whether to include values equal to the threshold.
 * @returns Array of clusters, each cluster is an array of indices.
 */
export declare function allocateThemesByThreshold(matrix: number[][], threshold: number, inclusive?: boolean): number[][];
