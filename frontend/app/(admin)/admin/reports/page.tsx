"use client";

import * as React from "react";
import {
  Avatar,
  Button,
  Label,
  Modal,
  Spinner,
  Table,
  TextArea,
  TextField,
} from "@heroui/react";
import { Download, RefreshCw } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { Pagination } from "@/components/common/pagination";
import { StatusChip } from "@/components/common/status-chip";
import { OptionSelect } from "@/components/common/option-select";
import { ColumnFilter } from "@/components/common/column-filter";
import { DataTable, SelectionCheckbox } from "@/components/common/data-table";
import { PendingButton } from "@/components/common/pending-button";
import { ItemActionsMenu, type ItemAction } from "@/components/common/item-actions-menu";
import { useAdminReports, useResolveReport } from "@/features/admin";
import { downloadCsv, type CsvColumn } from "@/lib/export";
import { formatDate, timeAgo } from "@/lib/format";
import { toastSuccess } from "@/lib/feedback";
import { useI18n } from "@/lib/i18n";
import type { Report, ReportStatus } from "@/lib/api/types";

type Outcome = "ignored" | "deleted" | "restricted";
type SortColumn = "reporter" | "target" | "status" | "created";

const OUTCOMES: Outcome[] = ["ignored", "deleted", "restricted"];

