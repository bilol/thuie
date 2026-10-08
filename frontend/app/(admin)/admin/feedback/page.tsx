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
import { Download, MessageSquare, RefreshCw } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { Pagination } from "@/components/common/pagination";
import { StatusChip } from "@/components/common/status-chip";
import { OptionSelect } from "@/components/common/option-select";
import { ColumnFilter } from "@/components/common/column-filter";
import { DataTable, SelectionCheckbox } from "@/components/common/data-table";
import { PendingButton } from "@/components/common/pending-button";
import { ItemActionsMenu, type ItemAction } from "@/components/common/item-actions-menu";
import { useAdminFeedback, useReplyFeedback } from "@/features/admin";
import { downloadCsv, type CsvColumn } from "@/lib/export";
import { formatDate, timeAgo } from "@/lib/format";
import { toastSuccess } from "@/lib/feedback";
import { useI18n } from "@/lib/i18n";
import type { AdminFeedback, FeedbackStatus } from "@/lib/api/types";

type SortColumn = "submitter" | "message" | "status" | "created";

const STATUSES: FeedbackStatus[] = ["open", "answered", "closed"];

export default function AdminFeedbackPage() {
  const { t } = useI18n();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(50);
  const [status, setStatus] = React.useState<string>("all");
  const [sort, setSort] = React.useState<{ column: SortColumn; direction: "ascending" | "descending" }>({
    column: "created",
    direction: "descending",
  });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, setPending] = React.useState<{ items: AdminFeedback[]; reply: string; status: FeedbackStatus } | null>(null);
  const [busy, setBusy] = React.useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminFeedback({
    page,
    limit,
    status: status === "all" ? undefined : (status as FeedbackStatus),
  });
  const replyFb = useReplyFeedback();

  const items = data?.data ?? [];
  const meta = data?.meta;
  const fb = t.admin.feedback;

  React.useEffect(() => setSelected(new Set()), [page, status]);

  const sorted = React.useMemo(() => {
    const copy = [...items];
    const dir = sort.direction === "ascending" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sort.column) {
        case "submitter":
          return (a.user?.name || "").localeCompare(b.user?.name || "") * dir;
        case "message":
          return a.content.localeCompare(b.content) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        default:
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
    });
    return copy;
  }, [items, sort]);

  const clearSelection = () => setSelected(new Set());

  const openReply = (targets: AdminFeedback[]) => {
    const first = targets[0];
    const initial: FeedbackStatus = targets.length === 1 && first.status !== "open" ? first.status : "answered";
    setPending({ items: targets, reply: targets.length === 1 ? first.reply ?? "" : "", status: initial });
  };

  const close = () => setPending(null);

  const submit = async () => {
    if (!pending) return;
    const { items: targets, reply, status: next } = pending;
    const body = { reply: reply.trim() || undefined, status: next };
    if (targets.length > 1) {
      setBusy(true);
      try {
        const results = await Promise.allSettled(targets.map((f) => replyFb.mutateAsync({ id: f.id, ...body })));
        const ok = results.filter((x) => x.status === "fulfilled").length;
        toastSuccess(fb.bulkDone(ok, results.length - ok));
        clearSelection();
        close();
      } finally {
        setBusy(false);
      }
      return;
    }
    replyFb.mutate({ id: targets[0].id, ...body }, { onSuccess: close });
  };

  const setStatusOnly = (f: AdminFeedback, next: FeedbackStatus) => replyFb.mutate({ id: f.id, status: next });

  const bulkClose = async () => {
    const targets = sorted.filter((f) => selected.has(f.id) && f.status !== "closed");
    if (targets.length === 0) return;
    setBusy(true);
    try {
      const results = await Promise.allSettled(targets.map((f) => replyFb.mutateAsync({ id: f.id, status: "closed" })));
      const ok = results.filter((x) => x.status === "fulfilled").length;
      toastSuccess(fb.bulkDone(ok, results.length - ok));
      clearSelection();
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const cols: CsvColumn<AdminFeedback>[] = [
      { key: "submitter", header: fb.colSubmitter, value: (f) => f.user?.name ?? t.common.unknown },
      { key: "message", header: fb.colMessage, value: (f) => f.content },
      { key: "reply", header: fb.colReply, value: (f) => f.reply ?? "" },
      { key: "status", header: fb.colStatus, value: (f) => fb.statusOptions[f.status] ?? f.status },
      { key: "created", header: fb.colSubmitted, value: (f) => new Date(f.created_at).toISOString() },
    ];
    downloadCsv("feedback", cols, sorted);
  };

  const rowActions = (f: AdminFeedback): ItemAction[] => {
    const acts: ItemAction[] = [
      { id: "reply", label: fb.reply, icon: <MessageSquare size={14} />, onPress: () => openReply([f]) },
    ];
    if (f.status === "closed") {
      acts.push({ id: "reopen", label: fb.reopen, onPress: () => setStatusOnly(f, "open") });
    } else {
      acts.push({ id: "close", label: fb.close, onPress: () => setStatusOnly(f, "closed") });
    }
    return acts;
  };

  const selectedOpenCount = sorted.filter((f) => selected.has(f.id) && f.status !== "closed").length;

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
        emptyTitle={fb.emptyTitle}
        emptyBody={fb.emptyBody}
        onRetry={() => refetch()}
      >
        <DataTable
          ariaLabel={fb.title}
          rowIds={sorted.map((f) => f.id)}
          selection={{ selectedKeys: selected, onChange: setSelected }}
          sort={sort}
          onSortChange={(next) => setSort({ column: String(next.column) as SortColumn, direction: next.direction })}
          bulkActions={
            selected.size > 0 ? (
              <>
                <span className="text-sm font-medium">{fb.selectedCount(selected.size)}</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onPress={() => openReply(sorted.filter((f) => selected.has(f.id)))}>
                    {fb.reply}
                  </Button>
                  {selectedOpenCount > 0 && (
                    <Button size="sm" variant="tertiary" onPress={bulkClose} isDisabled={busy}>
                      {fb.bulkClose(selectedOpenCount)}
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
                <Table.Column aria-label={fb.selectAll} className="w-10">
                  <SelectionCheckbox label={fb.selectAll} />
                </Table.Column>
                <Table.Column key="submitter" allowsSorting>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>{fb.colSubmitter}</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column key="message" isRowHeader allowsSorting>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>{fb.colMessage}</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column key="status" allowsSorting>
                  {({ sortDirection }) => (
                    <div className="flex items-center gap-1.5">
                      <Table.SortableColumnHeader sortDirection={sortDirection}>{fb.colStatus}</Table.SortableColumnHeader>
                      <ColumnFilter
                        ariaLabel={fb.filterStatusAria}
                        value={status}
                        onChange={(k) => {
                          setStatus(k);
                          setPage(1);
                        }}
                        options={[
                          { key: "all", label: fb.statusOptions.all },
                          { key: "open", label: fb.statusOptions.open },
                          { key: "answered", label: fb.statusOptions.answered },
                          { key: "closed", label: fb.statusOptions.closed },
                        ]}
                      />
                    </div>
                  )}
                </Table.Column>
                <Table.Column key="created" allowsSorting>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>{fb.colSubmitted}</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column>{t.admin.users.colActions}</Table.Column>
              </Table.Header>
              <Table.Body>
                {sorted.map((f) => (
                  <Table.Row key={f.id} id={f.id}>
                    <Table.Cell>
                      <SelectionCheckbox label={fb.selectRow(f.user?.name ?? t.common.unknown)} />
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar size="sm">
                          <Avatar.Fallback>{f.user?.name?.[0] ?? "?"}</Avatar.Fallback>
                        </Avatar>
                        <p className="truncate text-sm font-medium">{f.user?.name ?? t.common.unknown}</p>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="min-w-0 max-w-md">
                        <p className="truncate text-sm" title={f.content}>{f.content}</p>
                        {f.reply && (
                          <p className="truncate text-xs text-muted" title={f.reply}>{f.reply}</p>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusChip status={f.status} />
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap text-muted">
                      <span title={formatDate(f.created_at)}>{timeAgo(f.created_at)}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end">
                        <ItemActionsMenu label={t.admin.users.moreActions} items={rowActions(f)} />
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
                      {pending && pending.items.length > 1 ? fb.bulkReplyTitle : fb.replyTitle}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col gap-3">
                    <p className="text-sm text-muted">{fb.replyHint}</p>
                    <TextField name="feedback-reply">
                      <Label>{fb.replyLabel}</Label>
                      <TextArea rows={4} value={pending?.reply ?? ""} placeholder={fb.replyPlaceholder} onChange={(e) => setPending((p) => (p ? { ...p, reply: e.target.value } : p))} />
                    </TextField>
                    <OptionSelect
                      label={fb.colStatus}
                      ariaLabel={fb.setStatusAria}
                      value={pending?.status ?? "answered"}
                      onChange={(k) => setPending((p) => (p ? { ...p, status: (k ?? "answered") as FeedbackStatus } : p))}
                      options={STATUSES.map((s) => ({ key: s, label: fb.statusOptions[s] }))}
                    />
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="tertiary" onPress={dismiss}>{t.common.cancel}</Button>
                    <PendingButton variant="primary" pending={replyFb.isPending || busy} onPress={submit}>
                      {fb.send}
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
