import { readFile } from "fs/promises";
import { join } from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type InvoiceData = {
  paymentId: string;
  amountEur: string;
  paidAt: string;
  productType: string;
  seekerName: string;
  seekerEmail: string;
  ownerName: string;
  salleName: string;
  salleCity: string;
  /** Détail figé (offre matériel / pack), affiché sous la prestation. */
  snapshotLines?: string[];
};

const PRODUCT_LABEL: Record<string, string> = {
  reservation: "Réservation de salle",
  pass_24h: "Pass 24h",
  pass_48h: "Pass 48h",
  abonnement: "Abonnement mensuel",
};

const BRAND_BLUE = rgb(33 / 255, 51 / 255, 152 / 255);
const SLATE_600 = rgb(71 / 255, 85 / 255, 105 / 255);
const SLATE_300 = rgb(203 / 255, 213 / 255, 225 / 255);

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const width = page.getWidth();
  const contentWidth = width - 2 * margin;

  let y = 792;

  // En-tete : logo + GetSoundOn a gauche, FACTURE a droite
  const logoH = 38;
  const logoGap = 14;
  let logoRight = margin;

  try {
    const logoPath = join(process.cwd(), "public", "images", "logosound.png");
    const logoBytes = await readFile(logoPath);
    const logo = await pdfDoc.embedPng(logoBytes);
    const logoW = logo.scale(logoH / logo.height).width;
    page.drawImage(logo, {
      x: margin,
      y: y - logoH,
      width: logoW,
      height: logoH,
    });
    logoRight = margin + logoW + logoGap;
  } catch {
    // Logo absent : on garde de la place pour le texte
  }

  page.drawText("GetSoundOn", {
    x: logoRight,
    y: y - 26,
    size: 18,
    font: fontBold,
    color: BRAND_BLUE,
  });

  page.drawText("FACTURE", {
    x: width - margin - 100,
    y: y - 24,
    size: 24,
    font: fontBold,
    color: BRAND_BLUE,
  });
  y -= 52;

  // Ligne de séparation bleue
  page.drawRectangle({
    x: margin,
    y: y,
    width: contentWidth,
    height: 3,
    color: BRAND_BLUE,
  });
  y -= 24;

  // Bloc Référence
  page.drawText("Référence", { x: margin, y, size: 10, font: fontBold, color: SLATE_600 });
  y -= 14;
  page.drawText(`N° paiement : ${data.paymentId}`, { x: margin, y, size: 10, font, color: SLATE_600 });
  y -= 14;
  page.drawText(`Date : ${data.paidAt}`, { x: margin, y, size: 10, font, color: SLATE_600 });
  const typeLabel =
    data.snapshotLines?.length && data.productType === "reservation"
      ? "Location matériel / pack"
      : PRODUCT_LABEL[data.productType] ?? data.productType;
  page.drawText(`Type : ${typeLabel}`, { x: margin + 140, y, size: 10, font, color: SLATE_600 });
  y -= 28;

  // Deux colonnes alignées : Client | Prestation (même hauteur de départ)
  const colWidth = (contentWidth - 32) / 2;
  const col2X = margin + colWidth + 32;

  const blockY = y;
  page.drawText("Client (payeur)", { x: margin, y: blockY, size: 11, font: fontBold });
  page.drawText("Prestation", { x: col2X, y: blockY, size: 11, font: fontBold });
  y -= 16;

  page.drawText(`${data.seekerName}`, { x: margin, y, size: 11, font });
  page.drawText(`${data.salleName} — ${data.salleCity}`, { x: col2X, y, size: 11, font });
  y -= 14;

  page.drawText(data.seekerEmail, { x: margin, y, size: 10, font, color: SLATE_600 });
  page.drawText(`Fournisseur : ${data.ownerName}`, { x: col2X, y, size: 10, font, color: SLATE_600 });
  y -= 36;

  if (data.snapshotLines?.length) {
    page.drawText("Détail figé (offre)", { x: col2X, y, size: 9, font: fontBold, color: SLATE_600 });
    y -= 12;
    for (const line of data.snapshotLines) {
      if (y < 200) break;
      page.drawText(line, { x: col2X, y, size: 8, font, color: SLATE_600 });
      y -= 10;
    }
    y -= 12;
  }

  // Bloc Montant TTC (fond gris clair)
  const amountBoxY = y - 20;
  page.drawRectangle({
    x: margin,
    y: amountBoxY - 36,
    width: contentWidth,
    height: 48,
    color: rgb(248 / 255, 250 / 255, 252 / 255),
    borderColor: SLATE_300,
    borderWidth: 1,
  });
  page.drawText("Montant TTC", { x: margin + 16, y: amountBoxY - 18, size: 11, font: fontBold });
  page.drawText(`${data.amountEur} €`, {
    x: width - margin - 90,
    y: amountBoxY - 22,
    size: 22,
    font: fontBold,
    color: BRAND_BLUE,
  });
  y -= 72;

  // Mentions légales
  page.drawText("Paiement securise via Stripe - Plateforme GetSoundOn", {
    x: margin,
    y,
    size: 9,
    font,
    color: SLATE_600,
  });
  y -= 14;
  page.drawText("Ce document constitue une facture et une preuve de paiement.", {
    x: margin,
    y,
    size: 9,
    font,
    color: SLATE_600,
  });
  y -= 28;

  // Footer
  page.drawText("getsoundon.com", {
    x: margin,
    y: 50,
    size: 9,
    font,
    color: SLATE_300,
  });

  return pdfDoc.save();
}
