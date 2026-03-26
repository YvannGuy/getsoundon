import assert from "node:assert/strict";
import test from "node:test";

import { computeCancellationRefundGear } from "../templates/lib/cancellation-policy-gear";

test("gear cancellation: owner cancel => 100% refund", () => {
  const res = computeCancellationRefundGear({
    actor: "owner",
    policy: "strict",
    eventStartAt: new Date("2026-06-01T10:00:00.000Z"),
    now: new Date("2026-05-01T10:00:00.000Z"),
    amountPaidCents: 10000,
  });
  assert.equal(res.refundCents, 10000);
  assert.equal(res.ownerKeepsCents, 0);
});

test("gear cancellation: strict seeker <30 days => 0 refund", () => {
  const res = computeCancellationRefundGear({
    actor: "seeker",
    policy: "strict",
    eventStartAt: new Date("2026-06-01T10:00:00.000Z"),
    now: new Date("2026-05-20T10:00:00.000Z"),
    amountPaidCents: 10000,
  });
  assert.equal(res.refundCents, 0);
  assert.equal(res.ownerKeepsCents, 10000);
});
