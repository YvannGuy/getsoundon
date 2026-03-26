export type CancellationActor = "owner" | "seeker" | "admin";
export type CancellationPolicy = "strict" | "moderate" | "flexible";

export type CancellationRefundResult = {
  refundCents: number;
  ownerKeepsCents: number;
  policyApplied: CancellationPolicy;
  reasonCode:
    | "owner_cancel"
    | "admin_cancel"
    | "seeker_flexible"
    | "seeker_moderate"
    | "seeker_strict";
};

function clampMoney(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value);
}

export function computeCancellationRefundGear(args: {
  actor: CancellationActor;
  policy: CancellationPolicy;
  eventStartAt: Date;
  now: Date;
  amountPaidCents: number;
}): CancellationRefundResult {
  const amount = clampMoney(args.amountPaidCents);

  if (args.actor === "owner") {
    return {
      refundCents: amount,
      ownerKeepsCents: 0,
      policyApplied: args.policy,
      reasonCode: "owner_cancel",
    };
  }

  if (args.actor === "admin") {
    return {
      refundCents: amount,
      ownerKeepsCents: 0,
      policyApplied: args.policy,
      reasonCode: "admin_cancel",
    };
  }

  const ms = args.eventStartAt.getTime() - args.now.getTime();
  const daysBefore = ms / (1000 * 60 * 60 * 24);

  if (args.policy === "flexible") {
    return {
      refundCents: amount,
      ownerKeepsCents: 0,
      policyApplied: args.policy,
      reasonCode: "seeker_flexible",
    };
  }

  if (args.policy === "moderate") {
    const refund = daysBefore >= 7 ? amount : Math.round(amount * 0.5);
    return {
      refundCents: refund,
      ownerKeepsCents: amount - refund,
      policyApplied: args.policy,
      reasonCode: "seeker_moderate",
    };
  }

  const refund = daysBefore >= 30 ? amount : 0;
  return {
    refundCents: refund,
    ownerKeepsCents: amount - refund,
    policyApplied: args.policy,
    reasonCode: "seeker_strict",
  };
}
