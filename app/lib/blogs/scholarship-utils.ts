import { Scholarship } from "@/app/data/scholarships";

export function slugify(value?: string | null): string {
  if (!value) return "";

  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getScholarshipById(
  id: string,
  scholarships: Scholarship[]
): Scholarship | undefined {
  const target = slugify(id);

  return scholarships.find(
    (item) =>
      slugify(item?.id) === target || slugify(item?.name) === target
  );
}

export function extractMonthNumber(deadline?: string | null): number | null {
  if (!deadline) return null;

  const value = String(deadline).toLowerCase().trim();

  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  for (let i = 0; i < months.length; i++) {
    if (value.includes(months[i])) return i + 1;
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return Number(isoMatch[2]);

  return null;
}

export function isDeadlineThisMonth(deadline?: string | null): boolean {
  const month = extractMonthNumber(deadline);
  if (month === null) return false;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  return month === currentMonth;
}

export function matchesSearch(s: Scholarship, query: string): boolean {
  const q = query?.toLowerCase().trim() || "";
  if (!q) return true;

  const haystack = [
    s?.name ?? "",
    s?.country ?? "",
    s?.institution ?? "",
    ...(s?.degreeLevel ?? []),
    ...(s?.fields ?? []),
    ...(s?.tags ?? []),
    s?.funding?.type ?? "",
    s?.status ?? "",
    s?.deadline ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}