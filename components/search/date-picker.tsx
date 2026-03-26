"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, endOfWeek, format, parse, isValid, startOfDay, nextSaturday } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

function getPresets() {
  const today = startOfDay(new Date());
  return [
    { label: "Aujourd'hui", getDate: () => today },
    { label: "Demain", getDate: () => addDays(today, 1) },
    { label: "Ce week-end", getDate: () => (today.getDay() === 6 ? today : nextSaturday(today)) },
    { label: "Semaine prochaine", getDate: () => addDays(endOfWeek(today, { weekStartsOn: 1 }), 1) },
  ] as const;
}

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function DatePicker({ value, onChange, placeholder = "jj/mm/aaaa", className, inputClassName }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(value);
  const [inputValue, setInputValue] = useState(value ? format(value, DATE_FORMAT) : "");
  const [validationState, setValidationState] = useState<"idle" | "valid" | "invalid">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) {
      setDate(value);
      setInputValue(format(value, DATE_FORMAT));
      setValidationState("valid");
    }
  }, [value]);

  const handleSelect = (d: Date | undefined) => {
    setDate(d);
    setInputValue(d ? format(d, DATE_FORMAT) : "");
    setValidationState(d ? "valid" : "idle");
    onChange?.(d);
    if (d) setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatDateInput(raw);
    setInputValue(formatted);
    if (formatted.length === 10) {
      const parsed = parseDateInput(formatted);
      const now = startOfDay(new Date());
      if (parsed) {
        setDate(parsed >= now ? parsed : undefined);
        setValidationState(parsed >= now ? "valid" : "invalid");
        if (parsed >= now) onChange?.(parsed);
      } else {
        setValidationState("invalid");
      }
    } else {
      setValidationState("idle");
      if (formatted === "") {
        setDate(undefined);
        onChange?.(undefined);
      }
    }
  };

  const handleInputBlur = () => {
    if (date) {
      setInputValue(format(date, DATE_FORMAT));
      setValidationState("valid");
    } else if (inputValue) {
      const parsed = parseDateInput(inputValue);
      const now = startOfDay(new Date());
      if (parsed && parsed >= now) {
        setDate(parsed);
        setInputValue(format(parsed, DATE_FORMAT));
        setValidationState("valid");
        onChange?.(parsed);
      } else if (parsed && parsed < now) {
        setValidationState("invalid");
      } else {
        setInputValue("");
        setValidationState("idle");
      }
    } else {
      setValidationState("idle");
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDate(undefined);
    setInputValue("");
    setValidationState("idle");
    onChange?.(undefined);
    inputRef.current?.focus();
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            maxLength={10}
            className={cn(
              "h-11 rounded-lg border-slate-200 pl-10 pr-20 text-[14px]",
              "focus-visible:border-gs-orange focus-visible:ring-gs-orange/20",
              validationState === "invalid" && "border-rose-300 bg-rose-50/30",
              inputClassName
            )}
          />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                onMouseDown={(e) => e.preventDefault()}
                className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Effacer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded text-black hover:bg-gs-orange/5"
                aria-label="Ouvrir le calendrier"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </PopoverTrigger>
          </div>
        </div>
        <PopoverContent className="w-[260px] min-w-[260px] max-w-[calc(100vw-2rem)] p-0" align="start" sideOffset={6}>
          <div className="flex flex-col">
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">Raccourcis</p>
              <div className="grid grid-cols-2 gap-1">
                {getPresets().map((preset) => {
                  const d = preset.getDate();
                  const isDisabled = d < startOfDay(new Date());
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && handleSelect(d)}
                      className={cn(
                        "rounded px-2 py-1.5 text-left text-[11px]",
                        isDisabled ? "text-slate-300" : "text-slate-600 hover:bg-gs-orange/5 hover:text-black"
                      )}
                    >
                      {preset.label}
                      <span className="ml-0.5 text-slate-400">({format(d, "d MMM", { locale: fr })})</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-2">
              <Calendar compact mode="single" selected={date} onSelect={handleSelect} disabled={{ before: startOfDay(new Date()) }} />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {validationState === "invalid" && (
        <p className="mt-1 text-[11px] text-rose-600">Date à partir d&apos;aujourd&apos;hui</p>
      )}
    </div>
  );
}
