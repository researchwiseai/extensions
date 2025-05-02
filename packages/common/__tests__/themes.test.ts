import {
  configureStorage,
  getThemeSets,
  saveThemeSet,
  deleteThemeSet,
  renameThemeSet,
  saveManualThemeSet,
  ThemeSet,
  Theme,
  Storage,
} from '../src/themes';

/**
 * In-memory Storage implementation for testing.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, any>();
  async get<T>(key: string): Promise<T | undefined> {
    return this.store.has(key) ? (this.store.get(key) as T) : undefined;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe('ThemeSet management', () => {
  const storage = new MemoryStorage();
  beforeAll(() => {
    configureStorage(storage);
  });
  beforeEach(async () => {
    // Clear storage before each test
    await storage.delete('themeSets');
  });

  it('initially has no theme sets', async () => {
    const sets = await getThemeSets();
    expect(sets).toEqual([]);
  });

  it('can save and retrieve a theme set', async () => {
    const themes: Theme[] = [{ label: 'T1', representatives: ['a'] }];
    await saveThemeSet('Set1', themes);
    const sets = await getThemeSets();
    expect(sets).toEqual<ThemeSet[]>([{ name: 'Set1', themes }]);
  });

  it('overwrites existing set on save', async () => {
    await saveThemeSet('Set1', [{ label: 'Old', representatives: [] }]);
    await saveThemeSet('Set1', [{ label: 'New', representatives: [] }]);
    const sets = await getThemeSets();
    expect(sets).toEqual<ThemeSet[]>([
      { name: 'Set1', themes: [{ label: 'New', representatives: [] }] },
    ]);
  });

  it('can save a manual theme set alias', async () => {
    const manual: Theme[] = [{ label: 'M', representatives: [] }];
    await saveManualThemeSet('Manual', manual);
    const sets = await getThemeSets();
    expect(sets[0].name).toBe('Manual');
    expect(sets[0].themes).toEqual(manual);
  });

  it('can delete a theme set', async () => {
    await saveThemeSet('A', []);
    await saveThemeSet('B', []);
    await deleteThemeSet('A');
    const sets = await getThemeSets();
    expect(sets.map((s) => s.name)).toEqual(['B']);
  });

  it('renameThemeSet renames correctly', async () => {
    await saveThemeSet('Old', []);
    await renameThemeSet('Old', 'New');
    const sets = await getThemeSets();
    expect(sets.map((s) => s.name)).toEqual(['New']);
  });

  it('renameThemeSet throws when oldName not found', async () => {
    await expect(renameThemeSet('X', 'Y')).rejects.toThrow('Theme set not found: X');
  });

  it('renameThemeSet throws when newName already exists', async () => {
    await saveThemeSet('A', []);
    await saveThemeSet('B', []);
    await expect(renameThemeSet('A', 'B')).rejects.toThrow('Theme set already exists: B');
  });
});