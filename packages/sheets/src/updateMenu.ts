import { isAuthorized } from './auth';

/**
 * Updates the Pulse menu based on the current authorization state.
 */
export function updateMenu() {
    const ui = SpreadsheetApp.getUi();
    const pulseMenu = ui.createMenu('Pulse');
    if (isAuthorized()) {
        pulseMenu.addItem('Analyze Sentiment', 'analyzeSentiment');
        const themesMenu = ui
            .createMenu('Themes')
            .addItem('Generate', 'generateThemes')
            .addItem('Allocate', 'allocateThemes')
            .addItem('Manage', 'showManageThemesDialog');
        pulseMenu.addSubMenu(themesMenu);
        pulseMenu.addSeparator();
    }
    pulseMenu.addItem('Settings', 'showSettingsSidebar');
    pulseMenu.addToUi();
}
