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
            .addItem('Single Code', 'clickAllocateThemes')
            .addItem('Multi Code', 'clickMatrixThemes')
            .addItem('Similarity Scores', 'clickSimilarityScores')
            .addSeparator()
            .addItem('Theme Sets', 'showManageThemesDialog');
        pulseMenu.addSubMenu(themesMenu);
        const textTools = ui
            .createMenu('Text Tools')
            .addItem('Split Sentences', 'splitSentencesCurrent')
            .addItem('Split Tokens', 'splitTokensCurrent')
            .addItem('Count Words', 'countWordsCurrent');
        pulseMenu.addSubMenu(textTools);
        pulseMenu.addSeparator();
    }
    pulseMenu.addItem('Feed', 'showFeedSidebar');
    pulseMenu.addItem('Settings', 'showSettingsSidebar');
    pulseMenu.addToUi();
}
