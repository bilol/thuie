"use client";

import * as React from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { useI18n } from "@/lib/i18n";

/**
 * Free-form token field for forum tags / alumni skills. Enter or comma commits
 * a token; backspacing on empty removes the last. Keeps a controlled string[].
 */
export function TagInput({
  label,
  placeholder,
  value,
  onChange,
  max = 10,
}: {
  label?: string;
  placeholder?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
}) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t.common.tagPlaceholder;
  const [draft, setDraft] = React.useState("");

  const commit = (raw: string) => {
    const token = raw.trim().replace(/^#/, "");
    setDraft("");
    if (!token) return;
    if (value.includes(token) || value.length >= max) return;
    onChange([...value, token]);
  };

  return (
    <div className="space-y-2">
      <TextField name="tag-input">
        {label && <Label>{label}</Label>}
        <Input
          placeholder={resolvedPlaceholder}
          aria-label={label ?? resolvedPlaceholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
        />
      </TextField>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Button
              key={tag}
              size="sm"
              variant="tertiary"
              className="rounded-full"
              onPress={() => onChange(value.filter((v) => v !== tag))}
            >
              #{tag}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
