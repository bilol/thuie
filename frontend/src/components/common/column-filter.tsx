"use client";

import * as React from "react";
import { Dropdown } from "@heroui/react";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Column-header funnel filter — the affordance first introduced on the admin
 * users table (status / role / program) and reused across every admin list so a
 * filter lives on the column it narrows rather than in a toolbar above the table.
 * `value` of "all" renders the trigger muted; any other value tints it accent.
 */
export function ColumnFilter({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  /** Current selection; the sentinel "all" means "no filter". */
  value: string;
  options: { key: string; label: string }[];
  onChange: (key: string) => void;
}) {
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center rounded-lg p-1 hover:bg-surface",
          value !== "all" ? "text-accent" : "text-muted",
        )}
      >
        <Filter size={13} />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label={ariaLabel} onAction={(key) => onChange(String(key))}>
          {options.map((o) => (
            <Dropdown.Item key={o.key} id={o.key} textValue={o.label} className={cn(o.key === value && "text-accent")}>
              {o.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
