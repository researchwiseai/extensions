/// <reference types="google-apps-script" />

import { isAuthorized } from "./auth";
import { WEB_BASE } from "./config";
import { getOAuthService } from "./getOAuthService";
import { getThemeSets } from "./getThemeSets";
import { saveThemeSet } from "./saveThemeSet";
import { showAllocationModeDialog } from "./showAllocationModeDialog";
import { showInputRangeDialog } from "./showInputRangeDialog";

// OAuth2 for Apps Script integration (requires adding the OAuth2 library in appsscript.json)

/**
 * Runs when the add-on is opened or installed: builds menu based on login state.
 */
export function onOpen() {
    const ui = SpreadsheetApp.getUi();
    const pulseMenu = ui.createMenu('Pulse');
    // If user is authorized, expose analysis and themes
    if (getOAuthService().hasAccess()) {
        pulseMenu.addItem('Analyze Sentiment', 'analyzeSentiment');
        const themesMenu = ui
            .createMenu('Themes')
            .addItem('Generate', 'generateThemes')
            .addItem('Allocate', 'allocateThemes')
            .addItem('Manage', 'showManageThemesDialog');
        pulseMenu.addSubMenu(themesMenu);
        pulseMenu.addSeparator();
    }
    // Always include settings
    pulseMenu.addItem('Settings', 'showSettingsSidebar');
    pulseMenu.addToUi();
}
/**
 * Prompts the user to select the input range for theme allocation.
 * 
 * Called by FE
 * 
 */
export function allocateThemes() {
    showInputRangeDialog();
}
/**
 * Callback after input range is selected; opens dialog to pick custom theme ranges.
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
/**
 * Callback after input range is selected; opens dialog to choose allocation mode.
 * 
 * Called by FE
 * 
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
export function allocateThemesWithRange(dataRange: string) {
    showAllocationModeDialog(dataRange);
}
/**
 * Save a manually created theme set.
 * 
 * Called by FE
 * 
 * @param {{name: string, themes: Array<{label: string, rep1: string, rep2: string}>}} data
 * @return {{success: boolean}}
 */
export function saveManualThemeSet(data: { name: string; themes: Array<{ label: string; rep1: string; rep2: string; }>; }): { success: boolean; } {
    const themes = data.themes.map(function (th) {
        return {
            label: th.label,
            representatives: [th.rep1 || '', th.rep2 || ''],
        };
    });
    return saveThemeSet(data.name, themes);
}
/**
 * Rename an existing theme set.
 * 
 * Called by FE
 * 
 * @param {string} oldName
 * @param {string} newName
 * @return {{success: boolean}}
 */
export function renameThemeSet(oldName: string, newName: string): { success: boolean; } {
    const props = PropertiesService.getUserProperties();
    const sets = getThemeSets();
    for (let i = 0; i < sets.length; i++) {
        if (sets[i].name === oldName) {
            sets[i].name = newName;
            break;
        }
    }
    props.setProperty('THEME_SETS', JSON.stringify(sets));
    return { success: true };
}
/**
 * Runs when the add-on is installed.
 * 
 * Hook
 */
export function onInstall() {
    onOpen();
}

/**
 * Opens the settings sidebar.
 * 
 * // Called by FE
 * 
 */
export function showSettingsSidebar() {
    // Pass webBase to the HTML template for registration links
    const template = HtmlService.createTemplateFromFile('Settings');
    template.webBase = WEB_BASE;
    const html = template.evaluate().setTitle('Pulse');
    SpreadsheetApp.getUi().showSidebar(html);
}
/**
 * Retrieves stored user email and authorization status.
 * 
 * // Called by FE
 * 
 * @return {{email: string, isAuthorized: boolean}}
 */
export function getSettings(): { email: string; isAuthorized: boolean; } {
    const props = PropertiesService.getUserProperties();
    return {
        email: props.getProperty('USER_EMAIL') || '',
        isAuthorized: isAuthorized(),
    };
}

/**
 * Shows a modeless dialog to collect custom theme ranges.
 * @param {string} dataRange A1 notation of the data range to allocate.
 */
export function showRangeDialog(dataRange: string) {
    const template = HtmlService.createTemplateFromFile('RangeDialog');
    template.dataRange = dataRange;
    const html = template.evaluate().setWidth(400).setHeight(350);
    SpreadsheetApp.getUi().showModelessDialog(html, 'Custom Theme Ranges');
}
/**
 * Shows a dialog to manage saved theme sets.
 */
export function showManageThemesDialog() {
    const ui = SpreadsheetApp.getUi();
    const template = HtmlService.createTemplateFromFile('ManageThemes');
    template.themeSets = getThemeSets();
    template.dataRange = getActiveRangeA1Notation();
    const html = template.evaluate().setWidth(500).setHeight(500);
    ui.showModelessDialog(html, 'Manage Theme Sets');
}
/**
 * Returns the A1 notation of the current active selection, prefixed with sheet name.
 * @return {string} e.g. 'Sheet1!A1:B10'
 */
export function getActiveRangeA1Notation(): string {
    const range = SpreadsheetApp.getActiveRange();
    const sheet = range.getSheet();
    return `${sheet.getName()}!${range.getA1Notation()}`;
}

export * from './auth'
export { allocateAndSaveThemeSet } from './allocateAndSaveThemeSet'
export { allocateThemesFromSet } from './allocateThemesFromSet'
export { allocateThemesAutomatic } from './allocateThemesAutomatic'
export { analyzeSentiment } from './analyzeSentiment'
export { processCustomThemes } from './processCustomThemes'
export { getThemeSets } from './getThemeSets'
export { generateThemes } from './generateThemes'
export { getOAuthService } from './getOAuthService'
export { saveThemeSet } from './saveThemeSet'
export { updateMenu } from './updateMenu'
export { deleteThemeSet } from './deleteThemeSet'