"use client";

import { useEffect, useState } from "react";

type Props = {
  targetDate: string; // ISO string
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function ComingSoonCountdown({ targetDate }: Props) {
  const [mounted, setMounted] = useState(false);
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setMounted(true);
    const target = new Date(targetDate).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);

      if (diff <= 0) {
        setDays(0);
        setHours(0);
        setMinutes(0);
        setSeconds(0);
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setDays(d);
      setHours(h);
      setMinutes(m);
      setSeconds(s);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!mounted) {
    return (
      <div className="flex justify-center gap-2 sm:gap-4">
        <div className="text-center">
          <div className="text-[32px] font-bold text-white sm:text-[48px] md:text-[56px]">07</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/90 sm:text-[13px]">Jours</div>
        </div>
        <div className="flex items-end pb-2 text-2xl font-bold text-white/80 sm:text-3xl">:</div>
        <div className="text-center">
          <div className="text-[32px] font-bold text-white sm:text-[48px] md:text-[56px]">00</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/90 sm:text-[13px]">Heures</div>
        </div>
        <div className="flex items-end pb-2 text-2xl font-bold text-white/80 sm:text-3xl">:</div>
        <div className="text-center">
          <div className="text-[32px] font-bold text-white sm:text-[48px] md:text-[56px]">00</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/90 sm:text-[13px]">Minutes</div>
        </div>
        <div className="flex items-end pb-2 text-2xl font-bold text-white/80 sm:text-3xl">:</div>
        <div className="text-center">
          <div className="text-[32px] font-bold text-white sm:text-[48px] md:text-[56px]">00</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/90 sm:text-[13px]">Secondes</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-4">
      <div className="text-center">
        <div className="text-[32px] font-bold text-white sm:text-[48px] md:text-[56px]">{pad(days)}</div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/90 sm:text-[13px]">Jours</div>
      </div>
      <div className="flex items-end pb-2 text-2xl font-bold text-white/80 sm:text-3xl">:</div>
      <div className="text-center">
        <div className="text-[32px] font-bold text-white sm:text-[48px] md:text-[56px]">{pad(hours)}</div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/90 sm:text-[13px]">Heures</div>
      </div>
      <div className="flex items-end pb-2 text-2xl font-bold text-white/80 sm:text-3xl">:</div>
      <div className="text-center">
        <div className="text-[32px] font-bold text-white sm:text-[48px] md:text-[56px]">{pad(minutes)}</div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/90 sm:text-[13px]">Minutes</div>
      </div>
      <div className="flex items-end pb-2 text-2xl font-bold text-white/80 sm:text-3xl">:</div>
      <div className="text-center">
        <div className="text-[32px] font-bold text-white sm:text-[48px] md:text-[56px]">{pad(seconds)}</div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/90 sm:text-[13px]">Secondes</div>
      </div>
    </div>
  );
}
