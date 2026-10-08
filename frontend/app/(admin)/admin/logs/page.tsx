"use client";

import * as React from "react";
import { Avatar, Button, Chip, Input, Label, Spinner, Table, TextField } from "@heroui/react";
import { Download, RefreshCw, X } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { ConfirmButton } from "@/components/common/confirm-button";
import { Pagination } from "@/components/common/pagination";
import { DataTable } from "@/components/common/data-table";
import { ColumnFilter } from "@/components/common/column-filter";
import { formatDateTime } from "@/lib/format";
import { downloadCsv, type CsvColumn } from "@/lib/export";
import { useI18n } from "@/lib/i18n";
import { useClearLogs, useOperationLogs } from "@/features/admin";
import type { OperationLog } from "@/lib/api/types";

type SortColumn = "created" | "admin" | "action";

function detailSummary(detail: Record<string, unknown>): string {
  const entries = Object.entries(detail ?? {});
  if (entries.length === 0) return "—";
  return entries.map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ");
}

export default function AdminLogsPage() {
  const { t } = useI18n();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(50);
  const [q, setQ] = React.useState("");
  const [action, setAction] = React.useState<string>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [sort, setSort] = React.useState<{ column: SortColumn; direction: "ascending" | "descending" }>({
    column: "created",
    direction: "descending",
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useOperationLogs({ page, limit });
  const clear = useClearLogs();

  const items = data?.data ?? [];
  const meta = data?.meta;

  const actionOptions = React.useMemo(() => {
    const set = new Set(items.map((l) => l.action));
    return [{ key: "all", label: t.admin.logs.allActions }, ...Array.from(set).map((a) => ({ key: a, label: a }))];
  }, [items, t.admin.logs.allActions]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
    return items.filter((l) => {
      if (action !== "all" && l.action !== action) return false;
      const ts = new Date(l.created_at).getTime();
      if (fromTs != null && ts < fromTs) return false;
      if (toTs != null && ts > toTs) return false;
      if (needle) {
        const hay = `${l.admin?.name ?? ""} ${l.action} ${l.target_type ?? ""} ${l.target_id ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [items, q, action, from, to]);

  const sorted = React.useMemo(() => {
    const copy = [...filtered];
    const dir = sort.direction === "ascending" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sort.column) {
        case "admin":
          return (a.admin?.name || "").localeCompare(b.admin?.name || "") * dir;
        case "action":
          return a.action.localeCompare(b.action) * dir;
        default:
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
    });
    return copy;
  }, [filtered, sort]);

  const hasFilters = q !== "" || action !== "all" || from !== "" || to !== "";
  const resetFilters = () => {
    setQ("");
    setAction("all");
    setFrom("");
    setTo("");
  };

  const exportCsv = () => {
    const cols: CsvColumn<OperationLog>[] = [
      { key: "created", header: t.admin.logs.colTime, value: (l) => new Date(l.created_at).toISOString() },
      { key: "admin", header: t.admin.logs.colAdmin, value: (l) => l.admin?.name ?? t.admin.logs.system },
      { key: "action", header: t.admin.logs.colAction, value: (l) => l.action },
      { key: "target_type", header: t.admin.logs.colTarget, value: (l) => l.target_type ?? "" },
      { key: "target_id", header: "ID", value: (l) => l.target_id ?? "" },
      { key: "ip", header: t.admin.logs.colIp, value: (l) => l.ip ?? "" },
      { key: "detail", header: t.admin.logs.colDetail, value: (l) => detailSummary(l.detail) },
    ];
    downloadCsv("operation-logs", cols, sorted);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <TextField aria-label={t.admin.logs.searchAria} className="min-w-[220px] flex-1">
          <Input placeholder={t.admin.logs.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
        </TextField>
        <TextField aria-label={t.admin.logs.fromLabel} className="w-[160px]">
          <Label>{t.admin.logs.fromLabel}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined} />
        </TextField>
        <TextField aria-label={t.admin.logs.toLabel} className="w-[160px]">
          <Label>{t.admin.logs.toLabel}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined} />
        </TextField>
        {hasFilters && (
          <Button size="sm" variant="tertiary" onPress={resetFilters}>
            <X size={14} />
            {t.common.clear}
          </Button>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button isIconOnly size="sm" variant="tertiary" isPending={isFetching} aria-label={t.common.refresh} onPress={() => refetch()}>
          {({ isPending }) => (isPending ? <Spinner color="current" size="sm" /> : <RefreshCw size={16} />)}
        </Button>
        <Button size="sm" variant="tertiary" onPress={exportCsv} isDisabled={sorted.length === 0}>
          <Download size={14} />
          {t.common.exportCsv}
        </Button>
        <ConfirmButton
          title={t.admin.logs.clearConfirmTitle}
          body={t.admin.logs.clearConfirmBody}
          confirmLabel={t.admin.logs.clearLogs}
          color="danger"
          size="sm"
          isLoading={clear.isPending}
          onConfirm={() => clear.mutate(undefined, { onSuccess: () => setPage(1) })}
        >
          {t.admin.logs.clearLogs}
        </ConfirmButton>
      </div>

      <StateBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={items.length === 0}
        emptyTitle={t.admin.logs.emptyTitle}
        onRetry={() => refetch()}
      >
        <DataTable
          ariaLabel={t.admin.logs.title}
          sort={sort}
          onSortChange={(next) => setSort({ column: String(next.column) as SortColumn, direction: next.direction })}
          footer={
            meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                limit={limit}
                onLimitChange={(n) => {
                  setLimit(n);
                  setPage(1);
                }}
                onChange={setPage}
              />
            )
          }
        >
              <Table.Header>
                <Table.Column key="created" isRowHeader allowsSorting>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.logs.colTime}</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column key="admin" allowsSorting>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.logs.colAdmin}</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column key="action" allowsSorting>
                  {({ sortDirection }) => (
                    <div className="flex items-center gap-1.5">
                      <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.logs.colAction}</Table.SortableColumnHeader>
                      <ColumnFilter
                        ariaLabel={t.admin.logs.filterActionAria}
                        value={action}
                        onChange={(k) => setAction(k)}
                        options={actionOptions}
                      />
                    </div>
                  )}
                </Table.Column>
                <Table.Column>{t.admin.logs.colTarget}</Table.Column>
                <Table.Column>{t.admin.logs.colIp}</Table.Column>
                <Table.Column>{t.admin.logs.colDetail}</Table.Column>
              </Table.Header>
              <Table.Body>
                {sorted.map((l) => (
                  <Table.Row key={l.id} id={l.id}>
                    <Table.Cell className="whitespace-nowrap text-muted">{formatDateTime(l.created_at)}</Table.Cell>
                    <Table.Cell>
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar size="sm">
                          {l.admin?.avatar_url ? (
                            <Avatar.Image src={l.admin.avatar_url} alt={l.admin?.name ?? "avatar"} />
                          ) : null}
                          <Avatar.Fallback>{l.admin?.name?.[0] ?? "?"}</Avatar.Fallback>
                        </Avatar>
                        <span className="truncate text-sm">{l.admin?.name ?? t.admin.logs.system}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" variant="tertiary">{l.action}</Chip>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap text-muted">
                      {l.target_type ? `${l.target_type.replace("_", " ")}${l.target_id ? ` · ${l.target_id}` : ""}` : "—"}
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap text-muted">{l.ip ?? "—"}</Table.Cell>
                    <Table.Cell className="max-w-sm truncate text-muted" aria-label={detailSummary(l.detail)}>
                      {detailSummary(l.detail)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
        </DataTable>
      </StateBoundary>
    </div>
  );
}
