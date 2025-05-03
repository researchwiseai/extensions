/**
 * Retrieve stored theme sets from user properties.
 * @return {Array<{name: string, themes: Array<{label: string, representatives: string[]}>}>}
 */
export function getThemeSets(): Array<{ name: string; themes: Array<{ label: string; representatives: string[]; }>; }> {
  const props = PropertiesService.getUserProperties();
  const raw = props.getProperty('THEME_SETS');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}
