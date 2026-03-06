"use client";

import { useEffect, useRef, useState } from "react";
import { format, parse, isValid, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { fr } from "react-day-picker/locale";
import { CalendarDays, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";

const DATE_FORMAT = "dd/MM/yyyy";

function parseDateInput(input: string): Date | undefined {
  const trimmed = input.trim().replace(/[-./]/g, "/");
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length !== 3) return undefined;
  const [d, m, y] = parts;
  const ys = y.length === 2 ? `20${y}` : y;
  if (d.length <= 2 && m.length <= 2 && ys.length === 4) {
    const parsed = parse(`${d.padStart(2, "0")}/${m.padStart(2, "0")}/${ys}`, DATE_FORMAT, new Date());
    return isValid(parsed) ? parsed : undefined;
  }
  return undefined;
}

function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

interface DateRangePickerProps {
  value?: { from?: Date; to?: Date };
  onChange?: (range: { from?: Date; to?: Date } | undefined) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Afficher une bordure rouge en cas d'erreur */
  error?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Du jj/mm/aaaa au jj/mm/aaaa",
  className,
  inputClassName,
  error,
}: DateRangePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<{ from?: Date; to?: Date } | undefined>(value);
  const [fromInput, setFromInput] = useState(value?.from ? format(value.from, DATE_FORMAT) : "");
  const [toInput, setToInput] = useState(value?.to ? format(value.to, DATE_FORMAT) : "");

  useEffect(() => {
    if (value) {
      setRange(value);
      setFromInput(value.from ? format(value.from, DATE_FORMAT) : "");
      setToInput(value.to ? format(value.to, DATE_FORMAT) : "");
    }
  }, [value?.from?.getTime(), value?.to?.getTime()]);

  const handleSelect = (r: { from?: Date; to?: Date } | undefined) => {
    setRange(r);
    setFromInput(r?.from ? format(r.from, DATE_FORMAT) : "");
    setToInput(r?.to ? format(r.to, DATE_FORMAT) : "");
    onChange?.(r);
    if (r?.from && r?.to) setOpen(false);
  };

  const displayValue =
    fromInput && toInput
      ? `${fromInput} au ${toInput}`
      : fromInput
        ? `${fromInput} au ...`
        : "";

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRange(undefined);
    setFromInput("");
    setToInput("");
    onChange?.(undefined);
  };

  const [isCompactLayout, setIsCompactLayout] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsCompactLayout(mq.matches);
    const fn = () => setIsCompactLayout(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const dateSlotWidthClass = isCompactLayout ? "min-w-[74px]" : "min-w-[92px] lg:min-w-[104px]";

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative flex w-full cursor-pointer flex-nowrap items-center gap-2.5 overflow-hidden rounded-lg border bg-white p-2.5 pr-10 text-left transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#213398]/20",
          error ? "border-rose-500" : "border-slate-200",
          inputClassName
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarDays className="pointer-events-none h-[18px] w-[18px] shrink-0 text-slate-400" />
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-[12px] font-medium text-slate-500">Du</span>
            <span
              className={cn(
                "inline-block rounded-lg px-2 py-2.5 text-[13px] whitespace-nowrap",
                dateSlotWidthClass,
                fromInput ? "text-slate-900" : "text-slate-400"
              )}
            >
              {fromInput || "jj/mm/aaaa"}
            </span>
          </div>
          <span className="shrink-0 text-[12px] font-medium text-slate-500">au</span>
          <span
            className={cn(
              "inline-block rounded-lg px-2 py-2.5 text-[13px] whitespace-nowrap",
              dateSlotWidthClass,
              toInput ? "text-slate-900" : "text-slate-400"
            )}
          >
            {toInput || "jj/mm/aaaa"}
          </span>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
      </button>
      {displayValue && (
        <button
          type="button"
          onClick={handleClear}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-8 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Effacer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {open && (
        <div
          className={cn(
            "absolute top-[calc(100%+8px)] z-[20000] rounded-md border border-slate-200 bg-white p-0 shadow-md",
            isCompactLayout
              ? "left-0 w-full min-w-0 max-w-full"
              : "right-0 w-auto max-w-[calc(100vw-2rem)]"
          )}
          role="dialog"
          aria-label={placeholder}
        >
          <Calendar
            mode="range"
            selected={range as import("react-day-picker").DateRange | undefined}
            onSelect={handleSelect}
            disabled={{ before: startOfDay(new Date()) }}
            numberOfMonths={isCompactLayout ? 1 : 2}
            compact={isCompactLayout}
            locale={fr}
          />
        </div>
      )}
    </div>
  );
}
