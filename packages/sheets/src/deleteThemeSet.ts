import { getThemeSets } from "./getThemeSets";

/**
 * Delete a named theme set.
 * @param {string} name
 * @return {{success: boolean}}
 */
export function deleteThemeSet(name: string): { success: boolean; } {
  const props = PropertiesService.getUserProperties();
  const sets = getThemeSets().filter(function (s) {
    return s.name !== name;
  });
  props.setProperty('THEME_SETS', JSON.stringify(sets));
  return { success: true };
}
