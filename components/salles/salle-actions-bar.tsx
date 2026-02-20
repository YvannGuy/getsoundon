"use client";

import { useState, useEffect } from "react";
import { Flag, Heart, Share2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { toggleFavori } from "@/app/actions/favoris";
import { reportSalle } from "@/app/actions/salle-reports";
import { rateSalle } from "@/app/actions/salle-ratings";
import { REPORT_REASONS, type ReportReason } from "@/lib/salle-reports";
import { useRouter } from "next/navigation";

type SalleActionsBarProps = {
  salleId: string;
  salleName: string;
  slug: string;
  isLoggedIn: boolean;
  initialIsFavori: boolean;
  initialRating: { avg: number; count: number; userStars: number | null };
};

export function SalleActionsBar({
  salleId,
  salleName,
  slug,
  isLoggedIn,
  initialIsFavori,
  initialRating,
}: SalleActionsBarProps) {
  const router = useRouter();
  const [isFavori, setIsFavori] = useState(initialIsFavori);
  const [pendingFavori, setPendingFavori] = useState(false);
  const [avg, setAvg] = useState(initialRating.avg);
  const [count, setCount] = useState(initialRating.count);
  const [userStars, setUserStars] = useState<number | null>(initialRating.userStars);
  const [pendingRate, setPendingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    setAvg(initialRating.avg);
    setCount(initialRating.count);
    setUserStars(initialRating.userStars);
  }, [initialRating.avg, initialRating.count, initialRating.userStars]);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${salleName} - Louer une salle pour votre événement`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: salleName,
          text,
          url,
        });
      } catch {
        copyAndShowFallback(url);
      }
    } else {
      copyAndShowFallback(url);
    }
  };

  const copyAndShowFallback = (url: string) => {
    navigator.clipboard?.writeText(url);
    setShareOpen(true);
  };

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | "">("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportPending, setReportPending] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const encodedUrl = typeof window !== "undefined" ? encodeURIComponent(shareUrl) : "";
  const encodedText = typeof window !== "undefined" ? encodeURIComponent(`${salleName} - Louer une salle`) : "";

  const handleFavori = async () => {
    setPendingFavori(true);
    const result = await toggleFavori(salleId);
    setPendingFavori(false);
    if (result.success) {
      setIsFavori(result.added);
      router.refresh();
    } else if (result.error === "Connexion requise") {
      window.location.href = `/auth?redirectTo=${encodeURIComponent(`/salles/${slug}`)}`;
    }
  };

  const handleRate = async (stars: number) => {
    if (!isLoggedIn) {
      window.location.href = `/auth?redirectTo=${encodeURIComponent(`/salles/${slug}`)}`;
      return;
    }
    setRateError(null);
    setPendingRate(true);
    const prevStars = userStars;
    setUserStars(stars);
    const result = await rateSalle(salleId, stars);
    setPendingRate(false);
    if (result.success) {
      router.refresh();
    } else {
      setUserStars(prevStars);
      setRateError(result.error ?? "Erreur lors de la notation");
    }
  };

  const handleReportSubmit = async () => {
    if (!reportReason) return;
    setReportPending(true);
    const result = await reportSalle(salleId, reportReason as ReportReason, reportDetails || null);
    setReportPending(false);
    if (result.success) {
      setReportSuccess(true);
      setTimeout(() => {
        setReportOpen(false);
        setReportSuccess(false);
        setReportReason("");
        setReportDetails("");
      }, 1500);
    } else if (result.error === "Connexion requise pour signaler") {
      window.location.href = `/auth?redirectTo=${encodeURIComponent(`/salles/${slug}`)}`;
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5" title={!isLoggedIn ? "Connectez-vous pour noter" : undefined}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              disabled={pendingRate}
              onClick={() => handleRate(s)}
              className="cursor-pointer rounded p-0.5 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Noter ${s} étoile${s > 1 ? "s" : ""}`}
            >
              <Star
                className={`h-5 w-5 ${
                  (userStars ?? avg) >= s
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-300"
                }`}
              />
            </button>
          ))}
        </div>
        <span className="text-[13px] text-slate-500">
          {avg > 0 ? `${avg.toFixed(1)}` : "—"} ({count} avis)
        </span>
        {rateError && (
          <span className="text-xs text-red-600">{rateError}</span>
        )}
      </div>
      <Popover open={shareOpen} onOpenChange={setShareOpen}>
        <PopoverAnchor asChild>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-black"
          >
            <Share2 className="h-4 w-4" />
            Partager
          </button>
        </PopoverAnchor>
        <PopoverContent className="w-64 p-3" align="start">
          <p className="mb-3 text-[13px] font-medium text-slate-700">Partager sur</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1877f2] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#166fe5]"
            >
              Facebook
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-[12px] font-medium text-white hover:bg-slate-800"
            >
              X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a66c2] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#004182]"
            >
              LinkedIn
            </a>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Lien copié dans le presse-papiers</p>
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={handleFavori}
        disabled={pendingFavori}
        className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-black disabled:opacity-50"
      >
        <Heart
          className={`h-4 w-4 ${isFavori ? "fill-rose-500 text-rose-500" : ""}`}
        />
        {isFavori ? "Sauvegardé" : "Sauvegarder"}
      </button>
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-black"
        >
          <Flag className="h-4 w-4" />
          Signaler
        </button>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Signaler cette salle</DialogTitle>
            <DialogDescription>
              Indiquez la raison du signalement. L&apos;équipe traitera votre demande dans les meilleurs délais.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Pourquoi signalez-vous cette salle ?
              </label>
              <div className="space-y-2">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition has-[:checked]:border-[#213398] has-[:checked]:bg-[#213398]/10"
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.id}
                      checked={reportReason === r.id}
                      onChange={() => setReportReason(r.id)}
                      className="h-4 w-4 border-slate-300 text-black"
                    />
                    <span className="text-sm text-slate-700">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Détails supplémentaires (optionnel)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Précisez si besoin..."
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReportOpen(false)}
              disabled={reportPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleReportSubmit}
              disabled={!reportReason || reportPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {reportPending ? "Envoi..." : reportSuccess ? "Envoyé ✓" : "Valider le signalement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
