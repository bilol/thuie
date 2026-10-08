"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Avatar,
  Button,
  Chip,
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
import { DataTable, SelectionCheckbox } from "@/components/common/data-table";
import { PendingButton } from "@/components/common/pending-button";
import { ItemActionsMenu, type ItemAction } from "@/components/common/item-actions-menu";
import { useModerationAction, useReviewQueue, useTakedown } from "@/features/admin";
import { downloadCsv, type CsvColumn } from "@/lib/export";
import { timeAgo, formatDate } from "@/lib/format";
import { toastSuccess } from "@/lib/feedback";
import { useI18n } from "@/lib/i18n";
import type { ModerationTargetType, ReviewQueueItem } from "@/lib/api/types";

type SortColumn = "title" | "author" | "type" | "submitted";
type Pending = { items: ReviewQueueItem[]; kind: "reject" | "takedown" } | null;

const rowKey = (i: ReviewQueueItem) => `${i.target_type}:${i.target_id}`;

const REVIEW_TYPES = ["info_post", "forum_post", "comment", "alumni_profile"];
const initialType = (param: string | null) => (REVIEW_TYPES.includes(param ?? "") ? param! : "all");

function ReviewInner() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const paramType = searchParams.get("type");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(50);
  const [type, setType] = React.useState<string>(initialType(paramType));
  React.useEffect(() => setType(initialType(paramType)), [paramType]);
  const [pending, setPending] = React.useState<Pending>(null);
  const [reason, setReason] = React.useState("");
  const [sort, setSort] = React.useState<{ column: SortColumn; direction: "ascending" | "descending" }>({
    column: "submitted",
    direction: "descending",
  });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useReviewQueue({
    page,
    limit,
    type: type === "all" ? undefined : (type as ModerationTargetType),
  });
  const action = useModerationAction();
  const takedown = useTakedown();

  const items = data?.data ?? [];
  const meta = data?.meta;

  React.useEffect(() => setSelected(new Set()), [page, type]);

  const sorted = React.useMemo(() => {
    const copy = [...items];
    const dir = sort.direction === "ascending" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sort.column) {
        case "title":
          return (a.title || "").localeCompare(b.title || "") * dir;
        case "author":
          return ((a.author?.name || "")).localeCompare(b.author?.name || "") * dir;
        case "type":
          return a.target_type.localeCompare(b.target_type) * dir;
        default:
          return (new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()) * dir;
      }
    });
    return copy;
  }, [items, sort]);

  const selectedItems = sorted.filter((i) => selected.has(rowKey(i)));

  const clearSelection = () => setSelected(new Set());

  const runBulk = async (kind: "approve" | "reject") => {
    if (selectedItems.length === 0) return;
    setBusy(true);
    try {
      const results = await Promise.allSettled(
        selectedItems.map((i) =>
          action.mutateAsync({ kind, type: i.target_type, id: i.target_id, reason }),
        ),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      toastSuccess(t.admin.review.bulkDone(ok, results.length - ok));
      clearSelection();
      setPending(null);
      setReason("");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const cols: CsvColumn<ReviewQueueItem>[] = [
      { key: "title", header: t.admin.review.colItem, value: (i) => i.title || t.admin.review.untitled },
      { key: "author", header: t.common.name, value: (i) => i.author?.name ?? t.common.unknown },
      { key: "type", header: t.admin.review.colType, value: (i) => t.admin.review.itemTypes[i.target_type] ?? i.target_type },
      { key: "submitted", header: t.admin.review.colSubmitted, value: (i) => new Date(i.submitted_at).toISOString() },
    ];
    downloadCsv("review-queue", cols, sorted);
  };

  const submitPending = () => {
    if (!pending) return;
    const { items: targets, kind } = pending;
    if (targets.length > 1) {
      void runBulk("reject");
      return;
    }
    const item = targets[0];
    if (kind === "reject") {
      action.mutate({ kind: "reject", type: item.target_type, id: item.target_id, reason });
      close();
    } else {
      takedown.mutate({ target_type: item.target_type, target_id: item.target_id, reason }, { onSuccess: close });
    }
  };

  const close = () => {
    setPending(null);
    setReason("");
  };

  const rowActions = (item: ReviewQueueItem): ItemAction[] => [
    {
      id: "reject",
      label: t.admin.review.reject,
      onPress: () => setPending({ items: [item], kind: "reject" }),
    },
    {
      id: "takedown",
      label: t.admin.review.takeDown,
      tone: "danger",
      onPress: () => setPending({ items: [item], kind: "takedown" }),
    },
  ];

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

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "info_post", "forum_post", "comment", "alumni_profile"] as const).map((key) => (
          <Button key={key} size="sm" variant={type === key ? "primary" : "tertiary"} onPress={() => { setType(key); setPage(1); }}>
            {t.admin.review.optionTypes[key]}
          </Button>
        ))}
      </div>

      <StateBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={items.length === 0}
        emptyTitle={t.admin.review.queueClear}
        emptyBody={t.admin.review.queueClearBody}
        onRetry={() => refetch()}
      >
        <DataTable
          ariaLabel={t.admin.review.title}
          rowIds={sorted.map(rowKey)}
          selection={{ selectedKeys: selected, onChange: setSelected }}
          sort={sort}
          onSortChange={(next) => setSort({ column: String(next.column) as SortColumn, direction: next.direction })}
          bulkActions={
            selected.size > 0 ? (
              <>
                <span className="text-sm font-medium">{t.admin.review.selectedCount(selected.size)}</span>
                <div className="flex items-center gap-2">
                  <PendingButton size="sm" variant="secondary" pending={busy} onPress={() => runBulk("approve")}>
                    {t.admin.review.bulkApprove(selected.size)}
                  </PendingButton>
                  <Button size="sm" variant="danger" onPress={() => setPending({ items: selectedItems, kind: "reject" })}>
                    {t.admin.review.bulkReject(selected.size)}
                  </Button>
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
                <Table.Column aria-label={t.admin.review.selectAll} className="w-10">
                  <SelectionCheckbox label={t.admin.review.selectAll} />
                </Table.Column>
                <Table.Column key="title" isRowHeader allowsSorting>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.review.colItem}</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column key="author" allowsSorting>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>{t.common.name}</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column key="type" allowsSorting>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.review.colType}</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column key="submitted" allowsSorting>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.review.colSubmitted}</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column>{t.admin.users.colActions}</Table.Column>
              </Table.Header>
              <Table.Body>
                {sorted.map((item) => (
                  <Table.Row key={rowKey(item)} id={rowKey(item)}>
                    <Table.Cell>
                      <SelectionCheckbox label={t.admin.review.selectRow(item.title || t.admin.review.untitled)} />
                    </Table.Cell>
                    <Table.Cell>
                      <p className="truncate font-medium">{item.title || t.admin.review.untitled}</p>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar size="sm">
                          {item.author?.avatar_url ? (
                            <Avatar.Image src={item.author.avatar_url} alt={item.author?.name ?? "avatar"} />
                          ) : null}
                          <Avatar.Fallback>{item.author?.name?.[0] ?? "?"}</Avatar.Fallback>
                        </Avatar>
                        <span className="truncate text-sm text-muted">{item.author?.name ?? t.common.unknown}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" variant="tertiary">{t.admin.review.itemTypes[item.target_type] ?? item.target_type}</Chip>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap text-muted">
                      <span title={formatDate(item.submitted_at)}>{timeAgo(item.submitted_at)}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-2">
                        <PendingButton
                          size="sm"
                          variant="primary"
                          pending={action.isPending}
                          onPress={() => action.mutate({ kind: "approve", type: item.target_type, id: item.target_id })}
                        >
                          {t.admin.review.approve}
                        </PendingButton>
                        <ItemActionsMenu label={t.admin.users.moreActions} items={rowActions(item)} />
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
                      {pending && pending.items.length > 1
                        ? t.admin.review.bulkRejectTitle
                        : pending?.kind === "takedown"
                          ? t.admin.review.takedownTitle
                          : t.admin.review.rejectTitle}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col gap-3">
                    <p className="text-sm text-muted">
                      {pending && pending.items.length > 1
                        ? t.admin.review.bulkRejectHint
                        : pending?.kind === "takedown"
                          ? t.admin.review.takedownHint
                          : t.admin.review.rejectHint}
                    </p>
                    <TextField name="reject-reason">
                      <Label>{t.admin.review.reason}</Label>
                      <TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="tertiary" onPress={dismiss}>{t.common.cancel}</Button>
                    <PendingButton
                      variant={pending?.kind === "takedown" ? "danger" : "primary"}
                      pending={action.isPending || takedown.isPending || busy}
                      isDisabled={!reason.trim()}
                      onPress={submitPending}
                    >
                      {t.common.confirm}
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

export default function AdminReviewPage() {
  return (
    <React.Suspense fallback={null}>
      <ReviewInner />
    </React.Suspense>
  );
}
