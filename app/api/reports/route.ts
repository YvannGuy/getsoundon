import { NextResponse } from "next/server";
import { z } from "zod";

import { siteConfig } from "@/config/site";
import { sendNewGsReportAdminNotification } from "@/lib/email";
import { GS_REPORT_REASONS, type GsReportReasonCode } from "@/lib/gs-reports";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  target_type: z.enum(["listing", "provider"]),
  target_listing_id: z.string().uuid().nullable().optional(),
  target_provider_id: z.string().uuid().nullable().optional(),
  reason_code: z.string().min(1).max(64),
  message: z.string().trim().min(10).max(4000),
  reporter_email: z.string().trim().email().optional().nullable(),
});

const ALLOWED_CODES = new Set(GS_REPORT_REASONS.map((r) => r.code));

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`gs-report:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: "Trop de signalements. Réessayez plus tard." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides.", details: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
  if (!ALLOWED_CODES.has(body.reason_code as GsReportReasonCode)) {
    return NextResponse.json({ error: "Motif inconnu." }, { status: 400 });
  }

  if (body.target_type === "listing") {
    if (!body.target_listing_id) {
      return NextResponse.json({ error: "Annonce cible manquante." }, { status: 400 });
    }
    if (body.target_provider_id) {
      return NextResponse.json({ error: "Payload incohérent." }, { status: 400 });
    }
  } else {
    if (!body.target_provider_id) {
      return NextResponse.json({ error: "Prestataire cible manquant." }, { status: 400 });
    }
    if (body.target_listing_id) {
      return NextResponse.json({ error: "Payload incohérent." }, { status: 400 });
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const reporterEmailInput = body.reporter_email?.trim() || null;
  if (!user && !reporterEmailInput) {
    return NextResponse.json(
      { error: "Indiquez votre email pour que nous puissions vous recontacter si besoin." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  if (body.target_type === "listing" && body.target_listing_id) {
    const { data: listing } = await admin
      .from("gs_listings")
      .select("id, title, owner_id")
      .eq("id", body.target_listing_id)
      .maybeSingle();
    if (!listing) {
      return NextResponse.json({ error: "Annonce introuvable." }, { status: 404 });
    }
    if (user && (listing as { owner_id: string }).owner_id === user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas signaler votre propre annonce." }, { status: 403 });
    }
  }

  if (body.target_type === "provider" && body.target_provider_id) {
    const { data: prof } = await admin.from("profiles").select("id").eq("id", body.target_provider_id).maybeSingle();
    if (!prof) {
      return NextResponse.json({ error: "Prestataire introuvable." }, { status: 404 });
    }
    if (user && body.target_provider_id === user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas signaler votre propre compte." }, { status: 403 });
    }
  }

  const insertRow = {
    reporter_user_id: user?.id ?? null,
    reporter_email: user?.email?.trim() ?? reporterEmailInput,
    target_type: body.target_type,
    target_listing_id: body.target_type === "listing" ? body.target_listing_id! : null,
    target_provider_id: body.target_type === "provider" ? body.target_provider_id! : null,
    reason_code: body.reason_code,
    message: body.message.trim(),
    status: "new" as const,
  };

  const { data: inserted, error: insErr } = await admin.from("gs_reports").insert(insertRow).select("id").single();

  if (insErr) {
    console.error("[reports] insert", insErr.message);
    return NextResponse.json({ error: "Enregistrement impossible pour le moment." }, { status: 500 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const siteBase = siteConfig.url.replace(/\/$/, "");
  const adminReportsUrl = `${siteBase}/admin/signalements`;

  let targetLabel = "—";
  if (body.target_type === "listing" && body.target_listing_id) {
    const { data: li } = await admin.from("gs_listings").select("title").eq("id", body.target_listing_id).maybeSingle();
    targetLabel = (li as { title?: string } | null)?.title?.trim() || body.target_listing_id;
  } else if (body.target_provider_id) {
    const { data: pr } = await admin
      .from("profiles")
      .select("full_name, boutique_name, email")
      .eq("id", body.target_provider_id)
      .maybeSingle();
    const p = pr as { full_name?: string | null; boutique_name?: string | null; email?: string | null } | null;
    targetLabel =
      p?.boutique_name?.trim() || p?.full_name?.trim() || p?.email?.trim() || body.target_provider_id;
  }

  const reasonLabel =
    GS_REPORT_REASONS.find((r) => r.code === body.reason_code)?.label ?? body.reason_code;
  const reporterLine = user?.email?.trim()
    ? `${user.email} (compte)`
    : reporterEmailInput ?? "—";
  const preview =
    body.message.trim().length > 400 ? `${body.message.trim().slice(0, 400)}…` : body.message.trim();

  if (adminEmails.length > 0) {
    await sendNewGsReportAdminNotification(adminEmails, {
      targetTypeLabel: body.target_type === "listing" ? "une annonce" : "un prestataire",
      targetLabel,
      reasonLabel,
      messagePreview: preview,
      reporterLine,
      adminReportsUrl,
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, id: (inserted as { id: string }).id }, { status: 201 });
}
