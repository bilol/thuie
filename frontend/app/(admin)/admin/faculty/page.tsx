"use client";

import * as React from "react";
import {
  Avatar,
  Button,
  Input,
  Label,
  Modal,
  Spinner,
  Table,
  TextArea,
  TextField,
} from "@heroui/react";
import { Download, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { ConfirmButton } from "@/components/common/confirm-button";
import { Pagination } from "@/components/common/pagination";
import { OptionSelect } from "@/components/common/option-select";
import { ItemActionsMenu } from "@/components/common/item-actions-menu";
import { DataTable, SelectionCheckbox } from "@/components/common/data-table";
import { PendingButton } from "@/components/common/pending-button";
import { localizedName } from "@/lib/format";
import { apiErrorMessage } from "@/lib/api/errors";
import { downloadCsv, type CsvColumn } from "@/lib/export";
import { toastSuccess } from "@/lib/feedback";
import { useI18n } from "@/lib/i18n";
import { useAdminFaculty, useFacultyMutations } from "@/features/admin";
import type { FacultySortField, FacultyUpsert } from "@/features/admin";
import { useDepartments } from "@/features/directory";
import type { FacultyMember } from "@/lib/api/types";

const EMPTY: FacultyUpsert = {
  name: "",
  department: "",
  title: "",
  research_area: "",
  email: "",
  phone: "",
  bio: "",
  avatar_url: "",
  address: "",
  homepage: "",
};

const FacultyFormContext = React.createContext<(m: FacultyMember | null) => void>(() => {});

function FacultyRow({ member }: { member: FacultyMember }) {
  const { t } = useI18n();
  const { remove } = useFacultyMutations();
  const onEdit = React.useContext(FacultyFormContext);

  return (
    <Table.Row id={member.id}>
      <Table.Cell>
        <SelectionCheckbox label={t.admin.faculty.selectRow(member.name ?? "")} />
      </Table.Cell>
      <Table.Cell>
        <div className="flex min-w-0 items-center gap-2">
          <Avatar size="sm">
            {member.avatar_url ? <Avatar.Image src={member.avatar_url} alt={member.name ?? "avatar"} /> : null}
            <Avatar.Fallback>{member.name?.[0] ?? "?"}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{member.name}</p>
            <p className="truncate text-xs text-muted">{member.email ?? "—"}</p>
          </div>
        </div>
      </Table.Cell>
      <Table.Cell className="whitespace-nowrap text-muted">{member.title ?? "—"}</Table.Cell>
      <Table.Cell className="whitespace-nowrap text-muted">{member.phone ?? "—"}</Table.Cell>
      <Table.Cell>
        <div className="flex justify-end">
          <ItemActionsMenu
            label={t.admin.faculty.moreActions}
            items={[
              { id: "edit", label: t.common.edit, icon: <Pencil size={14} />, onPress: () => onEdit(member) },
              {
                id: "delete",
                label: t.common.delete,
                icon: <Trash2 size={14} />,
                tone: "danger",
                confirm: {
                  title: t.admin.faculty.deleteConfirm(member.name ?? ""),
                  body: t.admin.faculty.deleteBody,
                  confirmLabel: t.common.delete,
                  isLoading: remove.isPending,
                  onConfirm: () => remove.mutate(member.id),
                },
              },
            ]}
          />
        </div>
      </Table.Cell>
    </Table.Row>
  );
}

export default function AdminFacultyPage() {
  const { t, locale } = useI18n();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<{ column: FacultySortField; direction: "ascending" | "descending" }>({
    column: "name",
    direction: "ascending",
  });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FacultyUpsert>(EMPTY);

  const { create, update, remove } = useFacultyMutations();
  const { data: departments } = useDepartments();
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminFaculty({
    page,
    limit,
    q: query || undefined,
    sort: sort.column,
    order: sort.direction === "ascending" ? "asc" : "desc",
  });

  React.useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    setSelected(new Set());
  }, [page, limit, query, sort]);

  const items = data?.data ?? [];
  const meta = data?.meta;

  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => remove.mutateAsync(id)));
      const ok = results.filter((r) => r.status === "fulfilled").length;
      toastSuccess(t.admin.faculty.bulkDone(ok, results.length - ok));
      clearSelection();
    } finally {
      setBulkDeleting(false);
    }
  };

  const exportCsv = () => {
    const cols: CsvColumn<FacultyMember>[] = [
      { key: "name", header: t.admin.faculty.colName, value: (m) => m.name ?? "" },
      { key: "title", header: t.admin.faculty.titleLabel, value: (m) => m.title ?? "" },
      { key: "research", header: t.admin.faculty.researchArea, value: (m) => m.research_area ?? "" },
      { key: "email", header: t.admin.faculty.colEmail, value: (m) => m.email ?? "" },
      { key: "phone", header: t.meProfile.phone, value: (m) => m.phone ?? "" },
    ];
    downloadCsv("faculty", cols, items);
  };

  const openForm = (member: FacultyMember | null) => {
    if (member) {
      setEditingId(member.id);
      setForm({
        name: member.name ?? "",
        department: member.department?.code ?? "",
        title: member.title ?? "",
        research_area: member.research_area ?? "",
        email: member.email ?? "",
        phone: member.phone ?? "",
        bio: member.bio ?? "",
        avatar_url: member.avatar_url ?? "",
        address: member.address ?? "",
        homepage: member.homepage ?? "",
      });
    } else {
      setEditingId(null);
      setForm(EMPTY);
    }
    setOpen(true);
  };

  const closeForm = () => {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY);
  };

  const submit = () => {
    const body: FacultyUpsert = {
      ...form,
      name: form.name.trim(),
      department: form.department || undefined,
      title: form.title?.trim() || undefined,
      research_area: form.research_area?.trim() || undefined,
      email: form.email?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      bio: form.bio?.trim() || undefined,
      avatar_url: form.avatar_url?.trim() || undefined,
      address: form.address?.trim() || undefined,
      homepage: form.homepage?.trim() || undefined,
    };
    if (!body.name) return;
    const done = { onSuccess: closeForm };
    if (editingId) update.mutate({ id: editingId, body }, done);
    else create.mutate(body, done);
  };

  const mutationError = create.error ?? update.error;

  return (
    <FacultyFormContext.Provider value={openForm}>
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="tertiary" onPress={exportCsv} isDisabled={items.length === 0}>
            <Download size={14} />
            {t.common.exportCsv}
          </Button>
          <Button isIconOnly size="sm" variant="tertiary" isPending={isFetching} aria-label={t.common.refresh} onPress={() => refetch()}>
            {({ isPending }) => (isPending ? <Spinner color="current" size="sm" /> : <RefreshCw size={16} />)}
          </Button>
          <Button variant="primary" size="sm" onPress={() => openForm(null)}>
            <Plus size={16} />
            {t.admin.faculty.newFaculty}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <TextField aria-label={t.admin.faculty.searchAria} className="max-w-xs">
            <Input
              placeholder={t.admin.faculty.searchPlaceholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </TextField>
        </div>

        <StateBoundary
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={items.length === 0}
          emptyTitle={t.admin.faculty.emptyTitle}
          emptyBody={t.admin.faculty.emptyBody}
          onRetry={() => refetch()}
        >
          <DataTable
            ariaLabel={t.admin.faculty.title}
            rowIds={items.map((m) => m.id)}
            selection={{ selectedKeys: selected, onChange: setSelected }}
            sort={sort}
            onSortChange={(next) => {
              setSort({ column: String(next.column) as FacultySortField, direction: next.direction });
              setPage(1);
            }}
            bulkActions={
              selected.size > 0 ? (
                <>
                  <span className="text-sm font-medium">{t.admin.faculty.selectedCount(selected.size)}</span>
                  <div className="flex items-center gap-2">
                    <ConfirmButton
                      title={t.admin.faculty.bulkDeleteConfirm(selected.size)}
                      body={t.admin.faculty.deleteBody}
                      confirmLabel={t.common.delete}
                      color="danger"
                      size="sm"
                      isLoading={bulkDeleting}
                      onConfirm={handleBulkDelete}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Trash2 size={14} /> {t.admin.faculty.bulkDelete(selected.size)}
                      </span>
                    </ConfirmButton>
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
                  <Table.Column aria-label={t.admin.faculty.selectAll} className="w-10">
                    <SelectionCheckbox label={t.admin.faculty.selectAll} />
                  </Table.Column>
                  <Table.Column key="name" isRowHeader allowsSorting>
                    {({ sortDirection }) => (
                      <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.faculty.colName}</Table.SortableColumnHeader>
                    )}
                  </Table.Column>
                  <Table.Column key="title" allowsSorting>
                    {({ sortDirection }) => (
                      <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.faculty.titleLabel}</Table.SortableColumnHeader>
                    )}
                  </Table.Column>
                  <Table.Column>{t.meProfile.phone}</Table.Column>
                  <Table.Column aria-label={t.admin.faculty.colActions} className="w-1">
                    <div className="flex justify-end whitespace-nowrap">{t.admin.faculty.colActions}</div>
                  </Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((m) => (
                    <FacultyRow key={m.id} member={m} />
                  ))}
                </Table.Body>
          </DataTable>
        </StateBoundary>
      </div>

      <Modal>
        <Modal.Backdrop isOpen={open} onOpenChange={(o) => { if (!o) closeForm(); }} isDismissable>
          <Modal.Container size="lg">
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading className="text-base font-semibold">
                      {editingId ? t.admin.faculty.editTitle : t.admin.faculty.newTitle}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col gap-3">
                    {mutationError && (
                      <p className="text-sm text-danger">{apiErrorMessage(mutationError)}</p>
                    )}
                    <TextField name="fac-name">
                      <Label>{t.common.name}</Label>
                      <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </TextField>
                    <OptionSelect
                      label={t.admin.faculty.department}
                      ariaLabel={t.admin.faculty.department}
                      value={form.department || null}
                      onChange={(k) => setForm((f) => ({ ...f, department: k ?? "" }))}
                      options={(departments ?? []).map((d) => {
                        const label = localizedName(d, locale) || d.code;
                        return { key: d.code, label };
                      })}
                    />
                    <TextField name="fac-title">
                      <Label>{t.admin.faculty.titleLabel}</Label>
                      <Input placeholder={t.admin.faculty.titlePlaceholder} value={form.title ?? ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                    </TextField>
                    <TextField name="fac-research">
                      <Label>{t.admin.faculty.researchArea}</Label>
                      <Input value={form.research_area ?? ""} onChange={(e) => setForm((f) => ({ ...f, research_area: e.target.value }))} />
                    </TextField>
                    <div className="flex items-end gap-3">
                      <TextField name="fac-avatar" className="flex-1">
                        <Label>{t.admin.faculty.avatarUrl}</Label>
                        <Input
                          placeholder={t.admin.faculty.avatarUrlPlaceholder}
                          value={form.avatar_url ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
                        />
                      </TextField>
                      <Avatar size="lg">
                        {form.avatar_url ? <Avatar.Image src={form.avatar_url} alt="" /> : null}
                        <Avatar.Fallback>{form.name?.[0] ?? "?"}</Avatar.Fallback>
                      </Avatar>
                    </div>
                    <TextField name="fac-address">
                      <Label>{t.admin.faculty.addressLabel}</Label>
                      <Input value={form.address ?? ""} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                    </TextField>
                    <TextField name="fac-homepage">
                      <Label>{t.admin.faculty.homepageLabel}</Label>
                      <Input placeholder="https://…" value={form.homepage ?? ""} onChange={(e) => setForm((f) => ({ ...f, homepage: e.target.value }))} />
                    </TextField>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <TextField name="fac-email" type="email" className="flex-1">
                        <Label>{t.meProfile.email}</Label>
                        <Input value={form.email ?? ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                      </TextField>
                      <TextField name="fac-phone" className="flex-1">
                        <Label>{t.meProfile.phone}</Label>
                        <Input value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                      </TextField>
                    </div>
                    <TextField name="fac-bio">
                      <Label>{t.common.bio}</Label>
                      <TextArea rows={3} value={form.bio ?? ""} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="tertiary" onPress={close}>
                      {t.common.cancel}
                    </Button>
                    <PendingButton
                      variant="primary"
                      pending={create.isPending || update.isPending}
                      isDisabled={!form.name.trim()}
                      onPress={submit}
                    >
                      {editingId ? t.common.save : t.common.create}
                    </PendingButton>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </FacultyFormContext.Provider>
  );
}
