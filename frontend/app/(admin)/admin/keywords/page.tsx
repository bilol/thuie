"use client";

import * as React from "react";
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  Switch,
  Table,
  TextField,
} from "@heroui/react";
import { Download, Plus, Trash2 } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { ConfirmButton } from "@/components/common/confirm-button";
import { OptionSelect } from "@/components/common/option-select";
import { ColumnFilter } from "@/components/common/column-filter";
import { DataTable, SelectionCheckbox } from "@/components/common/data-table";
import { ApiErrorAlert } from "@/components/common/alerts";
import { PendingButton } from "@/components/common/pending-button";
import { downloadCsv, type CsvColumn } from "@/lib/export";
import { toastSuccess } from "@/lib/feedback";
import { useKeywordMutations, useKeywords } from "@/features/admin";
import { useI18n } from "@/lib/i18n";
import type { Keyword, KeywordAction } from "@/lib/api/types";

type SortColumn = "word" | "action" | "enabled";

export default function AdminKeywordsPage() {
  const { t } = useI18n();
  const { data, isLoading, isError, error, refetch } = useKeywords();
  const { create, update, remove } = useKeywordMutations();

  const [word, setWord] = React.useState("");
  const [action, setAction] = React.useState<KeywordAction>("block");
  const [q, setQ] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState<string>("all");
  const [enabledFilter, setEnabledFilter] = React.useState<string>("all");
  const [sort, setSort] = React.useState<{ column: SortColumn; direction: "ascending" | "descending" }>({
    column: "word",
    direction: "ascending",
  });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  const items = data ?? [];

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((k) => {
      if (actionFilter !== "all" && k.action !== actionFilter) return false;
      if (enabledFilter === "enabled" && !k.enabled) return false;
      if (enabledFilter === "disabled" && k.enabled) return false;
      if (needle && !k.word.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, q, actionFilter, enabledFilter]);

  const sorted = React.useMemo(() => {
    const copy = [...filtered];
    const dir = sort.direction === "ascending" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sort.column) {
        case "action":
          return a.action.localeCompare(b.action) * dir;
        case "enabled":
          return (Number(a.enabled) - Number(b.enabled)) * dir;
        default:
          return a.word.localeCompare(b.word) * dir;
      }
    });
    return copy;
  }, [filtered, sort]);

  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => remove.mutateAsync(id)));
      const ok = results.filter((r) => r.status === "fulfilled").length;
      toastSuccess(t.admin.reports.bulkDone(ok, results.length - ok));
      clearSelection();
    } finally {
      setBulkDeleting(false);
    }
  };

  const exportCsv = () => {
    const cols: CsvColumn<Keyword>[] = [
      { key: "word", header: t.admin.keywords.keywordLabel, value: (k) => k.word },
      { key: "action", header: t.admin.keywords.actionAria, value: (k) => k.action },
      { key: "enabled", header: t.admin.keywords.enabled, value: (k) => (k.enabled ? "true" : "false") },
    ];
    downloadCsv("keywords", cols, sorted);
  };

  return (
    <div className="space-y-4">
      <Card>
        <Card.Content className="gap-3">
          {create.isError && <ApiErrorAlert error={create.error} />}
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const w = word.trim();
              if (!w) return;
              create.mutate({ word: w, action, enabled: true }, { onSuccess: () => setWord("") });
            }}
          >
            <TextField name="keyword" className="min-w-[200px] flex-1">
              <Label>{t.admin.keywords.keywordLabel}</Label>
              <Input placeholder={t.admin.keywords.keywordPlaceholder} value={word} onChange={(e) => setWord(e.target.value)} />
            </TextField>
            <OptionSelect
              label={t.admin.keywords.actionAria}
              ariaLabel={t.admin.keywords.actionAria}
              className="w-[180px]"
              value={action}
              onChange={(k) => setAction((k ?? "block") as KeywordAction)}
              options={[
                { key: "block", label: t.admin.keywords.actions.block },
                { key: "manual_review", label: t.admin.keywords.actions.manual_review },
              ]}
            />
            <PendingButton type="submit" variant="primary" pending={create.isPending}>
              <Plus size={16} />
              {t.common.add}
            </PendingButton>
          </form>
        </Card.Content>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <TextField aria-label={t.admin.keywords.searchAria} className="max-w-xs">
          <Input placeholder={t.admin.keywords.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
        </TextField>
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
        emptyTitle={t.admin.keywords.emptyTitle}
        onRetry={() => refetch()}
      >
        <DataTable
          ariaLabel={t.admin.keywords.title}
          rowIds={sorted.map((k) => k.id)}
          selection={{ selectedKeys: selected, onChange: setSelected }}
          sort={sort}
          onSortChange={(next) => setSort({ column: String(next.column) as SortColumn, direction: next.direction })}
          bulkActions={
            selected.size > 0 ? (
              <>
                <span className="text-sm font-medium">{t.admin.keywords.selectedCount(selected.size)}</span>
                <div className="flex items-center gap-2">
                  <ConfirmButton
                    title={t.admin.keywords.bulkDeleteConfirm(selected.size)}
                    confirmLabel={t.common.delete}
                    color="danger"
                    size="sm"
                    isLoading={bulkDeleting}
                    onConfirm={handleBulkDelete}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Trash2 size={14} /> {t.admin.keywords.bulkDelete(selected.size)}
                    </span>
                  </ConfirmButton>
                </div>
              </>
            ) : undefined
          }
        >
              <Table.Header>
                <Table.Column aria-label={t.admin.keywords.selectAll} className="w-10">
                  <SelectionCheckbox label={t.admin.keywords.selectAll} />
                </Table.Column>
                <Table.Column key="word" isRowHeader allowsSorting>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.keywords.keywordLabel}</Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column key="action" allowsSorting>
                  {({ sortDirection }) => (
                    <div className="flex items-center gap-1.5">
                      <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.keywords.actionAria}</Table.SortableColumnHeader>
                      <ColumnFilter
                        ariaLabel={t.admin.keywords.filterActionAria}
                        value={actionFilter}
                        onChange={(k) => setActionFilter(k)}
                        options={[
                          { key: "all", label: t.admin.keywords.allActions },
                          { key: "block", label: t.admin.keywords.actions.block },
                          { key: "manual_review", label: t.admin.keywords.actions.manual_review },
                        ]}
                      />
                    </div>
                  )}
                </Table.Column>
                <Table.Column key="enabled" allowsSorting>
                  {({ sortDirection }) => (
                    <div className="flex items-center gap-1.5">
                      <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.keywords.enabled}</Table.SortableColumnHeader>
                      <ColumnFilter
                        ariaLabel={t.admin.keywords.filterEnabledAria}
                        value={enabledFilter}
                        onChange={(k) => setEnabledFilter(k)}
                        options={[
                          { key: "all", label: t.admin.keywords.allEnabled },
                          { key: "enabled", label: t.admin.keywords.enabled },
                          { key: "disabled", label: t.admin.keywords.disabled },
                        ]}
                      />
                    </div>
                  )}
                </Table.Column>
                <Table.Column>{t.admin.users.colActions}</Table.Column>
              </Table.Header>
              <Table.Body>
                {sorted.map((kw) => (
                  <Table.Row key={kw.id} id={kw.id}>
                    <Table.Cell>
                      <SelectionCheckbox label={t.admin.keywords.selectRow(kw.word)} />
                    </Table.Cell>
                    <Table.Cell>
                      <p className="truncate font-medium">{kw.word}</p>
                    </Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" variant="tertiary" color={kw.action === "block" ? "danger" : "warning"}>
                        {t.admin.keywords.actions[kw.action] ?? kw.action}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell>
                      <Switch
                        size="sm"
                        isSelected={kw.enabled}
                        onChange={(v) => update.mutate({ id: kw.id, body: { word: kw.word, action: kw.action, enabled: v } })}
                      >
                        <Switch.Content>
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                          <span className="text-xs text-muted">{kw.enabled ? t.admin.keywords.enabled : t.admin.keywords.disabled}</span>
                        </Switch.Content>
                      </Switch>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end">
                        <ConfirmButton
                          title={t.admin.keywords.deleteConfirm(kw.word)}
                          confirmLabel={t.common.delete}
                          isLoading={remove.isPending}
                          onConfirm={() => remove.mutate(kw.id)}
                        >
                          {t.common.delete}
                        </ConfirmButton>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
        </DataTable>
      </StateBoundary>
    </div>
  );
}
