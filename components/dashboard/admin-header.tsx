"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { Bell, Building2, ChevronDown, CreditCard, LogOut, Settings, Trash2, User, Users, X } from "lucide-react";

import { signOutAdminAction } from "@/app/actions/auth-admin";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export type NotificationItem = {
  id: string;
  type: "user" | "annonce" | "paiement";
  label: string;
  href: string;
  date: string;
};

const NOTIFICATIONS_READ_KEY = "admin_notifications_read_at";
const NOTIFICATIONS_DISMISSED_KEY = "admin_notifications_dismissed";

function getDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  localStorage.setItem(NOTIFICATIONS_DISMISSED_KEY, JSON.stringify([...ids]));
}

type AdminHeaderProps = {
  title?: string;
  subtitle?: string;
  pendingCount?: number;
  notifications?: NotificationItem[];
};

export function AdminHeader({ title, subtitle, pendingCount = 0, notifications = [] }: AdminHeaderProps) {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const visibleNotifications = notifications.filter((n) => !dismissedIds.has(n.id));
  const badgeCount = visibleNotifications.length;

  useLayoutEffect(() => {
    setDismissedIds(getDismissedIds());
  }, []);

  const handleMarkAllRead = () => {
    localStorage.setItem(NOTIFICATIONS_READ_KEY, new Date().toISOString());
    const next = new Set([...dismissedIds, ...visibleNotifications.map((n) => n.id)]);
    setDismissedIds(next);
    saveDismissedIds(next);
    setNotifOpen(false);
  };

  const handleDismissOne = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const next = new Set(dismissedIds).add(id);
    setDismissedIds(next);
    saveDismissedIds(next);
  };

  const handleDismissAll = (e: React.MouseEvent) => {
    e.preventDefault();
    const next = new Set([...dismissedIds, ...visibleNotifications.map((n) => n.id)]);
    setDismissedIds(next);
    saveDismissedIds(next);
    setNotifOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open, notifOpen]);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 pl-16 lg:pl-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title ?? "Dashboard Admin"}</h1>
        <p className="text-sm text-slate-600">
          {subtitle ?? "Vue d'ensemble de votre plateforme"}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {badgeCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="font-semibold text-slate-900">Nouveautés</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {visibleNotifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">Aucune nouveauté</p>
                ) : (
                  visibleNotifications.map((n) => {
                    const Icon =
                      n.type === "user" ? Users : n.type === "annonce" ? Building2 : CreditCard;
                    return (
                      <div
                        key={n.id}
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
                      >
                        <Link
                          href={n.href}
                          onClick={() => setNotifOpen(false)}
                          className="flex min-w-0 flex-1 gap-3 text-left"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                            <Icon className="h-4 w-4 text-slate-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 truncate">{n.label}</p>
                            <p className="text-xs text-slate-500">
                              {n.date
                                ? formatDistanceToNow(new Date(n.date), { addSuffix: true, locale: fr })
                                : ""}
                            </p>
                          </div>
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => handleDismissOne(e, n.id)}
                          className="shrink-0 rounded p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-red-600"
                          aria-label="Supprimer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              {visibleNotifications.length > 0 && (
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2">
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Tout lire
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissAll}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600"
                    title="Tout supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Tout supprimer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <Link
          href="/admin/parametres"
          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Paramètres"
        >
          <Settings className="h-5 w-5" />
        </Link>
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-700 transition hover:bg-slate-100"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200">
              <User className="h-5 w-5 text-slate-600" />
            </div>
            <span className="text-sm font-medium text-slate-900">Admin</span>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <form action={signOutAdminAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
