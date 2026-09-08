export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Deterministic session id: same plan session, same date, always resolves to the same id — so re-opening Today never duplicates a session. */
export function makeSessionId(blockId: string, date: string, type: string, discriminator: string): string {
  return [blockId, date, type, slugify(discriminator)].join("::");
}
