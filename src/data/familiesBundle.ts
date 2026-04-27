import { families, type FamilyEntry } from "@/familiesData";

export type { FamilyEntry };

export function findFamily(email: string): FamilyEntry | undefined {
  const needle = email.toLowerCase().trim();
  return families.find((f) => f.members.some((m) => m.toLowerCase() === needle));
}

export function allFamilies(): FamilyEntry[] {
  return families;
}
