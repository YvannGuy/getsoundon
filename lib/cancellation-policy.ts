export type CancellationPolicy = "strict" | "moderate" | "flexible";
export type CancellationActor = "owner" | "seeker" | "admin";

type ComputeCancellationRefundArgs = {
  policy: CancellationPolicy;
  actor: CancellationActor;
  eventStartAt: Date;
  now: Date;
  amountPaidCents: number;
  noShowReportedBy?: "none" | "owner" | "seeker";
};

export type CancellationRefundResult = {
  refundCents: number;
  ownerKeepsCents: number;
  policyApplied: CancellationPolicy;
  reasonCode:
    | "owner_cancel_full_refund"
    | "admin_cancel_full_refund"
    | "seeker_strict"
    | "seeker_moderate"
    | "seeker_flexible"
    | "no_show_owner_no_refund"
    | "no_show_seeker_full_refund";
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function hoursBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / (1000 * 60 * 60);
}

export function computeCancellationRefund(
  args: ComputeCancellationRefundArgs
): CancellationRefundResult {
  const { policy, actor, eventStartAt, now, amountPaidCents } = args;
  const paid = Math.max(0, Math.round(amountPaidCents));

  if (args.noShowReportedBy === "owner") {
    return {
      refundCents: 0,
      ownerKeepsCents: paid,
      policyApplied: policy,
      reasonCode: "no_show_owner_no_refund",
    };
  }
  if (args.noShowReportedBy === "seeker") {
    return {
      refundCents: paid,
      ownerKeepsCents: 0,
      policyApplied: policy,
      reasonCode: "no_show_seeker_full_refund",
    };
  }

  if (actor === "owner") {
    return {
      refundCents: paid,
      ownerKeepsCents: 0,
      policyApplied: policy,
      reasonCode: "owner_cancel_full_refund",
    };
  }
  if (actor === "admin") {
    return {
      refundCents: paid,
      ownerKeepsCents: 0,
      policyApplied: policy,
      reasonCode: "admin_cancel_full_refund",
    };
  }

  const leadHours = hoursBetween(eventStartAt, now);
  const leadDays = leadHours / 24;
  let refundPercent = 0;

  if (policy === "strict") {
    refundPercent = leadDays >= 30 ? 80 : 0;
  } else if (policy === "moderate") {
    if (leadDays >= 14) refundPercent = 100;
    else if (leadDays >= 7) refundPercent = 50;
    else refundPercent = 0;
  } else {
    if (leadDays >= 7) refundPercent = 100;
    else if (leadHours >= 48) refundPercent = 70;
    else refundPercent = 20;
  }

  const percent = clampPercent(refundPercent);
  const refundCents = Math.round((paid * percent) / 100);
  return {
    refundCents,
    ownerKeepsCents: Math.max(0, paid - refundCents),
    policyApplied: policy,
    reasonCode:
      policy === "strict"
        ? "seeker_strict"
        : policy === "moderate"
          ? "seeker_moderate"
          : "seeker_flexible",
  };
}
