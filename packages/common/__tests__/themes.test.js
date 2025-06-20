"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const themes_1 = require("../src/themes");
const storage_1 = require("../src/storage");
/**
 * In-memory Storage implementation for testing.
 */
class MemoryStorage {
    constructor() {
        this.store = new Map();
    }
    async get(key) {
        return this.store.has(key) ? this.store.get(key) : undefined;
    }
    async set(key, value) {
        this.store.set(key, value);
    }
    async delete(key) {
        this.store.delete(key);
    }
}
describe('ThemeSet management', () => {
    const storage = new MemoryStorage();
    beforeAll(() => {
        (0, storage_1.configureStorage)(storage);
    });
    beforeEach(async () => {
        // Clear storage before each test
        await storage.delete('themeSets');
    });
    it('initially has no theme sets', async () => {
        const sets = await (0, themes_1.getThemeSets)();
        expect(sets).toEqual([]);
    });
    it('can save and retrieve a theme set', async () => {
        const themes = [{ label: 'T1', representatives: ['a'] }];
        await (0, themes_1.saveThemeSet)('Set1', themes);
        const sets = await (0, themes_1.getThemeSets)();
        expect(sets).toEqual([{ name: 'Set1', themes }]);
    });
    it('overwrites existing set on save', async () => {
        await (0, themes_1.saveThemeSet)('Set1', [{ label: 'Old', representatives: [] }]);
        await (0, themes_1.saveThemeSet)('Set1', [{ label: 'New', representatives: [] }]);
        const sets = await (0, themes_1.getThemeSets)();
        expect(sets).toEqual([
            { name: 'Set1', themes: [{ label: 'New', representatives: [] }] },
        ]);
    });
    it('can save a manual theme set alias', async () => {
        const manual = [{ label: 'M', representatives: [] }];
        await (0, themes_1.saveManualThemeSet)('Manual', manual);
        const sets = await (0, themes_1.getThemeSets)();
        expect(sets[0].name).toBe('Manual');
        expect(sets[0].themes).toEqual(manual);
    });
    it('can delete a theme set', async () => {
        await (0, themes_1.saveThemeSet)('A', []);
        await (0, themes_1.saveThemeSet)('B', []);
        await (0, themes_1.deleteThemeSet)('A');
        const sets = await (0, themes_1.getThemeSets)();
        expect(sets.map((s) => s.name)).toEqual(['B']);
    });
    it('renameThemeSet renames correctly', async () => {
        await (0, themes_1.saveThemeSet)('Old', []);
        await (0, themes_1.renameThemeSet)('Old', 'New');
        const sets = await (0, themes_1.getThemeSets)();
        expect(sets.map((s) => s.name)).toEqual(['New']);
    });
    it('renameThemeSet throws when oldName not found', async () => {
        await expect((0, themes_1.renameThemeSet)('X', 'Y')).rejects.toThrow('Theme set not found: X');
    });
    it('renameThemeSet throws when newName already exists', async () => {
        await (0, themes_1.saveThemeSet)('A', []);
        await (0, themes_1.saveThemeSet)('B', []);
        await expect((0, themes_1.renameThemeSet)('A', 'B')).rejects.toThrow('Theme set already exists: B');
    });
});
