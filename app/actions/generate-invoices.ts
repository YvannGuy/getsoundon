"use server";

import PDFDocument from "pdfkit";

import { siteConfig } from "@/config/site";
import { getAuthUserEmail } from "@/lib/auth-user-email";
import { sendGsInvoiceAvailableEmail } from "@/lib/email";
import { computeGsBookingPaymentSplit } from "@/lib/gs-booking-platform-fee";
import { createAdminClient } from "@/lib/supabase/admin";

type BookingRow = {
  id: string;
  provider_id: string;
  customer_id: string;
  listing_id: string | null;
  start_date: string;
  end_date: string;
  status: string;
  payout_status: string | null;
  incident_status: string | null;
  total_price: number | string | null;
  checkout_total_eur?: number | string | null;
  stripe_payment_intent_id: string | null;
};

type ListingRow = { id: string; title: string | null };
type ProfileRow = { id: string; full_name: string | null; email: string | null };

function makeInvoiceNumber(bookingId: string, date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const shortId = bookingId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `GS-${y}${m}-${shortId}`;
}

async function ensureInvoiceBucket(admin: ReturnType<typeof createAdminClient>) {
  try {
    const { data: buckets } = await admin.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === "invoices");
    if (!exists) {
      await admin.storage.createBucket("invoices", { public: false });
    }
  } catch {
    // ignore
  }
}

