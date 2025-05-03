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
export async function getThemeSets(): Promise<ThemeSet[]> {
  if (!storage) throw new Error('Storage not configured');
  const sets = await storage.get<ThemeSet[]>(STORAGE_KEY);
  return sets ?? [];
}

/**
 * Save or overwrite a theme set by name.
 */
export async function saveThemeSet(
  name: string,
  themes: Theme[]
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
  newName: string
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

/**
 * Save a manually created theme set (alias for saveThemeSet).
 */
export async function saveManualThemeSet(
  name: string,
  themes: Theme[]
): Promise<void> {
  await saveThemeSet(name, themes);
}