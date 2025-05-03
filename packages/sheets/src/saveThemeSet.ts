import { getThemeSets } from "./getThemeSets";

/**
 * Save or update a named theme set.
 * @param {string} name
 * @param {Array<{label: string, representatives: string[]}>} themes
 * @return {{success: boolean}}
 */
export function saveThemeSet(name: string, themes: Array<{ label: string; representatives: string[]; }>): { success: boolean; } {
  const props = PropertiesService.getUserProperties();
  const sets = getThemeSets().filter(function (s) {
    return s.name !== name;
  });
  sets.push({ name: name, themes: themes });
  props.setProperty('THEME_SETS', JSON.stringify(sets));
  return { success: true };
}
