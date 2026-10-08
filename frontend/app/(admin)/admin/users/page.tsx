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
  TextField,
} from "@heroui/react";
import { Download, GraduationCap, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { ConfirmButton } from "@/components/common/confirm-button";
import { Pagination } from "@/components/common/pagination";
import { DataTable, SelectionCheckbox } from "@/components/common/data-table";
import { StatusChip, RoleChip } from "@/components/common/status-chip";
import { PendingButton } from "@/components/common/pending-button";
import { ItemActionsMenu, type ItemAction } from "@/components/common/item-actions-menu";
import { OptionSelect } from "@/components/common/option-select";
import { ColumnFilter } from "@/components/common/column-filter";
import { NATIONALITIES, nationalityLabel } from "@/lib/nationalities";
import { PROGRAMS } from "@/lib/reference";
import { localizedName } from "@/lib/format";
import { downloadCsv, type CsvColumn } from "@/lib/export";
import { apiErrorMessage } from "@/lib/api/errors";
import {
  useAdminUsers,
  useBatchConvert,
  useConvertUser,
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUpdateUserStatus,
  type AdminUserCreate,
  type AdminUserUpdate,
  type UserSortField,
} from "@/features/admin";
import { useDepartments } from "@/features/directory";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/auth/store";
import type { Role, UserStatus, UserView } from "@/lib/api/types";

const STATUSES: UserStatus[] = [
  "active",
  "unverified",
  "posting_restricted",
  "banned",
  "deleted",
];

type SettableStatus = "active" | "unverified" | "posting_restricted" | "banned";
const SETTABLE_STATUSES: SettableStatus[] = ["active", "unverified", "posting_restricted", "banned"];

const ROLES: Role[] = ["student", "graduate", "admin", "admin_super"];

type UserFormState = AdminUserUpdate & { password: string };

const EMPTY_FORM: UserFormState = {
  name: "",
  email: "",
  phone: "",
  student_id: "",
  department_id: "",
  program: "",
  nationality: "",
  grade_year: "",
  graduation_year: "",
  role: "student",
  password: "",
};

const UserFormContext = React.createContext<(u: UserView | null) => void>(() => {});

function UserRow({ user }: { user: UserView }) {
  const { t, locale } = useI18n();
  const setStatus = useUpdateUserStatus();
  const convert = useConvertUser();
  const del = useDeleteUser();
  const onEdit = React.useContext(UserFormContext);

  const actions: ItemAction[] = [
    {
      id: "edit",
      label: t.common.edit,
      icon: <Pencil size={14} />,
      onPress: () => onEdit(user),
    },
  ];
  if (user.role === "student") {
    actions.push({
      id: "convert",
      label: t.admin.users.convert,
      icon: <GraduationCap size={14} />,
      onPress: () => convert.mutate({ id: user.id }),
    });
  }
  for (const key of SETTABLE_STATUSES) {
    if (key === user.status) continue;
    actions.push({
      id: `set-${key}`,
      label: t.admin.users.statusActions[key],
      onPress: () => setStatus.mutate({ id: user.id, status: key }),
    });
  }
  actions.push({
    id: "delete",
    label: t.common.delete,
    icon: <Trash2 size={14} />,
    tone: "danger",
    confirm: {
      title: t.admin.users.deleteConfirm(user.name ?? ""),
      body: t.admin.users.deleteBody,
      confirmLabel: t.common.delete,
      isLoading: del.isPending,
      onConfirm: () => del.mutate(user.id),
    },
  });

  return (
    <Table.Row key={user.id} id={user.id}>
      <Table.Cell>
        <SelectionCheckbox label={t.admin.users.selectRow(user.name ?? "")} />
      </Table.Cell>
      <Table.Cell>
        <div className="flex min-w-0 items-center gap-2">
          <Avatar size="sm">
            {user.avatar_url ? <Avatar.Image src={user.avatar_url} alt={user.name ?? "avatar"} /> : null}
            <Avatar.Fallback>{user.name?.[0] ?? "?"}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email ?? t.admin.users.noEmail}</p>
          </div>
        </div>
      </Table.Cell>
      <Table.Cell className="whitespace-nowrap text-muted">{user.program ?? "—"}</Table.Cell>
      <Table.Cell className="whitespace-nowrap text-muted">{user.nationality ? nationalityLabel(user.nationality, locale) : "—"}</Table.Cell>
      <Table.Cell className="whitespace-nowrap text-muted">{user.grade_year ?? "—"}</Table.Cell>
      <Table.Cell className="whitespace-nowrap text-muted">{user.graduation_year ?? "—"}</Table.Cell>
      <Table.Cell>
        <RoleChip role={user.role} />
      </Table.Cell>
      <Table.Cell>
        <StatusChip status={user.status} />
      </Table.Cell>
      <Table.Cell>
        <div className="flex justify-end">
          <ItemActionsMenu label={t.admin.users.moreActions} items={actions} />
        </div>
      </Table.Cell>
    </Table.Row>
  );
}

