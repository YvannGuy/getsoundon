"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { fr } from "react-day-picker/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & { compact?: boolean };

function Calendar({ className, classNames, showOutsideDays = true, compact = false, ...props }: CalendarProps) {
  const cellSize = compact ? "w-8 min-w-8" : "w-9 min-w-9";
  return (
    <DayPicker
      locale={fr}
      showOutsideDays={showOutsideDays}
      className={cn(compact ? "p-2" : "p-3", className)}
      classNames={{
        months: "flex flex-col",
        month: compact ? "space-y-1" : "space-y-4",
        month_caption: "flex justify-center py-1 relative items-center",
        caption_label: compact ? "text-xs font-medium" : "text-sm font-medium",
        nav: "flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          compact ? "h-6 w-6" : "h-7 w-7",
          "absolute left-0 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          compact ? "h-6 w-6" : "h-7 w-7",
          "absolute right-0 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        month_grid: "w-full table-fixed border-collapse",
        weekdays: "border-0",
        weekday: cn(
          "text-slate-500 font-normal text-center p-0 align-middle whitespace-nowrap",
          compact ? "text-[11px]" : "text-xs",
          cellSize
        ),
        weeks: "border-0",
        week: cn("border-0", compact ? "mt-0.5" : "mt-2"),
        day: cn(
          "relative p-0 text-center align-middle",
          cellSize,
          "[&:has([aria-selected])]:bg-slate-100",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          compact ? "h-8 w-8 text-xs" : "h-9 w-9",
          "p-0 font-normal aria-selected:opacity-100 mx-auto"
        ),
        range_start: "day-range-start",
        range_end: "day-range-end",
        range_middle: "day-range-middle",
        selected: "bg-slate-900 text-slate-50 hover:bg-slate-900 hover:text-slate-50",
        today: "bg-slate-100 text-slate-900",
        outside: "text-slate-400 opacity-50",
        disabled: "text-slate-400 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: (props) =>
          props.orientation === "left" ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
