import { PDFDocument, StandardFonts } from "pdf-lib";

export type ContractData = {
  offerId: string;
  amountEur: string;
  dateDebut: string | null;
  dateFin: string | null;
  eventType: string | null;
  salleName: string;
  salleCity: string;
  ownerName: string;
  ownerEmail: string;
  seekerName: string;
  seekerEmail: string;
  paidAt: string;
  template?: {
    raisonSociale?: string | null;
    adresse?: string | null;
    codePostal?: string | null;
    ville?: string | null;
    siret?: string | null;
    conditionsParticulieres?: string | null;
  };
  /** Détail figé (offre matériel / pack), une ligne = un drawText. */
  snapshotLines?: string[];
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  ponctuel: "Ponctuel",
  mensuel: "Mensuel",
};

export async function generateContractPdf(data: ContractData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  let y = 792;

  const drawText = (
    text: string,
    options: { size?: number; bold?: boolean; indent?: number } = {}
  ) => {
    const size = options.size ?? 11;
    const f = options.bold ? fontBold : font;
    const x = margin + (options.indent ?? 0);
    page.drawText(text, { x, y, size, font: f });
    y -= size + 4;
  };

  const drawLine = () => {
    y -= 8;
  };

  drawText(
    data.snapshotLines?.length ? "CONTRAT DE LOCATION (MATÉRIEL / PACK)" : "CONTRAT DE LOCATION DE MATÉRIEL",
    { size: 16, bold: true }
  );
  drawLine();

  drawText(`N° de réservation : ${data.offerId}`);
  drawText(`Date du contrat : ${data.paidAt}`);
  drawLine();

  drawText("ENTRE LES PARTIES :", { bold: true });
  const prestataireText = data.template?.raisonSociale
    ? `${data.template.raisonSociale}${
        data.template.codePostal && data.template.ville
          ? `, ${data.template.codePostal} ${data.template.ville}`
          : data.template.ville
            ? `, ${data.template.ville}`
            : ""
      }${data.template?.siret ? `, SIRET ${data.template.siret}` : ""}`
    : `${data.ownerName} (${data.ownerEmail})`;
  drawText(`Prestataire : ${prestataireText}`, { indent: 10 });
  drawText(`Client : ${data.seekerName} (${data.seekerEmail})`, { indent: 10 });
  drawLine();

  drawText("OBJET :", { bold: true });
  const eventLabel = data.eventType ? EVENT_TYPE_LABEL[data.eventType] ?? data.eventType : "cultuel";
  if (data.snapshotLines?.length) {
    drawText(`Location du matériel / pack « ${data.salleName} » (annonce — ${data.salleCity}).`);
    drawText(`Usage : événement ${eventLabel}.`, { indent: 10 });
  } else {
    drawText(`Location du matériel « ${data.salleName} » — ${data.salleCity}.`);
    drawText(`Usage : événement ${eventLabel}.`, { indent: 10 });
  }
  drawLine();

  drawText("PÉRIODE :", { bold: true });
  if (data.dateDebut && data.dateFin) {
    drawText(`Du ${data.dateDebut} au ${data.dateFin}`, { indent: 10 });
  } else {
    drawText("Période convenue dans l'offre acceptée.", { indent: 10 });
  }
  drawLine();

  drawText("MONTANT :", { bold: true });
  drawText(`${data.amountEur} € (TTC)`, { indent: 10 });
  drawText("Paiement effectué via la plateforme GetSoundOn.", { indent: 10 });
  drawLine();

  drawText("CONDITIONS :", { bold: true });
  drawText(
    data.snapshotLines?.length
      ? "• Le client s'engage à utiliser le matériel conformément à l'usage prévu et à le restituer en bon état."
      : "• Le client s'engage à utiliser le matériel conformément à l'usage prévu et à le restituer en bon état.",
    { indent: 10 }
  );
  drawText(
    data.snapshotLines?.length
      ? "• Le prestataire s'engage à mettre le matériel / pack à disposition aux dates convenues."
      : "• Le prestataire s'engage à mettre le matériel à disposition aux dates convenues.",
    { indent: 10 }
  );
  drawText(
    "• En cas de litige, les parties conviennent de rechercher une solution amiable avant toute action judiciaire.",
    { indent: 10 }
  );
  if (data.template?.conditionsParticulieres) {
    drawText("Conditions particulières :", { indent: 10 });
    for (const line of data.template.conditionsParticulieres.split("\n")) {
      if (line.trim()) drawText(line.trim(), { indent: 20 });
    }
  }
  drawLine();

  drawText("Le présent contrat est établi électroniquement suite au paiement de la réservation sur la plateforme GetSoundOn.");
  drawText(
    "Chaque partie reconnaît avoir pris connaissance des conditions et les accepter."
  );

  if (data.snapshotLines?.length) {
    const annex = pdfDoc.addPage([595, 842]);
    let ay = 792;
    const drawAnnex = (
      text: string,
      options: { size?: number; bold?: boolean; indent?: number } = {}
    ) => {
      const size = options.size ?? 10;
      const f = options.bold ? fontBold : font;
      const x = margin + (options.indent ?? 0);
      annex.drawText(text, { x, y: ay, size, font: f });
      ay -= size + 3;
    };
    drawAnnex("ANNEXE - DÉTAIL FIGÉ AU MOMENT DE LA RÉSERVATION", { size: 12, bold: true });
    ay -= 4;
    for (const line of data.snapshotLines) {
      if (ay < 72) break;
      drawAnnex(line, { indent: 10 });
    }
  }

  return pdfDoc.save();
}