export default function AdminReportsPage() {
  const { t } = useI18n();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(50);
  const [status, setStatus] = React.useState<string>("open");
  const [pending, setPending] = React.useState<{ reports: Report[]; outcome: Outcome } | null>(null);
  const [note, setNote] = React.useState("");
  const [sort, setSort] = React.useState<{ column: SortColumn; direction: "ascending" | "descending" }>({
    column: "created",
    direction: "descending",
  });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminReports({
    page,
    limit,
    status: status === "all" ? undefined : (status as ReportStatus),
  });
  const resolve = useResolveReport();

  const items = data?.data ?? [];
  const meta = data?.meta;

  React.useEffect(() => setSelected(new Set()), [page, status]);

  const sorted = React.useMemo(() => {
    const copy = [...items];
    const dir = sort.direction === "ascending" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sort.column) {
        case "reporter":
          return (a.reporter?.name || "").localeCompare(b.reporter?.name || "") * dir;
        case "target":
          return a.target_type.localeCompare(b.target_type) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        default:
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
    });
    return copy;
  }, [items, sort]);

  const selectedOpen = sorted.filter((r) => r.status === "open" && selected.has(r.id));

  const clearSelection = () => setSelected(new Set());

  const openResolve = (reports: Report[], outcome: Outcome) => {
    setNote("");
    setPending({ reports, outcome });
  };

  const close = () => {
    setPending(null);
    setNote("");
  };

  const submitResolve = async () => {
    if (!pending) return;
    const { reports, outcome } = pending;
    if (reports.length > 1) {
      setBusy(true);
      try {
        const results = await Promise.allSettled(
          reports.map((r) => resolve.mutateAsync({ id: r.id, outcome, note: note.trim() || undefined })),
        );
        const ok = results.filter((x) => x.status === "fulfilled").length;
        toastSuccess(t.admin.reports.bulkDone(ok, results.length - ok));
        clearSelection();
        close();
      } finally {
        setBusy(false);
      }
      return;
    }
    resolve.mutate(
      { id: reports[0].id, outcome, note: note.trim() || undefined },
      { onSuccess: close },
    );
  };

  const exportCsv = () => {
    const cols: CsvColumn<Report>[] = [
      { key: "reporter", header: t.admin.reports.colReporter, value: (r) => r.reporter?.name ?? t.common.unknown },
      { key: "target", header: t.admin.reports.colTarget, value: (r) => t.admin.reports.targetTypes[r.target_type] ?? r.target_type },
      { key: "reason", header: t.admin.reports.colReason, value: (r) => r.reason },
      { key: "status", header: t.admin.reports.colStatus, value: (r) => t.admin.reports.statusOptions[r.status] ?? r.status },
      { key: "note", header: t.admin.reports.note, value: (r) => r.result_note ?? "" },
      { key: "created", header: t.admin.reports.colCreated, value: (r) => new Date(r.created_at).toISOString() },
    ];
    downloadCsv("reports", cols, sorted);
  };

  const rowActions = (r: Report): ItemAction[] =>
    r.status === "open"
      ? OUTCOMES.map((o) => ({
          id: o,
          label:
            o === "ignored" ? t.admin.reports.ignore : o === "deleted" ? t.admin.reports.deleteTarget : t.admin.reports.restrictUser,
          tone: o === "deleted" ? "danger" : "default",
          onPress: () => openResolve([r], o),
        }))
      : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button isIconOnly size="sm" variant="tertiary" isPending={isFetching} aria-label={t.common.refresh} onPress={() => refetch()}>
          {({ isPending }) => (isPending ? <Spinner color="current" size="sm" /> : <RefreshCw size={16} />)}
        </Button>
        <Button size="sm" variant="tertiary" className="ml-auto" onPress={exportCsv} isDisabled={sorted.length === 0}>
          <Download size={14} />
          {t.common.exportCsv}
        </Button>
      </div>

      <StateBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={items.length === 0}
        emptyTitle={t.admin.reports.emptyTitle}
        emptyBody={t.admin.reports.emptyBody}
        onRetry={() => refetch()}
      >
        <DataTable
          ariaLabel={t.admin.reports.title}
          rowIds={sorted.map((r) => r.id)}
          selection={{ selectedKeys: selected, onChange: setSelected }}
          sort={sort}
          onSortChange={(next) => setSort({ column: String(next.column) as SortColumn, direction: next.direction })}
          bulkActions={
            selected.size > 0 ? (
              <>
                <span className="text-sm font-medium">{t.admin.reports.selectedCount(selected.size)}</span>
                <div className="flex items-center gap-2">
                  {selectedOpen.length > 0 && (
                    <Button size="sm" variant="secondary" onPress={() => openResolve(selectedOpen, "ignored")}>
                      {t.admin.reports.bulkResolve(selectedOpen.length)}
                    </Button>
                  )}
                </div>
              </>
            ) : undefined
          }
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
                <Table.Column aria-label={t.admin.reports.selectAll} className="w-10">
                  <SelectionCheckbox label={t.admin.reports.selectAll} />
                </Table.Column>
                <Table.Column key="reporter" isRowHeader allowsSorting>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.reports.colReporter}</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column key="target" allowsSorting>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.reports.colTarget}</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column key="status" allowsSorting>
                  {({ sortDirection }) => (
                    <div className="flex items-center gap-1.5">
                      <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.reports.colStatus}</Table.SortableColumnHeader>
                      <ColumnFilter
                        ariaLabel={t.admin.reports.filterStatusAria}
                        value={status}
                        onChange={(k) => {
                          setStatus(k);
                          setPage(1);
                        }}
                        options={[
                          { key: "all", label: t.admin.reports.statusOptions.all },
                          { key: "open", label: t.admin.reports.statusOptions.open },
                          { key: "resolved_ignored", label: t.admin.reports.statusOptions.resolved_ignored },
                          { key: "resolved_deleted", label: t.admin.reports.statusOptions.resolved_deleted },
                          { key: "resolved_restricted", label: t.admin.reports.statusOptions.resolved_restricted },
                        ]}
                      />
                    </div>
                  )}
                </Table.Column>
                <Table.Column key="created" allowsSorting>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.reports.colCreated}</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column>{t.admin.users.colActions}</Table.Column>
              </Table.Header>
              <Table.Body>
                {sorted.map((r) => (
                  <Table.Row key={r.id} id={r.id}>
                    <Table.Cell>
                      <SelectionCheckbox label={t.admin.reports.selectRow(r.reporter?.name ?? t.common.unknown)} />
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar size="sm">
                          {r.reporter?.avatar_url ? (
                            <Avatar.Image src={r.reporter.avatar_url} alt={r.reporter?.name ?? "avatar"} />
                          ) : null}
                          <Avatar.Fallback>{r.reporter?.name?.[0] ?? "?"}</Avatar.Fallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{r.reporter?.name ?? t.common.unknown}</p>
                          <p className="truncate text-xs text-muted">{r.reason}</p>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap text-muted">
                      {t.admin.reports.targetTypes[r.target_type] ?? r.target_type.replace("_", " ")}
                    </Table.Cell>
                    <Table.Cell>
                      <StatusChip status={r.status} />
                      {r.result_note && (
                        <p className="mt-1 max-w-xs truncate text-xs text-muted">{t.admin.reports.resolution(r.result_note)}</p>
                      )}
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap text-muted">
                      <span title={formatDate(r.created_at)}>{timeAgo(r.created_at)}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end">
                        <ItemActionsMenu label={t.admin.users.moreActions} items={rowActions(r)} />
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
        </DataTable>
      </StateBoundary>

      <Modal>
        <Modal.Backdrop isOpen={!!pending} onOpenChange={(o) => { if (!o) close(); }} isDismissable>
          <Modal.Container size="sm">
            <Modal.Dialog>
              {({ close: dismiss }) => (
                <>
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading className="text-base font-semibold">
                      {pending && pending.reports.length > 1
                        ? t.admin.reports.bulkResolveTitle
                        : t.admin.reports.resolveTitle}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col gap-3">
                    <OptionSelect
                      label={t.admin.reports.resolve}
                      ariaLabel={t.admin.reports.resolve}
                      value={pending?.outcome ?? "ignored"}
                      onChange={(k) => setPending((p) => (p ? { ...p, outcome: (k ?? "ignored") as Outcome } : p))}
                      options={OUTCOMES.map((o) => ({ key: o, label: t.admin.reports.outcomes[o] }))}
                    />
                    <p className="text-sm text-muted">
                      {t.admin.reports.outcomeLine(pending ? t.admin.reports.outcomes[pending.outcome] : "")}
                    </p>
                    <TextField name="resolve-note">
                      <Label>{t.admin.reports.note}</Label>
                      <TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="tertiary" onPress={dismiss}>{t.common.cancel}</Button>
                    <PendingButton
                      variant="primary"
                      pending={resolve.isPending || busy}
                      onPress={submitResolve}
                    >
                      {t.admin.reports.resolve}
                    </PendingButton>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
