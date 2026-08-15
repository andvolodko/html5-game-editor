const COMPONENT_IDENTITY_KEYS = new Set(["type", "id"]);

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function prefabValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function getValueAtPath(target: unknown, propertyPath: string): unknown {
  const parts = propertyPath.split(".");
  let current: unknown = target;
  for (const part of parts) {
    if (!isPlainObject(current) && !Array.isArray(current)) {
      return undefined;
    }
    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    current = current[part];
  }
  return current;
}

export function setValueAtPath(
  target: Record<string, unknown>,
  propertyPath: string,
  value: unknown,
): void {
  const parts = propertyPath.split(".");
  let current: Record<string, unknown> | unknown[] = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (part === undefined) {
      return;
    }
    const nextPart = parts[index + 1];
    const nextIsIndex = nextPart !== undefined && /^\d+$/.test(nextPart);
    if (Array.isArray(current)) {
      const arrayIndex = Number(part);
      const existing = current[arrayIndex];
      if (!isPlainObject(existing) && !Array.isArray(existing)) {
        current[arrayIndex] = nextIsIndex ? [] : {};
      }
      const created: unknown = current[arrayIndex];
      if (!isPlainObject(created) && !Array.isArray(created)) {
        return;
      }
      current = created;
      continue;
    }
    const existing = current[part];
    if (!isPlainObject(existing) && !Array.isArray(existing)) {
      current[part] = nextIsIndex ? [] : {};
    }
    const created: unknown = current[part];
    if (!isPlainObject(created) && !Array.isArray(created)) {
      return;
    }
    current = created;
  }
  const last = parts[parts.length - 1];
  if (last === undefined) {
    return;
  }
  if (Array.isArray(current)) {
    const arrayIndex = Number(last);
    if (Number.isInteger(arrayIndex) && arrayIndex >= 0) {
      current[arrayIndex] = value;
    }
    return;
  }
  current[last] = value;
}

export function deleteValueAtPath(
  target: Record<string, unknown>,
  propertyPath: string,
): void {
  const parts = propertyPath.split(".");
  const last = parts.pop();
  if (last === undefined) {
    return;
  }
  const parent = parts.length === 0 ? target : getValueAtPath(target, parts.join("."));
  if (isPlainObject(parent)) {
    delete parent[last];
  }
}

export function collectChangedPropertyPaths(
  source: Record<string, unknown>,
  instance: Record<string, unknown>,
  prefix = "",
): string[] {
  const paths: string[] = [];
  const keys = new Set([...Object.keys(source), ...Object.keys(instance)]);
  for (const key of keys) {
    if (prefix === "" && COMPONENT_IDENTITY_KEYS.has(key)) {
      continue;
    }
    const path = prefix.length === 0 ? key : `${prefix}.${key}`;
    const sourceValue = source[key];
    const instanceValue = instance[key];
    if (isPlainObject(sourceValue) && isPlainObject(instanceValue)) {
      paths.push(...collectChangedPropertyPaths(sourceValue, instanceValue, path));
      continue;
    }
    if (!prefabValuesEqual(sourceValue, instanceValue)) {
      paths.push(path);
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
