import { jest } from '@jest/globals';

jest.mock('../src/auth', () => ({
  isAuthorized: jest.fn(),
}));

let updateMenu: typeof import('../src/updateMenu').updateMenu;
let isAuthorized: jest.Mock;

let createMenuMock: jest.Mock;
let pulseMenuMock: any;
let themesMenuMock: any;
let advMenuMock: any;
let uiMock: any;

beforeAll(async () => {
  updateMenu = (await import('../src/updateMenu')).updateMenu;
  isAuthorized = (await import('../src/auth')).isAuthorized as jest.Mock;
});

beforeEach(() => {
  pulseMenuMock = {
    addItem: jest.fn().mockReturnThis(),
    addSubMenu: jest.fn().mockReturnThis(),
    addSeparator: jest.fn().mockReturnThis(),
    addToUi: jest.fn(),
  };
  themesMenuMock = { addItem: jest.fn().mockReturnThis() };
  advMenuMock = { addItem: jest.fn().mockReturnThis() };
  createMenuMock = jest.fn((name: string) => {
    if (name === 'Pulse') return pulseMenuMock;
    if (name === 'Themes') return themesMenuMock;
    if (name === 'Advanced') return advMenuMock;
    return {};
  });
  uiMock = { createMenu: createMenuMock };
  (global as any).SpreadsheetApp = { getUi: jest.fn(() => uiMock) };
});

afterEach(() => {
  jest.clearAllMocks();
});

test('adds sentiment and themes when authorized', () => {
  isAuthorized.mockReturnValue(true);

  updateMenu();

  expect(createMenuMock).toHaveBeenCalledWith('Pulse');
  expect(createMenuMock).toHaveBeenCalledWith('Themes');
  expect(pulseMenuMock.addItem).toHaveBeenCalledWith('Analyze Sentiment', 'clickAnalyzeSentiment');
  expect(pulseMenuMock.addSubMenu).toHaveBeenCalledWith(themesMenuMock);
  expect(pulseMenuMock.addItem).toHaveBeenCalledWith('Settings', 'showSettingsSidebar');
  expect(pulseMenuMock.addToUi).toHaveBeenCalled();
});

test('only adds settings when not authorized', () => {
  isAuthorized.mockReturnValue(false);

  updateMenu();

  expect(pulseMenuMock.addItem).toHaveBeenCalledTimes(1);
  expect(pulseMenuMock.addItem).toHaveBeenCalledWith('Settings', 'showSettingsSidebar');
  expect(pulseMenuMock.addSubMenu).not.toHaveBeenCalled();
  expect(createMenuMock).toHaveBeenCalledWith('Pulse');
  expect(createMenuMock).not.toHaveBeenCalledWith('Themes');
  expect(createMenuMock).not.toHaveBeenCalledWith('Advanced');
});
