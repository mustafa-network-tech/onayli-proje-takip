/** IDs are exact matches; commas, semicolons and whitespace separate IDs. */
export function parseProjectIds(value?: string): string[] {
  return [...new Set((value ?? "").split(/[\s,;]+/).filter(Boolean))];
}

export function projectIdFilter(value?: string) {
  const ids = parseProjectIds(value);
  return ids.length ? { in: ids } : undefined;
}

export function statusMatch(percent: number, status?: string, isCancelled = false) {
  if (status === "cancelled") return isCancelled;
  if (isCancelled) return !status;
  switch (status) {
    case "completed": return percent === 100;
    case "incomplete": return percent < 100;
    case "not_started": return percent === 0;
    case "ongoing": return percent > 0 && percent < 100;
    default: return true;
  }
}
