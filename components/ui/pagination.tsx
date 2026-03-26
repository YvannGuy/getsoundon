"use client";

import Link from "next/link";

type PaginationProps = {
  baseUrl: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  queryParams?: string;
};

type ClientPaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  baseUrl,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  queryParams = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between" aria-label="Pagination">
      <p className="text-sm text-slate-500">
        Affichage de {from} à {to} sur {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={currentPage <= 1 ? "#" : `${baseUrl}?page=${currentPage - 1}${queryParams}`}
          className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            currentPage <= 1
              ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-400"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Précédent
        </Link>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let p: number;
            if (totalPages <= 7) {
              p = i + 1;
            } else if (currentPage <= 4) {
              p = i + 1;
            } else if (currentPage >= totalPages - 3) {
              p = totalPages - 6 + i;
            } else {
              p = currentPage - 3 + i;
            }
            return (
              <Link
                key={p}
                href={`${baseUrl}?page=${p}${queryParams}`}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  p === currentPage
                    ? "bg-gs-orange text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>
        <Link
          href={currentPage >= totalPages ? "#" : `${baseUrl}?page=${currentPage + 1}${queryParams}`}
          className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            currentPage >= totalPages
              ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-400"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Suivant
        </Link>
      </div>
    </nav>
  );
}

export function ClientPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: ClientPaginationProps) {
  if (totalPages <= 1 || totalItems <= 0) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between" aria-label="Pagination">
      <p className="text-sm text-slate-500">
        Affichage de {from} à {to} sur {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            currentPage <= 1
              ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-400"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Précédent
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let p: number;
            if (totalPages <= 7) {
              p = i + 1;
            } else if (currentPage <= 4) {
              p = i + 1;
            } else if (currentPage >= totalPages - 3) {
              p = totalPages - 6 + i;
            } else {
              p = currentPage - 3 + i;
            }
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  p === currentPage
                    ? "bg-gs-orange text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            currentPage >= totalPages
              ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-400"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Suivant
        </button>
      </div>
    </nav>
  );
}
