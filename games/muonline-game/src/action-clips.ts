const ACTION_SUFFIX = /_action_(\d+)$/;

/** MU Online clip indices on imported glTF (`*_action_N`). */
export const MU_ACTION_STAY = 0;
export const MU_ACTION_WALK = 1;
export const MU_ACTION_FIGHT = 2;
export const MU_ACTION_SHOCK = 4;
export const MU_ACTION_DIE = 5;

export function clipPrefixFromNames(
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const match = ACTION_SUFFIX.exec(name);
    if (match) {
      return name.slice(0, -match[0].length);
    }
  }
  return names[0];
}

export function actionClipName(
  names: readonly string[],
  actionIndex: number,
  prefix?: string,
): string | undefined {
  const suffix = `_action_${actionIndex}`;
  const found = names.find((name) => name.endsWith(suffix));
  if (found) {
    return found;
  }
  if (prefix !== undefined && prefix.length > 0) {
    return `${prefix}${suffix}`;
  }
  return names[actionIndex] ?? names[0];
}

export function pickRandomClipName(
  names: readonly string[],
  except?: string,
): string | undefined {
  if (names.length === 0) {
    return undefined;
  }
  const pool =
    except === undefined ? names : names.filter((name) => name !== except);
  const choices = pool.length > 0 ? pool : names;
  const index = Math.floor(Math.random() * choices.length);
  return choices[index];
}
