import { isAuthorized } from './auth';

/**
 * Updates the Pulse menu based on the current authorization state.
 */
export function updateMenu() {
    const ui = SpreadsheetApp.getUi();
    const pulseMenu = ui.createMenu('Pulse');
    if (isAuthorized()) {
        pulseMenu.addItem('Analyze Sentiment', 'clickAnalyzeSentiment');
        const themesMenu = ui
            .createMenu('Themes')
            .addItem('Generate', 'clickGenerateThemes')
            .addItem('Allocate', 'clickAllocateThemes')
            .addItem('Manage', 'showManageThemesDialog');
        pulseMenu.addSubMenu(themesMenu);
        const adv = ui
            .createMenu('Advanced')
            .addItem('Split Sentences', 'splitSentencesCurrent')
            .addItem('Split Tokens', 'splitTokensCurrent')
            .addItem('Count Words', 'countWordsCurrent')
            .addItem('Matrix Allocate', 'matrixThemesAutomaticCurrent')
            .addItem('Matrix From Set', 'matrixThemesFromSetPrompt')
            .addItem('Similarity Matrix', 'similarityMatrixThemesAutomaticCurrent')
            .addItem('Similarity From Set', 'similarityMatrixThemesFromSetPrompt');
        pulseMenu.addSubMenu(adv);
        pulseMenu.addSeparator();
    }
    pulseMenu.addItem('Feed', 'showFeedSidebar');
    pulseMenu.addItem('Settings', 'showSettingsSidebar');
    pulseMenu.addToUi();
}
