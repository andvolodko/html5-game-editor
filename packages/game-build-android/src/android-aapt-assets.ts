/**
 * Android WebView cannot serve hidden `.generated/` directories even when
 * aapt includes them. Production URLs use `_generated/` instead.
 */
export function withAaptAllowGeneratedAssets(gradle: string): string {
  const match = /ignoreAssetsPattern\s+(['"])([^'"]*)\1/.exec(gradle);
  if (!match || match.index === undefined) {
    return gradle;
  }
  const quote = match[1];
  const pattern = match[2];
  if (pattern === undefined || quote === undefined) {
    return gradle;
  }
  if (/(?:^|:)!\.generated(?::|$)/.test(pattern)) {
    return gradle;
  }
  const next = pattern.includes(".*")
    ? pattern.replace(".*", "!.generated:.*")
    : `${pattern}:!.generated`;
  const start = match.index;
  const end = start + match[0].length;
  return `${gradle.slice(0, start)}ignoreAssetsPattern ${quote}${next}${quote}${gradle.slice(end)}`;
}
