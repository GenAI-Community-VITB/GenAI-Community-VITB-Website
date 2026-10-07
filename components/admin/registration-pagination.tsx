"use client";

import { REGISTRATION_PAGE_SIZES } from "@/lib/utils/registration-pagination";

type Props = {
  page: number; totalPages: number; pageSize: number; total: number; first: number; last: number;
  onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
};

export function RegistrationPagination({ page, totalPages, pageSize, total, first, last, onPageChange, onPageSizeChange }: Props) {
  const button = "rounded-lg border border-[#3a3020] px-3 py-2 text-xs font-semibold text-[#f5b642] hover:bg-[#f5b642]/10 disabled:opacity-35 disabled:cursor-not-allowed";
  return <nav aria-label="Registration pages" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2b2416] bg-[#12100b] p-4">
    <p role="status" aria-live="polite" className="text-sm text-zinc-300">Showing <strong className="text-white">{first}–{last}</strong> of <strong className="text-white">{total}</strong> registrations</p>
    <label className="flex items-center gap-2 text-xs text-zinc-400">Entries per page
      <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))} className="rounded-lg border border-[#3a3020] bg-[#17130b] p-2 text-white">
        {REGISTRATION_PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
      </select>
    </label>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={button} disabled={page === 1} onClick={() => onPageChange(1)}>First</button>
      <button type="button" className={button} disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      <label className="flex items-center gap-2 text-xs text-zinc-400">Page
        <select value={page} onChange={e => onPageChange(Number(e.target.value))} className="rounded-lg border border-[#3a3020] bg-[#17130b] p-2 text-white">
          {Array.from({ length: totalPages }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>of {totalPages}
      </label>
      <button type="button" className={button} disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
      <button type="button" className={button} disabled={page === totalPages} onClick={() => onPageChange(totalPages)}>Last</button>
    </div>
  </nav>;
}
