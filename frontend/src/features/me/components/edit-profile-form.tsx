"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, TextArea, TextField } from "@heroui/react";
import { Globe, Lock, X } from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { AvatarPicker } from "@/components/common/avatar-picker";
import { OptionSelect } from "@/components/common/option-select";
import { PendingButton } from "@/components/common/pending-button";
import { toastError, toastSuccess } from "@/lib/feedback";
import { useI18n } from "@/lib/i18n";
import { useMe, useUpdateMe } from "@/features/me";
import type { UserUpdate, Visibility } from "@/lib/api/types";

/**
 * Account profile editor (name / avatar / bio / contact visibility). Reached
 * from the /me hub at /me/edit; on success it toasts and returns to /me. Split
 * out of AccountTab so the hub stays a read-only view (mirrors /me/alumni).
 */
export function EditProfileForm() {
  const { t } = useI18n();
  const router = useRouter();
  const { data: me, isLoading, isError, error, refetch } = useMe();
  const update = useUpdateMe();

  const [form, setForm] = React.useState<UserUpdate>({});
  const [avatar, setAvatar] = React.useState<string[]>([]);
  const [removeAvatar, setRemoveAvatar] = React.useState(false);
  const [emailVis, setEmailVis] = React.useState<Visibility>("admin_only");
  const [phoneVis, setPhoneVis] = React.useState<Visibility>("admin_only");
  const [wechat, setWechat] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [linkedin, setLinkedin] = React.useState("");
  const [wechatVis, setWechatVis] = React.useState<Visibility>("admin_only");
  const [whatsappVis, setWhatsappVis] = React.useState<Visibility>("admin_only");
  const [linkedinVis, setLinkedinVis] = React.useState<Visibility>("admin_only");
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (me && !loaded) {
      setForm({ name: me.name, bio: me.bio ?? undefined, grade_year: me.grade_year ?? undefined });
      setEmailVis(me.email_visibility ?? "admin_only");
      setPhoneVis(me.phone_visibility ?? "admin_only");
      setWechat(me.wechat ?? "");
      setWhatsapp(me.whatsapp ?? "");
      setLinkedin(me.linkedin ?? "");
      setWechatVis(me.wechat_visibility ?? "admin_only");
      setWhatsappVis(me.whatsapp_visibility ?? "admin_only");
      setLinkedinVis(me.linkedin_visibility ?? "admin_only");
      setLoaded(true);
    }
  }, [me, loaded]);

  const set = <K extends keyof UserUpdate>(k: K, v: UserUpdate[K]) => setForm((f) => ({ ...f, [k]: v }));
  const pending = update.isPending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync({
        ...form,
        avatar_media_id: avatar[0] ?? (removeAvatar ? "" : undefined),
        wechat: wechat.trim(),
        whatsapp: whatsapp.trim(),
        linkedin: linkedin.trim(),
        wechat_visibility: wechatVis,
        whatsapp_visibility: whatsappVis,
        linkedin_visibility: linkedinVis,
        email_visibility: emailVis,
        phone_visibility: phoneVis,
      });
      toastSuccess(t.meEdit.updated);
      router.replace("/me");
    } catch (err) {
      // updateMe / saveAlumniProfile are meta.silentError, so the global
      // MutationCache stays quiet; surface the failure as a toast.
      toastError(err);
    }
  };

  const socialRow = (
    key: "wechat" | "whatsapp" | "linkedin",
    label: string,
    visLabel: string,
    value: string,
    onValue: (v: string) => void,
    vis: Visibility,
    onVis: (v: Visibility) => void,
  ) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <TextField name={key}>
          <Label>{label}</Label>
          <Input value={value} onChange={(e) => onValue(e.target.value)} placeholder={t.meAlumni.handlePh} />
        </TextField>
      </div>
      <div className="flex items-center gap-2 sm:w-56 sm:shrink-0">
        <span className="shrink-0 text-muted" title={visLabel} aria-hidden>
          {vis === "all" ? <Globe size={15} /> : <Lock size={15} />}
        </span>
        <OptionSelect
          ariaLabel={visLabel}
          className="min-w-0 flex-1"
          value={vis}
          onChange={(k) => onVis(k as Visibility)}
          options={[
            { key: "all", label: t.meAlumni.everyone },
            { key: "admin_only", label: t.meAlumni.onlyMe },
          ]}
        />
      </div>
    </div>
  );

  return (
    <StateBoundary isLoading={isLoading} isError={isError} error={error} isEmpty={!me} onRetry={() => refetch()}>
      {me && (
        <Card>
          <Card.Content className="gap-4">
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <AvatarPicker
                value={avatar}
                onChange={(ids) => {
                  setAvatar(ids);
                  if (ids.length) setRemoveAvatar(false);
                }}
                currentUrl={me.avatar_url}
                fallback={me.name?.[0] ?? "?"}
                alt={me.name ?? "avatar"}
                onClear={() => setRemoveAvatar(true)}
              />
              <TextField name="name">
                <Label>{t.common.name}</Label>
                <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
              </TextField>
              <TextField name="bio">
                <Label>{t.common.bio}</Label>
                <TextArea rows={4} value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} />
              </TextField>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Label>{t.meAlumni.email}</Label>
                    <p className="break-all text-sm text-foreground">{me.email ?? t.meAlumni.notSet}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:w-56 sm:shrink-0">
                    <span className="shrink-0 text-muted" title={t.meAlumni.emailVisibility} aria-hidden>
                      {emailVis === "all" ? <Globe size={15} /> : <Lock size={15} />}
                    </span>
                    <OptionSelect
                      ariaLabel={t.meAlumni.emailVisibility}
                      className="min-w-0 flex-1"
                      value={emailVis}
                      onChange={(k) => setEmailVis(k as Visibility)}
                      options={[
                        { key: "all", label: t.meAlumni.everyone },
                        { key: "admin_only", label: t.meAlumni.onlyMe },
                      ]}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Label>{t.meAlumni.phone}</Label>
                    <p className="break-all text-sm text-foreground">{me.phone ?? t.meAlumni.notSet}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:w-56 sm:shrink-0">
                    <span className="shrink-0 text-muted" title={t.meAlumni.phoneVisibility} aria-hidden>
                      {phoneVis === "all" ? <Globe size={15} /> : <Lock size={15} />}
                    </span>
                    <OptionSelect
                      ariaLabel={t.meAlumni.phoneVisibility}
                      className="min-w-0 flex-1"
                      value={phoneVis}
                      onChange={(k) => setPhoneVis(k as Visibility)}
                      options={[
                        { key: "all", label: t.meAlumni.everyone },
                        { key: "admin_only", label: t.meAlumni.onlyMe },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="text-sm font-semibold text-muted">{t.meAlumni.contactChannels}</div>
                {socialRow("wechat", t.meAlumni.wechat, t.meAlumni.wechatVisibility, wechat, setWechat, wechatVis, setWechatVis)}
                {socialRow("whatsapp", t.meAlumni.whatsapp, t.meAlumni.whatsappVisibility, whatsapp, setWhatsapp, whatsappVis, setWhatsappVis)}
                {socialRow("linkedin", t.meAlumni.linkedin, t.meAlumni.linkedinVisibility, linkedin, setLinkedin, linkedinVis, setLinkedinVis)}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onPress={() => router.back()}
                  isDisabled={pending}
                >
                  <X size={16} />
                  {t.common.cancel}
                </Button>
                <PendingButton
                  type="submit"
                  variant="primary"
                  pending={pending}
                  className="flex-1"
                >
                  {t.meEdit.saveChanges}
                </PendingButton>
              </div>
            </form>
          </Card.Content>
        </Card>
      )}
    </StateBoundary>
  );
}
