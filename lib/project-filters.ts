/** IDs are exact matches; commas, semicolons and whitespace separate IDs. */
export function parseProjectIds(value?: string): string[] {
  return [...new Set((value ?? "").split(/[\s,;]+/).filter(Boolean))];
}

export function projectIdFilter(value?: string) {
  const ids = parseProjectIds(value);
  return ids.length ? { in: ids } : undefined;
}
