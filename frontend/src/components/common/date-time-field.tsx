"use client";

import { Calendar, DateField, DatePicker, Label } from "@heroui/react";
import type { CalendarDateTime } from "@internationalized/date";

/**
 * A date *and* a time in one control: HeroUI's DatePicker with minute
 * granularity, so event start/end read as the datetime they are instead of a
 * bare browser `datetime-local`. Controlled on the `DateTime` the picker hands
 * back — callers collapse it to an ISO string (`dt.toString()`) only at submit.
 */
export function DateTimeField({
  label,
  name,
  value,
  onChange,
  isDisabled,
}: {
  label: string;
  name?: string;
  value: CalendarDateTime | null;
  onChange: (value: CalendarDateTime | null) => void;
  isDisabled?: boolean;
}) {
  return (
    <DatePicker name={name} granularity="minute" value={value} onChange={onChange} isDisabled={isDisabled}>
      <Label>{label}</Label>
      <DateField.Group>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar aria-label={label}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}
