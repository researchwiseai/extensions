/// <reference types="google-apps-script" />

import { configureClient, configureFetch, configureSleep, configureStorage, FetchOptions, getThemeSets, saveThemeSet, renameThemeSet, deleteThemeSet } from "pulse-common";
import { isAuthorized } from "./auth";
import { WEB_BASE } from "./config";
import { getOAuthService } from "./getOAuthService";
import { showAllocationModeDialog } from "./showAllocationModeDialog";
import { showInputRangeDialog } from "./showInputRangeDialog";
import { generateThemesFlow } from "./generateThemes";

const mapStatusToStatusText = {
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
};

// OAuth2 for Apps Script integration (requires adding the OAuth2 library in appsscript.json)
configureClient({
    baseUrl: 'https://core.researchwiseai.com',
    getAccessToken: async () => getOAuthService().getAccessToken(),
})

configureSleep(async (ms) => Utilities.sleep(ms))

configureStorage({
    delete: async (key: string) => {
        const props = PropertiesService.getUserProperties();
        props.deleteProperty(key);
    },
    get: async (key: string) => {
        const props = PropertiesService.getUserProperties();
        const value = props.getProperty(key);
        if (value) {
            return JSON.parse(value);
        }
        return null;
    },
    set: async (key: string, value: any) => {
        const props = PropertiesService.getUserProperties();
        props.setProperty(key, JSON.stringify(value));
    }
})

configureFetch(async (url: string, options: FetchOptions) => {
    console.log('Fetching URL:', url);
    console.log('Options:', options);

    const response = await UrlFetchApp.fetch(url, {
        payload: options.body,
        method: options.method,
        contentType: options.contentType,
        headers: {
            ...options.headers,
            ...(options.contentType ? { 'Content-Type': options.contentType } : {}),
        },
        muteHttpExceptions: true,
    });

    console.log('Response:', response.getResponseCode());

    return {
        ok: response.getResponseCode() === 200,
        status: response.getResponseCode(),
        statusText: mapStatusToStatusText[response.getResponseCode()] || `Unknown Status: ${response.getResponseCode()}`,
        text: async () => response.getContentText(),
        json: async () => {
            const content = response.getContentText();
            try {
                return JSON.parse(content);
            } catch (e) {
                throw new Error(`Failed to parse JSON response: ${content}`);
            }
        }
    }
})

/**
 * Runs when the add-on is opened or installed: builds menu based on login state.
 */
export function onOpen() {
    const ui = SpreadsheetApp.getUi();
    const pulseMenu = ui.createMenu('Pulse');
    // If user is authorized, expose analysis and themes
    if (getOAuthService().hasAccess()) {
        // Prompt for range before running sentiment analysis
        pulseMenu.addItem('Analyze Sentiment', 'clickAnalyzeSentiment');
        const themesMenu = ui
            .createMenu('Themes')
            .addItem('Generate', 'clickGenerateThemes')
            .addItem('Allocate', 'clickAllocateThemes')
            .addItem('Manage', 'showManageThemesDialog');
        pulseMenu.addSubMenu(themesMenu);
        pulseMenu.addSeparator();
    }
    // Always include settings
    pulseMenu.addItem('Settings', 'showSettingsSidebar');
    pulseMenu.addToUi();
}
export function clickGenerateThemes() {
    showInputRangeDialog("generation");
}

/**
 * Prompts the user to select the input range for theme allocation.
 * 
 * Called by FE
 * 
 */
export function clickAllocateThemes() {
    showInputRangeDialog("allocation");
}
/**
 * Prompts the user to select the input range for sentiment analysis.
 *
 * Called by UI
 */
export function clickAnalyzeSentiment() {
    showInputRangeDialog('sentiment');
}

/**
 * Returns a debounced version of a function that only runs if it hasn’t been
 * called with the same arguments in the last `waitMs` milliseconds.
 */
export function debounceByArgs<F extends (...args: any[]) => any>(
    fn: F,
    waitMs: number
): (...args: Parameters<F>) => ReturnType<F> | void {
    const lastCalled = new Map<string, number>()
    return (...args: Parameters<F>) => {
        const key = JSON.stringify(args)
        const now = Date.now()
        const prev = lastCalled.get(key) ?? 0
        if (now - prev >= waitMs) {
            lastCalled.set(key, now)
            return fn(...args)
        }
    }
}

/**
 * Generates themes for the selected input range.
 * 
 * Called by FE
 * 
 * @param {string} dataRange A1 notation of the data range to allocate.
 * @param {string} mode Allocation mode: 'generation' or 'allocation'
 */
export function themeGenerationRouting(dataRange: string, mode: 'generation' | 'allocation') {
    console.log('submitSelectedInputRangeForGeneration', dataRange, mode);
    if (mode === 'generation') {
        generateThemesFlow(dataRange);
    } else {
        allocateThemesWithRange(dataRange);
    }
}

const debouncedThemeGenerationRouting = debounceByArgs(
    themeGenerationRouting,
    20000
);

export function submitSelectedInputRangeForGeneration(dataRange: string, mode: 'generation' | 'allocation') {
    return debouncedThemeGenerationRouting(dataRange, mode);
}

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
export async function saveManualThemeSet(data: { name: string; themes: Array<{ label: string; rep1: string; rep2: string; }>; }) {
    const themes = data.themes.map(function (th) {
        return {
            label: th.label,
            representatives: [th.rep1 || '', th.rep2 || ''],
        };
    });
    try {
        await saveThemeSet(data.name, themes);
        return { success: true };
    } catch (e) {
        Logger.log('Error saving theme set: ' + e);
        return { success: false };
    }
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
export function showRangeDialog(dataRange: string,  name:string) {
    const template = HtmlService.createTemplateFromFile('RangeDialog');
    template.dataRange = dataRange;
    template.name = name;
    const html = template.evaluate().setWidth(400).setHeight(350);
    SpreadsheetApp.getUi().showModelessDialog(html, 'Custom Theme Ranges');
}
/**
 * Shows a dialog to manage saved theme sets.
 */
export async function showManageThemesDialog() {
    const ui = SpreadsheetApp.getUi();
    const template = HtmlService.createTemplateFromFile('ManageThemes');
    template.themeSets = await getThemeSets();
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

export {
    renameThemeSet,
    deleteThemeSet,
    getThemeSets,
}

export * from './auth'
export { allocateThemesFromSet } from './allocateThemesFromSet'
export { allocateAndSaveThemeSet } from './allocateAndSaveThemeSet'
export { allocateThemesAutomatic } from './allocateThemesAutomatic'
export { analyzeSentimentFlow } from './analyzeSentiment'
export { generateThemesFlow } from './generateThemes'
export { getOAuthService } from './getOAuthService'
export { saveThemeSet } from 'pulse-common'
export { updateMenu } from './updateMenu'
