"use client";

import * as React from "react";
import { Checkbox, Table } from "@heroui/react";

/**
 * Shared admin data table.
 *
 * Every admin list (users / faculty / review / reports / keywords / logs /
 * feedback) used to repeat the same HeroUI plumbing: the `Table >
 * ScrollContainer > Content` shell, the multi-select wiring (including the
 * awkward `keys === "all"` expansion), and a pagination control rendered as a
 * loose sibling *below* the table. This component owns all of that so a page
 * only declares its `Table.Header` + `Table.Body` and passes a `footer`.
 *
 * The shell follows HeroUI's canonical composition: the `Table` root stacks
 * `Table.ScrollContainer` (holding `Table.Content` > `Header` + `Body`) and
 * `Table.Footer` as grid rows, so the bulk bar and pagination live in the
 * table's own footer — not in ad-hoc divs bolted under it. The root uses
 * `variant="secondary"` (no self-applied background/rounding/insets) because
 * the bordered rounded card around it provides the surface.
 *
 * Header/body are forwarded as-is (as `children`) rather than wrapped per
 * column, which keeps HeroUI's React-Aria collection detection working — pages
 * still author their own sortable headers and `ColumnFilter`s inline.
 */

/** Sort descriptor shape accepted by `Table.Content`. */
export interface DataTableSortDescriptor {
  column: string | number;
  direction: "ascending" | "descending";
}

export interface DataTableSelection {
  /** Currently selected row ids. */
  selectedKeys: Set<string>;
  /** Receives the resolved id set — `"all"` is already expanded via `rowIds`. */
  onChange: (keys: Set<string>) => void;
}

export function DataTable({
  ariaLabel,
  rowIds,
  selection,
  sort,
  onSortChange,
  bulkActions,
  footer,
  children,
}: {
  ariaLabel: string;
  /** Ids on the current page — used to expand a "select all" selection. */
  rowIds?: readonly string[];
  selection?: DataTableSelection;
  sort?: DataTableSortDescriptor;
  onSortChange?: (next: DataTableSortDescriptor) => void;
  /** Highlight bar rendered in the table footer, above `footer`, when rows are
   *  selected — bulk actions belong to the table footer, never above it. Pass
   *  the count label + action buttons; the styled wrapper lives here. */
  bulkActions?: React.ReactNode;
  /** Rendered inside the table's own `Table.Footer` bar (e.g. `Pagination` /
   *  `LoadMore`). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-separator">
      <Table variant="secondary">
        <Table.ScrollContainer>
          <Table.Content
            aria-label={ariaLabel}
            selectionMode={selection ? "multiple" : undefined}
            selectedKeys={selection?.selectedKeys}
            onSelectionChange={
              selection
                ? (keys) =>
                    selection.onChange(
                      keys === "all" ? new Set(rowIds) : new Set(keys as Iterable<string>),
                    )
                : undefined
            }
            sortDescriptor={sort}
            onSortChange={onSortChange}
          >
            {children}
          </Table.Content>
        </Table.ScrollContainer>
        {(bulkActions != null || footer != null) && (
          <Table.Footer className="flex-col items-stretch gap-0 px-0 py-0">
            {bulkActions != null && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-separator bg-surface-secondary px-3 py-2">
                {bulkActions}
              </div>
            )}
            {footer != null && <div className="w-full border-t border-separator px-3">{footer}</div>}
          </Table.Footer>
        )}
      </Table>
    </div>
  );
}

/**
 * The repeated checkbox markup for the multi-select column. Not a collection
 * element (only `Table.Column`/`Row`/`Cell` are), so it's safe to hoist out —
 * pages wrap it in their own `Table.Column` (header) or `Table.Cell` (body).
 */
export function SelectionCheckbox({ label }: { label: string }) {
  return (
    <Checkbox slot="selection" aria-label={label}>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  );
}
