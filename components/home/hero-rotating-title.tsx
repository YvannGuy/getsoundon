"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ITEMS: { word: string; determiner: "votre" | "vos" }[] = [
  { word: "événement cultuel", determiner: "votre" },
  { word: "culte", determiner: "votre" },
  { word: "baptême", determiner: "votre" },
  { word: "conférence", determiner: "votre" },
  { word: "célébrations", determiner: "vos" },
  { word: "retraites", determiner: "vos" },
  { word: "concert", determiner: "votre" },
];

const INTERVAL_MS = 3000;

export function HeroRotatingTitle({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % ITEMS.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const { word, determiner } = ITEMS[index];

  return (
    <h1
      className={cn(
        "max-w-[580px] text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-black sm:text-[42px] lg:text-[56px]",
        className
      )}
    >
      Trouvez une salle adaptée à {determiner}{" "}
      <span
        key={index}
        className="inline-block animate-fade-in"
      >
        {word}
      </span>
    </h1>
  );
}
