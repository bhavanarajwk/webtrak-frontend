/** Shared row extraction used by dashboard and learning modules. */

export function toRows(input: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(input)) return input as Array<Record<string, unknown>>;
  if (!input || typeof input !== "object") return [];
  const o = input as Record<string, unknown>;
  if (Array.isArray(o.items) && o.items.length) {
    return o.items as Array<Record<string, unknown>>;
  }
  if (Array.isArray(o.allocations) && o.allocations.length) {
    return o.allocations as Array<Record<string, unknown>>;
  }
  if (Array.isArray(o.data) && o.data.length) {
    return o.data as Array<Record<string, unknown>>;
  }
  if (Array.isArray(o.content) && o.content.length) {
    return o.content as Array<Record<string, unknown>>;
  }
  for (const key of [
    "rows",
    "results",
    "result",
    "projects",
    "project_list",
    "projectList",
    "manager_projects",
    "managerProjects",
    "team",
    "team_members",
    "teamMembers",
  ] as const) {
    const value = o[key];
    if (Array.isArray(value) && value.length) {
      return value as Array<Record<string, unknown>>;
    }
  }
  return [];
}

export function toPagedRows(input: unknown): Array<Record<string, unknown>> {
  const directRows = toRows(input);
  if (directRows.length) return directRows;
  if (input && typeof input === "object") {
    const dataRows = toRows((input as { data?: unknown }).data);
    if (dataRows.length) return dataRows;
    const nestedDataRows = toRows((input as { data?: { data?: unknown } }).data?.data);
    if (nestedDataRows.length) return nestedDataRows;
    const contentRows = toRows((input as { content?: unknown }).content);
    if (contentRows.length) return contentRows;
  }
  return [];
}

export function extractFirstObjectArray(input: unknown, depth = 0): Array<Record<string, unknown>> {
  if (depth > 8) return [];
  if (Array.isArray(input)) {
    if (input.length && input.every((x) => x !== null && typeof x === "object" && !Array.isArray(x))) {
      return input as Array<Record<string, unknown>>;
    }
    for (const item of input) {
      const inner = extractFirstObjectArray(item, depth + 1);
      if (inner.length) return inner;
    }
    return [];
  }
  if (input !== null && typeof input === "object") {
    for (const v of Object.values(input as Record<string, unknown>)) {
      const inner = extractFirstObjectArray(v, depth + 1);
      if (inner.length) return inner;
    }
  }
  return [];
}
