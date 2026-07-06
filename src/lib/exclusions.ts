// Central place that decides whether a contact is internal / should never be tracked.
// The @smart-bricks.com domain is always excluded; the ExcludedContact table adds more.

import { prisma } from "@/lib/prisma";

// Always excluded, even with an empty table.
export const DEFAULT_EXCLUDED_DOMAINS = ["smart-bricks.com"];

export type ExclusionSet = {
  domains: Set<string>;
  emails: Set<string>;
  phones: Set<string>;
};

export async function loadExclusions(): Promise<ExclusionSet> {
  const rows = await prisma.excludedContact.findMany();
  return {
    domains: new Set([
      ...DEFAULT_EXCLUDED_DOMAINS,
      ...rows.filter((r) => r.kind === "DOMAIN").map((r) => r.value.toLowerCase()),
    ]),
    emails: new Set(rows.filter((r) => r.kind === "EMAIL").map((r) => r.value.toLowerCase())),
    phones: new Set(rows.filter((r) => r.kind === "PHONE").map((r) => r.value.replace(/\D/g, ""))),
  };
}

export function isExcluded(
  email: string | null | undefined,
  phone: string | null | undefined,
  ex: ExclusionSet,
): boolean {
  const e = email?.trim().toLowerCase();
  if (e) {
    if (ex.emails.has(e)) return true;
    const domain = e.split("@")[1];
    if (domain && ex.domains.has(domain)) return true;
  }
  const p = phone?.replace(/\D/g, "");
  if (p && ex.phones.has(p)) return true;
  return false;
}
