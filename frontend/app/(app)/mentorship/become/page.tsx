"use client";

import * as React from "react";
import { Card, Input, Label, TextField, Typography } from "@heroui/react";
import { ApiErrorAlert, SuccessAlert } from "@/components/common/alerts";
import { PendingButton } from "@/components/common/pending-button";
import { useBecomeMentor } from "@/features/mentorship";
import { useI18n } from "@/lib/i18n";

export default function BecomeMentorPage() {
  const { t } = useI18n();
  const become = useBecomeMentor();
  const [expertise, setExpertise] = React.useState("");
  const [area, setArea] = React.useState("");

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <Card.Content className="gap-4">
          <div>
            <Typography type="h6">{t.mentorship.becomeTitle}</Typography>
            <p className="text-sm text-muted">{t.mentorship.becomeHint}</p>
          </div>
          {become.isError && <ApiErrorAlert error={become.error} />}
          {become.isSuccess && <SuccessAlert title={t.mentorship.becomeSubmitted} />}
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              become.mutate({ expertise, mentor_area: area });
            }}
          >
            <TextField name="expertise">
              <Label>{t.mentorship.expertise}</Label>
              <Input value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder={t.mentorship.expertisePlaceholder} />
            </TextField>
            <TextField name="area">
              <Label>{t.mentorship.mentorArea}</Label>
              <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder={t.mentorship.areaPlaceholder} />
            </TextField>
            <PendingButton type="submit" variant="primary" pending={become.isPending} isDisabled={!expertise.trim() || !area.trim()}>
              {t.common.submit}
            </PendingButton>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
