"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { fr } from "react-day-picker/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & { compact?: boolean };

function Calendar({ className, classNames, showOutsideDays = true, compact = false, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={fr}
      showOutsideDays={showOutsideDays}
      className={cn(compact ? "p-2" : "p-3", className)}
      classNames={{
        months: "flex flex-col",
        month: compact ? "space-y-1" : "space-y-4",
        caption: "flex justify-center py-1 relative items-center min-w-[196px]",
        caption_label: compact ? "text-xs font-medium" : "text-sm font-medium",
        nav: "flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          compact ? "h-6 w-6" : "h-7 w-7",
          "bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse",
        head_row: "grid grid-cols-7 gap-0",
        head_cell: cn(
          "text-slate-500 font-normal text-center",
          compact ? "text-[10px] w-7" : "text-[0.75rem] w-8"
        ),
        row: cn("grid grid-cols-7 gap-0", compact ? "mt-0.5" : "mt-2"),
        cell: cn(
          "relative p-0 text-center flex justify-center focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-slate-100 [&:has([aria-selected].day-outside)]:bg-slate-100/50",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          compact ? "h-7 w-7 text-xs" : "h-8 w-8",
          "p-0 font-normal aria-selected:opacity-100 w-7"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected: "bg-slate-900 text-slate-50 hover:bg-slate-900 hover:text-slate-50",
        day_today: "bg-slate-100 text-slate-900",
        day_outside: "text-slate-400 opacity-50",
        day_disabled: "text-slate-400 opacity-50",
        day_hidden: "invisible",
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