function renderInvoicePdf(params: {
  invoiceNumber: string;
  provider: ProfileRow | null;
  customer: ProfileRow | null;
  booking: BookingRow;
  listing: ListingRow | null;
  netAmount: number;
}) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.fontSize(16).fillColor("#111").text("Facture", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#555").text(`Facture n° ${params.invoiceNumber}`);
  doc.text(`Émise le ${new Date().toLocaleDateString("fr-FR")}`);
  doc.moveDown(1);

  doc.fontSize(12).fillColor("#111").text("Prestataire", { underline: true });
  doc.fontSize(10).fillColor("#333").text(params.provider?.full_name ?? "Prestataire");
  if (params.provider?.email) doc.text(params.provider.email);
  doc.moveDown(0.8);

  doc.fontSize(12).fillColor("#111").text("Client", { underline: true });
  doc.fontSize(10).fillColor("#333").text(params.customer?.full_name ?? "Client");
  if (params.customer?.email) doc.text(params.customer.email);
  doc.moveDown(0.8);

  doc.fontSize(12).fillColor("#111").text("Réservation", { underline: true });
  doc.fontSize(10).fillColor("#333");
  doc.text(`Référence : ${params.booking.id}`);
  doc.text(
    `Période : ${new Date(params.booking.start_date).toLocaleDateString("fr-FR")} → ${new Date(
      params.booking.end_date
    ).toLocaleDateString("fr-FR")}`
  );
  doc.text(`Matériel : ${params.listing?.title ?? "Annonce"}`);
  doc.text("Caution : empreinte bancaire éventuelle (non débitée sauf incident).");
  doc.moveDown(1);

  doc.fontSize(12).fillColor("#111").text("Détail", { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#333");
  doc.text(`Montant net prestataire : ${params.netAmount.toFixed(2)} €`);
  doc.text("Frais de service et commissions déjà déduits le cas échéant.");
  doc.text("Virement automatique après fin d'événement et délai de sécurité.");
  doc.moveDown(1.5);

  doc.fontSize(10).fillColor("#666").text(`Paiement Stripe : ${params.booking.stripe_payment_intent_id ?? "-"}`);
  doc.text(`Site : ${siteConfig.url}`, { link: siteConfig.url, underline: false });

  doc.end();
  return doc;
}

export async function generateInvoicesForCompletedBookings() {
  const admin = createAdminClient();

  // 1) Éligibles
  const { data: eligible } = await admin
    .from("gs_bookings")
    .select(
      "id, provider_id, customer_id, listing_id, start_date, end_date, status, payout_status, incident_status, total_price, checkout_total_eur, stripe_payment_intent_id"
    )
    .eq("status", "completed")
    .eq("payout_status", "paid")
    .not("stripe_payment_intent_id", "is", null)
    .neq("incident_status", "open")
    .limit(1000);

  const bookings = (eligible ?? []) as BookingRow[];
  if (bookings.length === 0) return { generated: 0, skipped: 0, scanned: 0 };

  // 2) déjà facturés ?
  const bookingIds = bookings.map((b) => b.id);
  const { data: existingInvoices } = await admin
    .from("gs_invoices")
    .select("booking_id")
    .in("booking_id", bookingIds);
  const already = new Set((existingInvoices ?? []).map((i) => i.booking_id));

  const toGenerate = bookings.filter((b) => !already.has(b.id));
  if (toGenerate.length === 0) return { generated: 0, skipped: bookings.length, scanned: bookings.length };

  // 3) fetch listings / profiles
  const listingIds = Array.from(new Set(toGenerate.map((b) => b.listing_id).filter(Boolean))) as string[];
  const providerIds = Array.from(new Set(toGenerate.map((b) => b.provider_id)));
  const customerIds = Array.from(new Set(toGenerate.map((b) => b.customer_id)));

  const [listingsRes, providersRes, customersRes] = await Promise.all([
    listingIds.length
      ? admin.from("gs_listings").select("id, title").in("id", listingIds)
      : Promise.resolve({ data: [] }),
    providerIds.length
      ? admin.from("profiles").select("id, full_name, email").in("id", providerIds)
      : Promise.resolve({ data: [] }),
    customerIds.length
      ? admin.from("profiles").select("id, full_name, email").in("id", customerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const listingMap = new Map<string, ListingRow>();
  (listingsRes.data as ListingRow[] | null)?.forEach((l) => listingMap.set(l.id, l));
  const providerMap = new Map<string, ProfileRow>();
  (providersRes.data as ProfileRow[] | null)?.forEach((p) => providerMap.set(p.id, p));
  const customerMap = new Map<string, ProfileRow>();
  (customersRes.data as ProfileRow[] | null)?.forEach((p) => customerMap.set(p.id, p));

  await ensureInvoiceBucket(admin);

  let generated = 0;
  let skipped = bookings.length - toGenerate.length;

  for (const b of toGenerate) {
    try {
      const invoiceNumber = makeInvoiceNumber(b.id, new Date());
      const net = computeGsBookingPaymentSplit(Number(b.checkout_total_eur ?? b.total_price ?? 0)).providerNetEur;
      const doc = renderInvoicePdf({
        invoiceNumber,
        provider: providerMap.get(b.provider_id) ?? null,
        customer: customerMap.get(b.customer_id) ?? null,
        booking: b,
        listing: b.listing_id ? listingMap.get(b.listing_id) ?? null : null,
        netAmount: net,
      });

      // Collect PDF in buffer
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        doc.on("data", (d) => chunks.push(d as Buffer));
        doc.on("end", () => resolve());
        doc.on("error", reject);
      });
      const pdfBuffer = Buffer.concat(chunks);

      const path = `${b.provider_id}/${invoiceNumber}.pdf`;
      const { error: uploadError } = await admin.storage.from("invoices").upload(path, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { error: insertError } = await admin.from("gs_invoices").insert({
        booking_id: b.id,
        provider_id: b.provider_id,
        customer_id: b.customer_id,
        invoice_number: invoiceNumber,
        invoice_url: path,
        invoice_total_eur: net,
        currency: "EUR",
      });
      if (insertError) throw insertError;

      const siteBase = siteConfig.url.replace(/\/$/, "");
      const listingTitle = b.listing_id ? listingMap.get(b.listing_id)?.title?.trim() : undefined;
      const providerTo = await getAuthUserEmail(admin, b.provider_id);
      if (providerTo) {
        await sendGsInvoiceAvailableEmail(providerTo, {
          invoiceNumber,
          role: "provider",
          dashboardUrl: `${siteBase}/proprietaire/contrat`,
          listingTitle: listingTitle || undefined,
        }).catch(() => null);
      }
      const customerTo = await getAuthUserEmail(admin, b.customer_id);
      if (customerTo) {
        await sendGsInvoiceAvailableEmail(customerTo, {
          invoiceNumber,
          role: "customer",
          dashboardUrl: `${siteBase}/dashboard/materiel/${b.id}`,
          listingTitle: listingTitle || undefined,
        }).catch(() => null);
      }

      generated += 1;
    } catch (err) {
      console.error("[generateInvoices] failed for booking", b.id, err);
      skipped += 1;
    }
  }

  return { generated, skipped, scanned: bookings.length };
}
