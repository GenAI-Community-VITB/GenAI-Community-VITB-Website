import type { Payment, Registration } from "@/lib/types";

export const REGISTRATION_PAGE_SIZES = [10, 25, 50] as const;

export function paginateRegistrations<T>(rows: T[], requestedPage: number, requestedSize: number) {
  const pageSize = REGISTRATION_PAGE_SIZES.includes(requestedSize as 10 | 25 | 50) ? requestedSize : 50;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1));
  const offset = (page - 1) * pageSize;
  return { rows: rows.slice(offset, offset + pageSize), page, pageSize, totalPages, total: rows.length,
    first: rows.length ? offset + 1 : 0, last: Math.min(offset + pageSize, rows.length) };
}

export function filterFinanceRegistrations<T extends Registration & { payments?: Payment[] }>(
  rows: T[], filters: { status: string; source: string; branch: string; search: string },
): T[] {
  const search = filters.search.toLowerCase().trim();
  return rows.filter(reg => {
    if (filters.status !== "all" && reg.registration_status !== filters.status) return false;
    if (filters.source !== "all" && (reg.registration_source || "online") !== filters.source) return false;
    if (filters.branch !== "all" && reg.branch_name !== filters.branch) return false;
    return !search || [reg.full_name, reg.vit_registration_number, reg.personal_email, reg.college_email,
      reg.registration_number, ...(reg.payments || []).map(p => p.transaction_id)]
      .some(value => (value || "").toLowerCase().includes(search));
  });
}
