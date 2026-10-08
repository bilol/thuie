"use client";

import * as React from "react";
import { Pagination as HeroPagination } from "@heroui/react";
import { OptionSelect } from "@/components/common/option-select";
import { useI18n } from "@/lib/i18n";

/** Offered page sizes — 10 is the usual default, 50 bulk work (= backend cap). */
const PAGE_SIZE_OPTIONS = [10, 25, 50];

/** Page numbers to render: all when short, otherwise first/last + a ±1 window
 *  around the current page, with "ellipsis" gaps in between. */
function getPageNumbers(page: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  if (page > 3) pages.push("ellipsis");
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (page < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onLimitChange,
  onChange,
}: {
  page: number;
  totalPages: number;
  total?: number;
  /** Current page size — the select renders only when this + onChange are set. */
  limit?: number;
  onLimitChange?: (limit: number) => void;
  onChange: (page: number) => void;
}) {
  const { t } = useI18n();

  return (
    <HeroPagination size="sm" className="py-2">
      <HeroPagination.Summary>
        {limit != null && onLimitChange != null && (
          <OptionSelect
            ariaLabel={t.common.perPage}
            className="w-24"
            value={String(limit)}
            onChange={(k) => k != null && onLimitChange(Number(k))}
            options={PAGE_SIZE_OPTIONS.map((n) => ({ key: String(n), label: String(n) }))}
          />
        )}
        <span>
          {t.common.pageOf(page, totalPages)}
          {total != null && <>· {t.common.total(total)}</>}
        </span>
      </HeroPagination.Summary>
      <HeroPagination.Content>
        <HeroPagination.Item>
          <HeroPagination.Previous
            aria-label={t.common.prevPage}
            isDisabled={page <= 1}
            onPress={() => onChange(page - 1)}
          >
            <HeroPagination.PreviousIcon />
          </HeroPagination.Previous>
        </HeroPagination.Item>
        {getPageNumbers(page, totalPages).map((p, i) =>
          p === "ellipsis" ? (
            <HeroPagination.Item key={`ellipsis-${i}`}>
              <HeroPagination.Ellipsis />
            </HeroPagination.Item>
          ) : (
            <HeroPagination.Item key={p}>
              <HeroPagination.Link isActive={p === page} onPress={() => onChange(p)}>
                {p}
              </HeroPagination.Link>
            </HeroPagination.Item>
          ),
        )}
        <HeroPagination.Item>
          <HeroPagination.Next
            aria-label={t.common.nextPage}
            isDisabled={page >= totalPages}
            onPress={() => onChange(page + 1)}
          >
            <HeroPagination.NextIcon />
          </HeroPagination.Next>
        </HeroPagination.Item>
      </HeroPagination.Content>
    </HeroPagination>
  );
}
