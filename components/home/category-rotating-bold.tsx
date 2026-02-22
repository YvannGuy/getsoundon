"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Cultes",
  "Conférences",
  "Baptêmes",
  "Célébrations",
  "Retraites",
  "Concert",
  "Podcast",
];

const INTERVAL_MS = 2500;

export function CategoryRotatingBold() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % CATEGORIES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-5 sm:grid-cols-3">
      {CATEGORIES.map((label, idx) => (
        <span
          key={label}
          className={cn(
            "text-lg transition-all duration-300",
            idx === activeIndex ? "font-bold text-[#213398]" : "font-medium text-slate-700"
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
