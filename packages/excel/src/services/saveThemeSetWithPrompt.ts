import type { Theme } from 'pulse-common';
import { saveThemeSet } from 'pulse-common/themes';

interface Props {
    themes: Theme[];
}

export async function saveThemeSetWithPrompt({ themes: themes }: Props) {
    // Set current iso time as the default name
    const now = new Date();
    const isoDate = now.toISOString().replace(/:/g, '-');

    const saveName = window.prompt('Save theme set as:', isoDate);
    if (saveName) {
        const shortThemes = themes.map((t) => ({
            label: t.label,
            representatives: t.representatives,
        }));
        await saveThemeSet(saveName, shortThemes);
    }
}
