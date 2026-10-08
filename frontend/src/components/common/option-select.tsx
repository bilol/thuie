"use client";

import * as React from "react";
import { Description, Label, ListBox, Select } from "@heroui/react";
import { singleKey } from "@/lib/ui-keys";

export interface SelectOption {
  key: string;
  label: React.ReactNode;
  /** Accessible text for the item; defaults to `label` when it is a plain string. */
  textValue?: string;
}

/**
 * Single-select field built on HeroUI `Select` + `ListBox`. The Trigger / Popover /
 * ListBox scaffold was repeated ~16× across forms and list filters; this wraps it
 * behind a declarative `options` list and normalises the selection to a string key.
 */
export function OptionSelect({
  label,
  ariaLabel,
  value,
  onChange,
  options,
  placeholder,
  className,
  isDisabled,
  hint,
}: {
  /** Visible label; omit for icon/filter selects that rely on `ariaLabel`. */
  label?: React.ReactNode;
  ariaLabel?: string;
  value?: string | null;
  onChange: (key: string | undefined) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
  /** Optional helper text shown under the label (HeroUI `Description`). */
  hint?: React.ReactNode;
}) {
  return (
    <Select
      aria-label={ariaLabel}
      className={className}
      placeholder={placeholder}
      value={value ?? null}
      isDisabled={isDisabled}
      onChange={(k) => onChange(singleKey(k))}
    >
      {label != null && <Label>{label}</Label>}
      {/* A field only accepts its own slot components. A bare element here (the
          Typography this used to be) throws "A slot prop is required"; HeroUI's
          Description is Text[slot="description"], and .description already
          carries the helper-text look (text-xs text-muted). */}
      {hint != null && <Description className="px-3">{hint}</Description>}
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((o) => (
            <ListBox.Item
              key={o.key}
              id={o.key}
              textValue={o.textValue ?? (typeof o.label === "string" ? o.label : undefined)}
            >
              {o.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