const SORT_FIELDS: readonly string[] = ["name", "program", "department", "role", "status", "created_at"];

export default function AdminUsersPage() {
  const { t, locale } = useI18n();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [role, setRole] = React.useState<string>("all");
  const [program, setProgram] = React.useState<string>("all");
  const [nationality, setNationality] = React.useState<string>("all");
  const [sort, setSort] = React.useState<{ column: UserSortField; direction: "ascending" | "descending" }>({
    column: "created_at",
    direction: "descending",
  });

  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<UserFormState>(EMPTY_FORM);

  const canCreateAdmins = useSession((s) => s.user?.role) === "admin_super";

  const create = useCreateUser();
  const update = useUpdateUser();
  const batch = useBatchConvert();
  const del = useDeleteUser();
  const { data: departments } = useDepartments();

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    setSelected(new Set());
  }, [page, query, status, role, program, nationality, sort]);

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminUsers({
    page,
    limit,
    q: query || undefined,
    status: status === "all" ? undefined : (status as UserStatus),
    role: role === "all" ? undefined : (role as Role),
    program: program === "all" ? undefined : program,
    nationality: nationality === "all" ? undefined : nationality,
    sort: SORT_FIELDS.includes(sort.column) ? sort.column : undefined,
    order: SORT_FIELDS.includes(sort.column) ? (sort.direction === "ascending" ? "asc" : "desc") : undefined,
  });

  const items = data?.data ?? [];
  const meta = data?.meta;

  const exportCsv = () => {
    const cols: CsvColumn<UserView>[] = [
      { key: "name", header: t.admin.users.colUser, value: (u) => u.name ?? "" },
      { key: "email", header: t.meProfile.email, value: (u) => u.email ?? "" },
      { key: "phone", header: t.meProfile.phone, value: (u) => u.phone ?? "" },
      { key: "student_id", header: t.meProfile.studentId, value: (u) => u.student_id ?? "" },
      { key: "program", header: t.admin.users.colProgram, value: (u) => u.program ?? "" },
      { key: "nationality", header: t.admin.users.colNationality, value: (u) => nationalityLabel(u.nationality, locale) },
      { key: "role", header: t.admin.users.colRole, value: (u) => t.roles[u.role] ?? u.role },
      { key: "status", header: t.admin.users.statusLabel, value: (u) => t.statuses[u.status] ?? u.status },
      { key: "grade", header: t.meProfile.gradeYear, value: (u) => u.grade_year ?? "" },
      { key: "graduation", header: t.meProfile.graduationYear, value: (u) => u.graduation_year ?? "" },
    ];
    downloadCsv("users", cols, items);
  };

  const selectedCount = selected.size;
  const selectedStudents = items.filter((u) => selected.has(u.id) && u.role === "student");

  const clearSelection = () => setSelected(new Set());

  const handleBulkConvert = () => {
    if (selectedStudents.length === 0) return;
    batch.mutate(selectedStudents.map((u) => ({ user_id: u.id })), { onSuccess: clearSelection });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.allSettled(ids.map((id) => del.mutateAsync(id)));
      clearSelection();
    } finally {
      setBulkDeleting(false);
    }
  };

  React.useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const present = new Set(items.map((u) => u.id));
      let changed = false;
      const next = new Set(prev);
      prev.forEach((id) => {
        if (!present.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [items]);

  const openForm = (user: UserView | null) => {
    if (!user) {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setOpen(true);
      return;
    }
    setEditingId(user.id);
    setForm({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      student_id: user.student_id ?? "",
      department_id: user.department_id ?? "",
      program: user.program ?? "",
      nationality: user.nationality ?? "",
      grade_year: user.grade_year ?? "",
      graduation_year: user.graduation_year ?? "",
      role: user.role,
      password: "",
    });
    setOpen(true);
  };

  const closeForm = () => {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const submit = () => {
    const name = form.name?.trim();
    if (!name) return;
    const details = {
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      student_id: form.student_id?.trim() || null,
      department_id: form.department_id || null,
      program: form.program?.trim() || null,
      nationality: form.nationality?.trim() || null,
      grade_year: form.grade_year?.trim() || null,
      graduation_year: form.graduation_year?.trim() || null,
    };
    if (editingId) {
      const body: AdminUserUpdate = { name, role: form.role, ...details };
      update.mutate({ id: editingId, body }, { onSuccess: closeForm });
      return;
    }
    const body: AdminUserCreate = { name, role: form.role ?? "student", password: form.password, ...details };
    create.mutate(body, { onSuccess: closeForm });
  };

  const canSubmit =
    Boolean(form.name?.trim()) &&
    (editingId != null ||
      (Boolean(form.password.trim()) &&
        Boolean(form.student_id?.trim() || form.email?.trim() || form.phone?.trim()) &&
        (form.role !== "student" || Boolean(form.student_id?.trim()))));

  const roleOptions = editingId || canCreateAdmins ? ROLES : ROLES.filter((r) => r !== "admin" && r !== "admin_super");

  return (
    <UserFormContext.Provider value={openForm}>
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
            {t.admin.users.newUser}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <TextField aria-label={t.admin.users.searchAria} className="max-w-xs">
            <Input
              placeholder={t.admin.users.searchPlaceholder}
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
          emptyTitle={t.admin.users.emptyTitle}
          onRetry={() => refetch()}
        >
          <DataTable
            ariaLabel={t.admin.users.title}
            rowIds={items.map((u) => u.id)}
            selection={{ selectedKeys: selected, onChange: setSelected }}
            sort={sort}
            onSortChange={(next) => {
              const col = String(next.column);
              if (SORT_FIELDS.includes(col)) {
                setSort({ column: col as UserSortField, direction: next.direction });
                setPage(1);
              }
            }}
            bulkActions={
              selectedCount > 0 ? (
                <>
                  <span className="text-sm font-medium">{t.admin.users.selectedCount(selectedCount)}</span>
                  <div className="flex items-center gap-2">
                    {selectedStudents.length > 0 && (
                      <PendingButton size="sm" variant="tertiary" pending={batch.isPending} onPress={handleBulkConvert}>
                        <GraduationCap size={14} />
                        {t.admin.users.convertBulk(selectedStudents.length)}
                      </PendingButton>
                    )}
                    <ConfirmButton
                      title={t.admin.users.bulkDeleteConfirm(selectedCount)}
                      body={t.admin.users.deleteBody}
                      confirmLabel={t.common.delete}
                      color="danger"
                      size="sm"
                      isLoading={bulkDeleting}
                      onConfirm={handleBulkDelete}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Trash2 size={14} /> {t.common.delete}
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
                  <Table.Column aria-label={t.admin.users.selectAll} className="w-10">
                    <SelectionCheckbox label={t.admin.users.selectAll} />
                  </Table.Column>
                  <Table.Column key="name" isRowHeader allowsSorting>
                    {({ sortDirection }) => (
                      <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.users.colUser}</Table.SortableColumnHeader>
                    )}
                  </Table.Column>
                  <Table.Column key="program" allowsSorting>
                    {({ sortDirection }) => (
                      <div className="flex items-center gap-1.5">
                        <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.users.colProgram}</Table.SortableColumnHeader>
                        <ColumnFilter
                          ariaLabel={t.admin.users.filterProgramAria}
                          value={program}
                          onChange={(k) => {
                            setProgram(k);
                            setPage(1);
                          }}
                          options={[
                            { key: "all", label: t.admin.users.allPrograms },
                            ...PROGRAMS.map((p) => ({ key: p, label: p })),
                          ]}
                        />
                      </div>
                    )}
                  </Table.Column>
                  <Table.Column>
                    <div className="flex items-center gap-1.5">
                      <span>{t.admin.users.colNationality}</span>
                      <ColumnFilter
                        ariaLabel={t.admin.users.filterNationalityAria}
                        value={nationality}
                        onChange={(k) => {
                          setNationality(k);
                          setPage(1);
                        }}
                        options={[
                          { key: "all", label: t.admin.users.allNationalities },
                          ...NATIONALITIES.map((n) => ({ key: n.code, label: locale === "zh" ? n.zh : n.en })),
                        ]}
                      />
                    </div>
                  </Table.Column>
                  <Table.Column>
                    <span>{t.meProfile.gradeYear}</span>
                  </Table.Column>
                  <Table.Column>
                    <span>{t.meProfile.graduationYear}</span>
                  </Table.Column>
                  <Table.Column key="role" allowsSorting>
                    {({ sortDirection }) => (
                      <div className="flex items-center gap-1.5">
                        <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.users.colRole}</Table.SortableColumnHeader>
                        <ColumnFilter
                          ariaLabel={t.admin.users.filterRoleAria}
                          value={role}
                          onChange={(k) => {
                            setRole(k);
                            setPage(1);
                          }}
                          options={[
                            { key: "all", label: t.admin.users.allRoles },
                            ...ROLES.map((r) => ({ key: r, label: t.roles[r] ?? r })),
                          ]}
                        />
                      </div>
                    )}
                  </Table.Column>
                  <Table.Column key="status" allowsSorting>
                    {({ sortDirection }) => (
                      <div className="flex items-center gap-1.5">
                        <Table.SortableColumnHeader sortDirection={sortDirection}>{t.admin.users.statusLabel}</Table.SortableColumnHeader>
                        <ColumnFilter
                          ariaLabel={t.admin.users.filterStatusAria}
                          value={status}
                          onChange={(k) => {
                            setStatus(k);
                            setPage(1);
                          }}
                          options={[
                            { key: "all", label: t.admin.users.allStatuses },
                            ...STATUSES.map((s) => ({ key: s, label: t.statuses[s] ?? s })),
                          ]}
                        />
                      </div>
                    )}
                  </Table.Column>
                  <Table.Column aria-label={t.admin.users.colActions} className="w-1">
                    <div className="flex justify-end whitespace-nowrap">{t.admin.users.colActions}</div>
                  </Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((u) => (
                    <UserRow key={u.id} user={u} />
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
                      {editingId ? t.admin.users.editTitle : t.admin.users.newTitle}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col gap-3">
                    {(create.error ?? update.error) && (
                      <p className="text-sm text-danger">{apiErrorMessage(create.error ?? update.error)}</p>
                    )}
                    <TextField name="user-name">
                      <Label>{t.common.name}</Label>
                      <Input value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </TextField>
                    <OptionSelect
                      label={t.admin.users.colRole}
                      ariaLabel={t.admin.users.colRole}
                      value={form.role ?? null}
                      onChange={(k) => setForm((f) => ({ ...f, role: (k ?? "student") as Role }))}
                      options={roleOptions.map((r) => ({ key: r, label: t.roles[r] ?? r }))}
                    />
                    <OptionSelect
                      label={t.meProfile.department}
                      ariaLabel={t.meProfile.department}
                      value={form.department_id || null}
                      onChange={(k) => setForm((f) => ({ ...f, department_id: k ?? "" }))}
                      options={(departments ?? []).map((d) => {
                        const label = localizedName(d, locale) || d.code;
                        return { key: d.id, label };
                      })}
                    />
                    <OptionSelect
                      label={t.admin.users.colProgram}
                      ariaLabel={t.admin.users.colProgram}
                      value={form.program || null}
                      onChange={(k) => setForm((f) => ({ ...f, program: k ?? "" }))}
                      options={PROGRAMS.map((p) => ({ key: p, label: p }))}
                    />
                    <OptionSelect
                      label={t.admin.users.colNationality}
                      ariaLabel={t.admin.users.colNationality}
                      value={form.nationality || "none"}
                      onChange={(k) => setForm((f) => ({ ...f, nationality: !k || k === "none" ? "" : k }))}
                      options={[
                        { key: "none", label: t.admin.users.nationalityNone },
                        ...NATIONALITIES.map((n) => ({ key: n.code, label: locale === "zh" ? n.zh : n.en })),
                      ]}
                    />
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <TextField name="user-grade" className="flex-1">
                        <Label>{t.meProfile.gradeYear}</Label>
                        <Input value={form.grade_year ?? ""} onChange={(e) => setForm((f) => ({ ...f, grade_year: e.target.value }))} />
                      </TextField>
                      <TextField name="user-grad" className="flex-1">
                        <Label>{t.meProfile.graduationYear}</Label>
                        <Input value={form.graduation_year ?? ""} onChange={(e) => setForm((f) => ({ ...f, graduation_year: e.target.value }))} />
                      </TextField>
                    </div>
                    <TextField name="user-studentid">
                      <Label>{t.meProfile.studentId}</Label>
                      <Input value={form.student_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))} />
                    </TextField>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <TextField name="user-email" type="email" className="flex-1">
                        <Label>{t.meProfile.email}</Label>
                        <Input value={form.email ?? ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                      </TextField>
                      <TextField name="user-phone" className="flex-1">
                        <Label>{t.meProfile.phone}</Label>
                        <Input value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                      </TextField>
                    </div>
                    {!editingId && (
                      <>
                        <p className="text-xs text-muted">{t.admin.users.handleHint}</p>
                        <TextField name="user-password">
                          <Label>{t.admin.users.passwordLabel}</Label>
                          <Input
                            autoComplete="new-password"
                            value={form.password}
                            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                          />
                        </TextField>
                        <p className="text-xs text-muted">{t.auth.passwordRule}</p>
                      </>
                    )}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="tertiary" onPress={close}>
                      {t.common.cancel}
                    </Button>
                    <PendingButton
                      variant="primary"
                      pending={editingId ? update.isPending : create.isPending}
                      isDisabled={!canSubmit}
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
    </UserFormContext.Provider>
  );
}
