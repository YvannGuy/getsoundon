import assert from "node:assert/strict";
import test from "node:test";

import { computeCancellationRefund } from "@/lib/cancellation-policy";

test("computeCancellationRefund: annulation propriétaire = 100%", () => {
  const res = computeCancellationRefund({
    actor: "owner",
    policy: "strict",
    eventStartAt: new Date("2026-06-01T10:00:00.000Z"),
    now: new Date("2026-05-01T10:00:00.000Z"),
    amountPaidCents: 10000,
  });
  assert.equal(res.refundCents, 10000);
  assert.equal(res.ownerKeepsCents, 0);
});

test("computeCancellationRefund: strict seeker <30j", () => {
  const res = computeCancellationRefund({
    actor: "seeker",
    policy: "strict",
    eventStartAt: new Date("2026-06-01T10:00:00.000Z"),
    now: new Date("2026-05-20T10:00:00.000Z"),
    amountPaidCents: 10000,
  });
  assert.equal(res.refundCents, 0);
  assert.equal(res.ownerKeepsCents, 10000);
});
