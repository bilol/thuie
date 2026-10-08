"use client";

import * as React from "react";
import {
  Card,
  Input,
  Label,
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import { StateBoundary } from "@/components/common/state";
import { AvatarPicker } from "@/components/common/avatar-picker";
import { StatusChip } from "@/components/common/status-chip";
import { TagInput } from "@/components/common/tag-input";
import { OptionSelect } from "@/components/common/option-select";
import { localizedName } from "@/lib/format";
import { PROGRAMS, INDUSTRIES, industryLabel } from "@/lib/reference";
import { NATIONALITIES } from "@/lib/nationalities";
import {
  useDepartments,
  useMyAlumniProfile,
  useRequestVisibility,
  useSaveAlumniProfile,
  useSetAlumniSkills,
} from "@/features/directory";
import { useUpdateMe } from "@/features/me";
import { toastError, toastSuccess } from "@/lib/feedback";
import { PendingButton } from "@/components/common/pending-button";
import { useI18n } from "@/lib/i18n";
import type { AlumniUpdate, Visibility } from "@/lib/api/types";

export default function MyAlumniProfilePage() {
  const { t, locale } = useI18n();
  const profile = useMyAlumniProfile();
  const { data: departments } = useDepartments();
  const save = useSaveAlumniProfile();
  const saveSkills = useSetAlumniSkills();
  const requestVis = useRequestVisibility();
  const updateMe = useUpdateMe();

  const [form, setForm] = React.useState<AlumniUpdate>({});
  const [skills, setSkills] = React.useState<string[]>([]);
  const [avatar, setAvatar] = React.useState<string[]>([]);
  const [removeAvatar, setRemoveAvatar] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    const p = profile.data;
    if (p && !loaded) {
      setForm({
        display_name: p.display_name,
        department_id: p.department?.id,
        graduation_year: p.graduation_year ?? undefined,
        program: p.program ?? undefined,
        industry: p.industry ?? undefined,
        country: p.country ?? undefined,
        city: p.city ?? undefined,
        work_title: p.work_title ?? undefined,
        company: p.company ?? undefined,
        bio: p.bio ?? undefined,
        visibility: p.visibility,
      });
      setSkills(p.skills);
      setLoaded(true);
    }
  }, [profile.data, loaded]);

  const set = <K extends keyof AlumniUpdate>(k: K, v: AlumniUpdate[K]) => setForm((f) => ({ ...f, [k]: v }));
  const hasProfile = !!profile.data;

  return (
    <div className="space-y-4">
      {profile.data && (
        <div className="flex justify-end">
          <StatusChip status={profile.data.status} size="md" />
        </div>
      )}

      <StateBoundary isLoading={profile.isLoading} skeletonRows={4}>
        <Card>
          <Card.Content className="gap-4">
            <form
              className="flex flex-col gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (avatar[0] || removeAvatar) await updateMe.mutateAsync({ avatar_media_id: avatar[0] ?? "" });
                  await save.mutateAsync({ body: form, version: profile.data?.version });
                  setAvatar([]);
                  setRemoveAvatar(false);
                  toastSuccess(t.meAlumni.savedReview);
                } catch (err) {
                  // save / updateMe are meta.silentError, so surface failures as a toast.
                  toastError(err);
                }
              }}
            >
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">{t.common.avatar}</p>
                <AvatarPicker
                  value={avatar}
                  onChange={(ids) => {
                    setAvatar(ids);
                    if (ids.length) setRemoveAvatar(false);
                  }}
                  currentUrl={profile.data?.avatar_url}
                  fallback={(form.display_name ?? profile.data?.display_name ?? "?")[0] ?? "?"}
                  alt={form.display_name ?? "avatar"}
                  onClear={() => setRemoveAvatar(true)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField name="display_name">
                  <Label>{t.meAlumni.displayName}</Label>
                  <Input value={form.display_name ?? ""} onChange={(e) => set("display_name", e.target.value)} />
                </TextField>
                <OptionSelect
                  label={t.meAlumni.department}
                  ariaLabel={t.meAlumni.department}
                  placeholder={t.meAlumni.select}
                  value={form.department_id ?? null}
                  onChange={(k) => set("department_id", k)}
                  options={(departments ?? []).map((d) => ({ key: d.id, label: localizedName(d, locale) }))}
                />
                <TextField name="graduation_year">
                  <Label>{t.meAlumni.graduationYear}</Label>
                  <Input value={form.graduation_year ?? ""} onChange={(e) => set("graduation_year", e.target.value)} placeholder="2018" />
                </TextField>
                <OptionSelect
                  label={t.meAlumni.program}
                  ariaLabel={t.meAlumni.program}
                  placeholder={t.meAlumni.select}
                  value={form.program ?? null}
                  onChange={(k) => set("program", k)}
                  options={PROGRAMS.map((p) => ({ key: p, label: p }))}
                />
                <TextField name="work_title">
                  <Label>{t.meAlumni.workTitle}</Label>
                  <Input value={form.work_title ?? ""} onChange={(e) => set("work_title", e.target.value)} />
                </TextField>
                <TextField name="company">
                  <Label>{t.meAlumni.company}</Label>
                  <Input value={form.company ?? ""} onChange={(e) => set("company", e.target.value)} />
                </TextField>
                <OptionSelect
                  label={t.meAlumni.industry}
                  ariaLabel={t.meAlumni.industry}
                  placeholder={t.meAlumni.select}
                  value={form.industry ?? null}
                  onChange={(k) => set("industry", k)}
                  options={INDUSTRIES.map((i) => ({ key: i.key, label: industryLabel(i.key, locale) }))}
                />
                <OptionSelect
                  label={t.meAlumni.country}
                  ariaLabel={t.meAlumni.country}
                  placeholder={t.meAlumni.select}
                  value={form.country ?? null}
                  onChange={(k) => set("country", k)}
                  options={NATIONALITIES.map((n) => ({ key: n.code, label: locale === "zh" ? n.zh : n.en }))}
                />
                <TextField name="city">
                  <Label>{t.meAlumni.city}</Label>
                  <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
                </TextField>
              </div>
              <TextField name="bio">
                <Label>{t.common.bio}</Label>
                <TextArea rows={4} value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} />
              </TextField>
              <OptionSelect
                label={t.meAlumni.visibility}
                ariaLabel={t.meAlumni.visibility}
                value={form.visibility ?? "all"}
                onChange={(k) => set("visibility", k as Visibility)}
                options={[
                  { key: "all", label: t.meAlumni.everyone },
                  { key: "student_only", label: t.meAlumni.studentsOnly },
                ]}
              />
              <PendingButton type="submit" variant="primary" pending={save.isPending || updateMe.isPending} fullWidth>
                {hasProfile ? t.meAlumni.saveResubmit : t.meAlumni.createProfile}
              </PendingButton>
            </form>
          </Card.Content>
        </Card>

        {hasProfile && (
          <Card>
            <Card.Content className="gap-3">
              <Typography type="h6">{t.meAlumni.skills}</Typography>
              <TagInput placeholder={t.meAlumni.skillPlaceholder} value={skills} onChange={setSkills} max={20} />
              <PendingButton
                size="sm"
                variant="secondary"
                className="self-start"
                pending={saveSkills.isPending}
                onPress={() =>
                  saveSkills.mutate(skills, {
                    onSuccess: () => toastSuccess(t.meAlumni.skillsSaved),
                    onError: (err) => toastError(err),
                  })
                }
              >
                {t.meAlumni.saveSkills}
              </PendingButton>
            </Card.Content>
          </Card>
        )}

        {hasProfile && profile.data?.status === "approved" && (
          <Card>
            <Card.Content className="gap-3">
              <Typography type="h6">{t.meAlumni.requestVisTitle}</Typography>
              <p className="text-sm text-muted">{t.meAlumni.requestVisHint}</p>
              <PendingButton
                size="sm"
                variant="secondary"
                className="self-start"
                pending={requestVis.isPending}
                onPress={() =>
                  requestVis.mutate(
                    {
                      visibility: form.visibility ?? profile.data!.visibility,
                    },
                    {
                      onSuccess: () => toastSuccess(t.meAlumni.requestSubmitted),
                      onError: (err) => toastError(err),
                    },
                  )
                }
              >
                {t.meAlumni.submitRequest}
              </PendingButton>
            </Card.Content>
          </Card>
        )}
      </StateBoundary>
    </div>
  );
}
