import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function toTimeString(date: Date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function formatDateTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  disabled,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const timeValue = value ? toTimeString(value) : "12:00";

  function handleDateSelect(date: Date | undefined) {
    if (!date) {
      onChange(undefined);
      return;
    }
    onChange(combineDateAndTime(date, timeValue));
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!value) {
      const today = new Date();
      onChange(combineDateAndTime(today, e.target.value));
      return;
    }
    onChange(combineDateAndTime(value, e.target.value));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {value ? formatDateTimeLabel(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={handleDateSelect} initialFocus />
        <div className="border-t px-3 py-2">
          <Input type="time" value={timeValue} onChange={handleTimeChange} className="h-8" />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DateTimePicker };
