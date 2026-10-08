"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Input,
  Modal,
  ProgressBar,
  Separator,
  TextField,
  Typography,
} from "@heroui/react";
import {
  BookOpen,
  Briefcase,
  Check,
  Clock,
  Globe,
  GraduationCap,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  PhoneCall,
  UserPlus,
} from "lucide-react";
import { StateBoundary } from "@/components/common/state";
import { ContentStatusChip } from "@/components/common/status-chip";
import { VerifiedBadge } from "@/components/common/author";
import { PendingButton } from "@/components/common/pending-button";
import { useCurrentUser } from "@/lib/auth/guards";
import { useAlumni, useAlumniConnections } from "@/features/directory";
import { useConnectionPair } from "@/features/connections";
import { useStartConversation } from "@/features/messaging";
import { ApiErrorAlert } from "@/components/common/alerts";
import { useI18n } from "@/lib/i18n";
import { industryLabel } from "@/lib/reference";
import { nationalityLabel } from "@/lib/nationalities";

function Detail({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 shrink-0 text-muted">{icon}</span>}
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-muted">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm text-foreground underline-offset-2 hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="truncate text-sm text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function AlumniDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const me = useCurrentUser();
  const { t, locale } = useI18n();
  const { data: profile, isLoading, isError, error } = useAlumni(id);
  const { data: connections } = useAlumniConnections(id);
  const { pair, sendError, actError, sending, busyWith, sendRequest, withdraw, accept, decline } =
    useConnectionPair(profile?.connection_status);
  const openChat = useStartConversation();
  const [message, setMessage] = React.useState("");
  const [connectOpen, setConnectOpen] = React.useState(false);

  const isSelf = !!profile?.user_id && profile.user_id === me?.id;
  const connId = profile?.connection_id ?? null;

  // Contact channels are already server-gated (only present when the owner's
  // per-field audience on `users` allows this viewer), so we just render what's here.
  const linkedinHref = profile?.linkedin && /^https?:\/\//i.test(profile.linkedin) ? profile.linkedin : undefined;
  const contacts = profile
    ? ([
        { icon: <Mail size={16} />, label: t.meAlumni.email, value: profile.email, href: undefined as string | undefined },
        { icon: <Phone size={16} />, label: t.meAlumni.phone, value: profile.phone, href: undefined },
        { icon: <MessageSquare size={16} />, label: t.meAlumni.wechat, value: profile.wechat, href: undefined },
        { icon: <PhoneCall size={16} />, label: t.meAlumni.whatsapp, value: profile.whatsapp, href: undefined },
        { icon: <Linkedin size={16} />, label: t.meAlumni.linkedin, value: profile.linkedin, href: linkedinHref },
      ].filter((c) => !!c.value) as { icon: React.ReactNode; label: string; value: string; href?: string }[])
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <StateBoundary isLoading={isLoading} isError={isError} error={error} isEmpty={!profile}>
        {profile && (
          <div className="space-y-4">
            <Card>
              <Card.Content className="gap-4">
                <div className="flex items-start gap-4">
                  <Avatar size="lg">
                    {profile.avatar_url && <Avatar.Image src={profile.avatar_url} alt={profile.display_name ?? ""} />}
                    <Avatar.Fallback>{profile.display_name?.[0] ?? "?"}</Avatar.Fallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography type="h1" weight="bold" className="text-xl">{profile.display_name}</Typography>
                      <ContentStatusChip status={profile.status} />
                      {profile.source === "school" && <VerifiedBadge />}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {[profile.work_title, profile.company].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Detail icon={<GraduationCap size={16} />} label={t.alumniDetail.classOf} value={profile.graduation_year} />
                  <Detail icon={<BookOpen size={16} />} label={t.alumniDetail.program} value={profile.program} />
                  <Detail icon={<Briefcase size={16} />} label={t.alumniDetail.industry} value={industryLabel(profile.industry, locale)} />
                  <Detail icon={<Globe size={16} />} label={t.alumniDetail.country} value={nationalityLabel(profile.country, locale)} />
                  <Detail icon={<MapPin size={16} />} label={t.alumniDetail.city} value={profile.city} />
                </div>

                {profile.bio && <p className="whitespace-pre-wrap text-sm text-muted">{profile.bio}</p>}

                {profile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((s) => (
                      <Chip key={s} size="sm" variant="primary" color="accent">{s}</Chip>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="text-xs text-muted">{t.alumniDetail.completion(profile.completion_percent)}</p>
                  <ProgressBar
                    value={profile.completion_percent}
                    size="sm"
                    color="accent"
                    aria-label={t.alumniDetail.completion(profile.completion_percent)}
                  >
                    <ProgressBar.Track>
                      <ProgressBar.Fill />
                    </ProgressBar.Track>
                  </ProgressBar>
                </div>

                <Separator />

                {isSelf ? (
                  <Button variant="primary" fullWidth onPress={() => router.push("/me/alumni")}>
                    {t.alumniDetail.editMine}
                  </Button>
                ) : (
                  profile.user_id && (
                    <div className="flex flex-wrap gap-2">
                      {actError && <ApiErrorAlert error={actError} className="w-full" />}
                      {pair === "connected" && (
                        <Button variant="secondary" isDisabled>
                          <Check size={16} />
                          {t.connections.connected}
                        </Button>
                      )}
                      {pair === "sent" && (
                        <>
                          <Button variant="secondary" isDisabled>
                            <Clock size={16} />
                            {t.alumniDetail.requestSent}
                          </Button>
                          {connId && (
                            <Button
                              variant="danger-soft"
                              isPending={busyWith("revoked")}
                              onPress={() => withdraw(connId)}
                            >
                              {t.alumniDetail.cancelRequest}
                            </Button>
                          )}
                        </>
                      )}
                      {pair === "incoming" && connId && (
                        <>
                          <Button
                            variant="primary"
                            isPending={busyWith("accepted")}
                            onPress={() => accept(connId)}
                          >
                            {t.connections.accept}
                          </Button>
                          <Button
                            variant="danger-soft"
                            isPending={busyWith("declined")}
                            onPress={() => decline(connId)}
                          >
                            {t.connections.decline}
                          </Button>
                        </>
                      )}
                      {!pair && (
                        <Button variant="primary" onPress={() => setConnectOpen(true)}>
                          <UserPlus size={16} />
                          {t.alumniDetail.connect}
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onPress={() =>
                          openChat({
                            id: profile.user_id!,
                            name: profile.display_name,
                            avatar_url: profile.avatar_url,
                          })
                        }
                      >
                        <MessageCircle size={16} />
                        {t.alumniDetail.message}
                      </Button>
                    </div>
                  )
                )}
              </Card.Content>
            </Card>

            {contacts.length > 0 && (
              <Card>
                <Card.Content className="gap-3">
                  <Typography type="h6" className="flex items-center gap-2">
                    <MessageCircle size={18} /> {t.alumniDetail.contact}
                  </Typography>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {contacts.map((c) => (
                      <ContactRow key={c.label} icon={c.icon} label={c.label} value={c.value} href={c.href} />
                    ))}
                  </div>
                </Card.Content>
              </Card>
            )}

            {!isSelf && profile.user_id && (
              <Modal>
                <Modal.Backdrop
                  isOpen={connectOpen}
                  onOpenChange={(o) => { if (!o) setConnectOpen(false); }}
                  isDismissable
                >
                  <Modal.Container size="sm">
                    <Modal.Dialog>
                      {({ close }) => (
                        <>
                          <Modal.CloseTrigger />
                          <Modal.Header>
                            <Modal.Heading className="text-base font-semibold">
                              {t.alumniDetail.connectTitle(profile.display_name ?? "")}
                            </Modal.Heading>
                          </Modal.Header>
                          <Modal.Body className="flex flex-col gap-3">
                            <p className="text-sm text-muted">{t.alumniDetail.connectHint}</p>
                            {sendError && <ApiErrorAlert error={sendError} />}
                            <TextField aria-label={t.alumniDetail.noteAria}>
                              <Input
                                placeholder={t.alumniDetail.noteAria}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                              />
                            </TextField>
                          </Modal.Body>
                          <Modal.Footer>
                            <Button variant="tertiary" onPress={close}>
                              {t.common.cancel}
                            </Button>
                            <PendingButton
                              variant="primary"
                              pending={sending}
                              onPress={() =>
                                sendRequest(
                                  { to_user_id: profile.user_id!, message: message || undefined },
                                  () => {
                                    setConnectOpen(false);
                                    setMessage("");
                                  },
                                )
                              }
                            >
                              {t.alumniDetail.connect}
                            </PendingButton>
                          </Modal.Footer>
                        </>
                      )}
                    </Modal.Dialog>
                  </Modal.Container>
                </Modal.Backdrop>
              </Modal>
            )}

            {connections && connections.length > 0 && (
              <Card>
                <Card.Content className="gap-3">
                  <Typography type="h6" className="flex items-center gap-2">
                    <GraduationCap size={18} /> {t.alumniDetail.sharedConnections}
                  </Typography>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {connections.map((c) => (
                      <Link key={c.id} href={`/alumni/${c.id}`} className="flex items-center gap-2 text-sm hover:underline">
                        <MapPin size={14} className="text-muted" />
                        {c.display_name}
                      </Link>
                    ))}
                  </div>
                </Card.Content>
              </Card>
            )}
          </div>
        )}
      </StateBoundary>
    </div>
  );
}
