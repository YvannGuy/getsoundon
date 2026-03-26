"use client";

import Link from "next/link";

export function DepositHoldActions({
  offerId,
}: {
  offerId: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-600">
        Section informative: toute demande de retenue se fait depuis l&apos;état des lieux via un litige.
      </p>
      <Link
        href={`/proprietaire/etats-des-lieux?offerId=${offerId}`}
        className="inline-flex text-xs font-medium text-gs-orange hover:underline"
      >
        Aller à l&apos;état des lieux
      </Link>
    </div>
  );
}
