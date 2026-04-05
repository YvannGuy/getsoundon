import { Resend } from "resend";

import { siteConfig } from "@/config/site";

const resendApiKey = process.env.RESEND_API_KEY;
const resend: Pick<Resend, "emails"> = resendApiKey
  ? new Resend(resendApiKey)
  : ({
      emails: {
        send: async () => {
          console.warn("[email] RESEND_API_KEY absente, email non envoye.");
          return { error: null };
        },
      },
    } as unknown as Pick<Resend, "emails">);
const from =
  process.env.RESEND_FROM_EMAIL ?? "GetSoundOn <onboarding@resend.dev>";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getsoundon.com";
const instagramUrl = "https://instagram.com/getsoundon";
const facebookUrl = "https://facebook.com/getsoundon";
const demoVideoUrl = "https://youtu.be/demo-getsoundon";
const seekerWelcomeVideoUrl = "https://vimeo.com/1169991938";
const seekerWelcomeGuideUrl = `${siteUrl}/pdf/welcome-guide.pdf`;
const ownerWelcomeVideoUrl = "https://vimeo.com/1170020143";

function renderEmailLayout({
  title,
  intro,
  sections,
  ctaLabel,
  ctaUrl,
  ctaTitle = "Commencez maintenant",
  ctaText = "Accedez a votre espace pour continuer sur GetSoundOn.",
  includeDemoCta = false,
}: {
  title: string;
  intro?: string;
  sections: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  ctaTitle?: string;
  ctaText?: string;
  includeDemoCta?: boolean;
}) {
  const logoUrl = `${siteUrl}/images/logosound.png`;
  const ctaBlock = ctaLabel && ctaUrl
    ? `<div class="cta-block">
         <h3>${ctaTitle}</h3>
         <p>${ctaText}</p>
         <p><a href="${ctaUrl}" class="btn">${ctaLabel}</a></p>
         ${
           includeDemoCta
             ? `<p class="cta-secondary">Ou regardez la démo : <a href="${demoVideoUrl}">Voir la vidéo</a></p>`
             : ""
         }
       </div>`
    : "";
  const cta = ctaLabel && ctaUrl
    ? ctaBlock
    : "";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
body{font-family:system-ui,sans-serif;line-height:1.65;color:#334155;margin:0;padding:22px;font-size:15px;background:#f8fafc;}
h1{color:#0f172a;font-size:24px;font-weight:700;margin:0 0 18px;}
h2{color:#E86F1C;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:26px 0 12px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;}
a{color:#E86F1C;text-decoration:none;}
a:hover{text-decoration:underline;}
.email-card{max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;}
.header{padding:20px 24px;border-bottom:1px solid #e2e8f0;background:linear-gradient(180deg,#ffffff 0%,#F8F4F1 100%);}
.logo{display:inline-flex;align-items:center;gap:10px;color:#0f172a;font-weight:700;font-size:16px;}
.logo img{height:40px;width:auto;display:block;}
.content{padding:24px;}
.btn{display:inline-block;background:#E86F1C;color:#fff!important;padding:12px 24px;border-radius:8px;margin:14px 0 6px;font-weight:600;}
p{margin:0 0 12px;}
ul{margin:12px 0;padding-left:20px;}
li{margin:6px 0;}
.tip{margin:12px 0;padding:12px;background:#f8fafc;border-left:3px solid #E86F1C;font-size:14px;}
.cta-block{margin-top:22px;padding:16px;border:1px solid #fde8d9;background:#F8F4F1;border-radius:12px;}
.cta-block h3{margin:0 0 8px;color:#0f172a;font-size:16px;}
.cta-block p{margin:0 0 8px;}
.cta-secondary{font-size:13px;color:#64748b;}
.signature{margin-top:30px;color:#64748b;font-size:14px;}
.footer{margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;}
</style>
</head>
<body>
  <div class="email-card">
    <div class="header">
      <div class="logo">
        <img src="${logoUrl}" alt="GetSoundOn" />
        <span>GetSoundOn</span>
      </div>
    </div>
    <div class="content">
      <h1>${title}</h1>
      ${intro ? `<p>${intro}</p>` : ""}
      ${sections.join("")}
      ${cta}
      <div class="footer">
        <p>Nos réseaux sociaux pour ne rien manquer :</p>
        <p><a href="${instagramUrl}">Instagram</a> · <a href="${facebookUrl}">Facebook</a></p>
        <p>Contact support : <a href="mailto:${siteConfig.supportEmail}">${siteConfig.supportEmail}</a></p>
      </div>
      <p class="signature">A tres bientot,<br>L'equipe GetSoundOn</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendWelcomeSeekerEmail(to: string, fullName: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, email non envoyé");
    return { success: false };
  }
  const firstName = fullName?.trim() ? escapeHtml(fullName.trim()) : "et bienvenue";
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Bienvenue sur GetSoundOn",
    html: renderEmailLayout({
      title: `Bienvenue ${firstName} sur GetSoundOn`,
      intro:
        "Vous venez de rejoindre une plateforme dédiée à la <strong>location de matériel événementiel</strong> (sono, DJ, lumière, services) entre <strong>clients</strong> et <strong>prestataires</strong> vérifiés.",
      sections: [
        `<h2>Un parcours simple et encadré</h2>
         <p>Notre objectif : vous aider à trouver le bon matériel, échanger clairement avec le prestataire, sécuriser la <strong>demande</strong>, la <strong>réservation</strong> et le <strong>paiement</strong> lorsque le flux en ligne est proposé sur l’annonce.</p>`,
        `<h2>Ce que vous pouvez faire</h2>
         <ul>
           <li>Parcourir le <a href="${siteUrl}/catalogue">catalogue matériel</a></li>
           <li>Réserver et payer en ligne lorsque l’annonce le propose (paiement sécurisé)</li>
           <li>Échanger avec le prestataire depuis <strong>Mes réservations matériel</strong> (tableau de bord)</li>
           <li>Suivre vos réservations, cautions (empreinte le cas échéant) et demandes d’annulation depuis votre espace</li>
         </ul>`,
        `<h2>Astuce pour bien démarrer</h2>
         <p>Indiquez vos dates, votre zone et le type de matériel recherché : les prestataires pourront vous répondre plus vite. Vérifiez sur chaque annonce les conditions d’<strong>annulation</strong> et de <strong>caution</strong> avant de valider.</p>`,
        `<h2>Bien débuter</h2>
         <p>Pour vous lancer rapidement :</p>
         <ul>
           <li><a href="${seekerWelcomeVideoUrl}">Voir la vidéo de présentation (Vimeo)</a></li>
           <li><a href="${seekerWelcomeGuideUrl}">Télécharger le guide PDF “Bien débuter”</a></li>
         </ul>`,
      ],
      ctaLabel: "Accéder à mon espace",
      ctaUrl: `${siteUrl}/dashboard`,
    }),
  });
  return { success: !error, error: error?.message };
}

export async function sendWelcomeOwnerEmail(to: string, _fullName: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, email non envoyé");
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Bienvenue sur GetSoundOn",
    html: renderEmailLayout({
      title: "Bienvenue sur GetSoundOn",
      intro:
        "Merci d’avoir rejoint GetSoundOn en tant que <strong>prestataire</strong>. Vous proposez du <strong>matériel</strong> en location et gérez vos <strong>annonces</strong> et vos <strong>réservations catalogue</strong> depuis un espace dédié.",
      sections: [
        `<h2>Un outil pensé pour les prestataires</h2>
         <p>Publiez vos <strong>annonces</strong> (photos, tarifs, zone, options), gérez les <strong>réservations catalogue</strong> et, lorsque Stripe Connect est activé, encaissez les <strong>paiements</strong> associés.</p>`,
        `<h2>Ce que vous pouvez faire dès maintenant</h2>
         <ul>
           <li>Créer ou compléter une <strong>annonce</strong> matériel</li>
           <li>Suivre les <strong>réservations matériel</strong> et les échanges associés</li>
           <li>Configurer caution (<strong>empreinte</strong>) et politique d’<strong>annulation</strong> sur l’annonce</li>
           <li>Suivre les <strong>paiements</strong> et les <strong>incidents</strong> matériel le cas échéant</li>
         </ul>`,
        `<h2>Conseil pour bien démarrer</h2>
         <p>Des photos nettes, une description précise (état du matériel, accessoires, retrait / livraison) et des tarifs clairs attirent des demandes plus qualifiées.</p>`,
        `<h2>Vidéo de prise en main</h2>
         <p>Découvrez les principales fonctionnalités côté prestataire :</p>
         <p><a href="${ownerWelcomeVideoUrl}">${ownerWelcomeVideoUrl}</a></p>`,
      ],
      ctaLabel: "Créer ou gérer mes annonces",
      ctaUrl: `${siteUrl}/proprietaire/ajouter-annonce`,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Notif admin — nouvelle annonce catalogue (onboarding / flux matériel), en attente de validation. */
export async function sendNewCatalogListingPendingAdminNotification(
  adminEmails: string[],
  listingTitle: string,
  locationLabel: string,
  adminDashboardUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, notification annonce catalogue (à valider) non envoyée");
    return { success: false };
  }
  if (adminEmails.length === 0) {
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to: adminEmails,
    subject: `[GetSoundOn] Nouvelle annonce à valider : ${listingTitle}`,
    html: renderEmailLayout({
      title: "Nouvelle annonce catalogue à valider",
      intro:
        "Une annonce matériel a été soumise depuis l’espace prestataire (sync catalogue). Traitez-la depuis l’administration.",
      sections: [
        `<p><strong>${escapeHtml(listingTitle)}</strong> — ${escapeHtml(locationLabel)}</p>`,
      ],
      ctaLabel: "Ouvrir l’administration",
      ctaUrl: adminDashboardUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Notif admin — annonce catalogue publiée (auto). */
export async function sendNewCatalogListingPublishedAdminNotification(
  adminEmails: string[],
  listingTitle: string,
  locationLabel: string,
  adminDashboardUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, notification annonce catalogue (publiée) non envoyée");
    return { success: false };
  }
  if (adminEmails.length === 0) {
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to: adminEmails,
    subject: `[GetSoundOn] Nouvelle annonce publiée : ${listingTitle}`,
    html: renderEmailLayout({
      title: "Nouvelle annonce catalogue publiée",
      intro: "Une annonce matériel a été publiée automatiquement (mode publication auto).",
      sections: [
        `<p><strong>${escapeHtml(listingTitle)}</strong> — ${escapeHtml(locationLabel)}</p>`,
      ],
      ctaLabel: "Ouvrir l’administration",
      ctaUrl: adminDashboardUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Notif admin — nouveau signalement (annonce ou prestataire). */
export async function sendNewGsReportAdminNotification(
  adminEmails: string[],
  params: {
    targetTypeLabel: string;
    targetLabel: string;
    reasonLabel: string;
    messagePreview: string;
    reporterLine: string;
    adminReportsUrl: string;
  }
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, notification signalement non envoyée");
    return { success: false };
  }
  if (adminEmails.length === 0) {
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to: adminEmails,
    subject: `[GetSoundOn] Nouveau signalement — ${params.targetTypeLabel}`,
    html: renderEmailLayout({
      title: "Nouveau signalement",
      intro: `Un utilisateur a signalé <strong>${escapeHtml(params.targetTypeLabel)}</strong> : <strong>${escapeHtml(params.targetLabel)}</strong>.`,
      sections: [
        `<p><strong>Motif :</strong> ${escapeHtml(params.reasonLabel)}</p>`,
        `<p><strong>Message :</strong><br/>${escapeHtml(params.messagePreview)}</p>`,
        `<p><strong>Signaleur :</strong> ${escapeHtml(params.reporterLine)}</p>`,
      ],
      ctaLabel: "Voir les signalements",
      ctaUrl: params.adminReportsUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Paiement réservation — flux matériel (`gs_bookings` / catalogue). */
export async function sendGsBookingPaymentConfirmedLocataireEmail(
  to: string,
  listingTitle: string,
  totalPaidEur: string,
  bookingUrl: string,
  cautionHtml?: string | null,
  breakdown?: { locationEur: string; serviceFeeEur: string; totalEur: string } | null
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const sections: string[] = [];
  if (breakdown) {
    sections.push(
      `<p class="tip"><strong>Location :</strong> ${escapeHtml(breakdown.locationEur)} EUR</p>`,
      `<p class="tip"><strong>Frais de service :</strong> ${escapeHtml(breakdown.serviceFeeEur)} EUR</p>`,
      `<p class="tip"><strong>Total payé :</strong> ${escapeHtml(breakdown.totalEur)} EUR</p>`,
      `<p class="tip"><small style="color:#666">Les frais de service couvrent le traitement sécurisé du paiement et le fonctionnement de la plateforme.</small></p>`
    );
  } else {
    sections.push(`<p class="tip"><strong>Montant payé :</strong> ${escapeHtml(totalPaidEur)} EUR</p>`);
  }
  if (cautionHtml) sections.push(cautionHtml);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Paiement confirmé — ${listingTitle}`,
    html: renderEmailLayout({
      title: "Votre réservation matériel est confirmée",
      intro: `Votre paiement pour la réservation concernant <strong>${escapeHtml(listingTitle)}</strong> a bien été enregistré.`,
      sections,
      ctaLabel: "Voir ma réservation",
      ctaUrl: bookingUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Paiement réservation — flux matériel (`gs_bookings`), côté prestataire. */
export async function sendGsBookingPaymentConfirmedPrestataireEmail(
  to: string,
  listingTitle: string,
  locationAmountEur: string,
  bookingUrl: string,
  cautionHtml?: string | null,
  split?: {
    platformFeeEur: string;
    providerNetEur: string;
    serviceFeePaidByCustomerEur?: string;
    checkoutTotalEur?: string;
  } | null
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const sections = [
    `<p class="tip"><strong>Montant de la réservation (votre annonce) :</strong> ${escapeHtml(locationAmountEur)} EUR</p>`,
  ];
  if (split?.serviceFeePaidByCustomerEur && split?.checkoutTotalEur) {
    sections.push(
      `<p class="tip"><strong>Frais de service (facturés au client, hors votre rémunération) :</strong> ${escapeHtml(split.serviceFeePaidByCustomerEur)} EUR — <strong>total encaissé sur le paiement :</strong> ${escapeHtml(split.checkoutTotalEur)} EUR.</p>`
    );
  }
  if (split) {
    sections.push(
      `<p class="tip"><strong>Commission plateforme (15&nbsp;%) :</strong> ${escapeHtml(split.platformFeeEur)} EUR — <strong>votre net après commission :</strong> ${escapeHtml(split.providerNetEur)} EUR (versé sur votre compte Connect selon l’échéance J+2 après fin de location).</p>`
    );
  }
  if (cautionHtml) sections.push(cautionHtml);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Réservation payée — ${listingTitle}`,
    html: renderEmailLayout({
      title: "Une réservation vient d’être payée",
      intro: `Un client a finalisé le paiement pour votre annonce <strong>${escapeHtml(listingTitle)}</strong>.`,
      sections,
      ctaLabel: "Voir la réservation",
      ctaUrl: bookingUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Confirmation utilisateur après formulaire conciergerie (brief matériel / accompagnement catalogue). */
export async function sendConciergeConfirmationEmail(to: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, email confirmation conciergerie non envoyé");
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Demande enregistree - Conciergerie GetSoundOn",
    html: renderEmailLayout({
      title: "Votre demande a bien été enregistrée",
      intro:
        "Merci d’avoir partagé votre besoin matériel avec notre équipe. Nous avons bien reçu votre brief et nous vous recontacterons sous 24–72h avec des pistes d’annonces et de prestataires adaptés.",
      sections: [
        "<p>En attendant, vous pouvez parcourir le <a href=\"" +
          siteUrl +
          "/catalogue\">catalogue matériel</a> et lancer une demande ou une réservation directement.</p>",
      ],
      ctaLabel: "Parcourir le catalogue",
      ctaUrl: `${siteUrl}/catalogue`,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Notification à l'équipe admin pour chaque nouvelle demande conciergerie */
export async function sendConciergeRequestAdminNotification(
  adminEmails: string[],
  contactEmail: string,
  source: string,
  messagePreview: string,
  adminUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, notification admin conciergerie non envoyée");
    return { success: false };
  }
  if (adminEmails.length === 0) return { success: false };
  const safePreview = messagePreview.length > 150 ? messagePreview.slice(0, 147) + "..." : messagePreview;
  const { error } = await resend.emails.send({
    from,
    to: adminEmails,
    subject: `[Conciergerie] Nouvelle demande — ${contactEmail}`,
    html: renderEmailLayout({
      title: "Nouvelle demande conciergerie",
      intro: `Une nouvelle demande de conciergerie a été soumise (source: ${escapeHtml(source)}).`,
      sections: [
        `<p><strong>Contact:</strong> ${escapeHtml(contactEmail)}</p>`,
        `<p class="tip">${escapeHtml(safePreview)}</p>`,
      ],
      ctaLabel: "Voir les demandes",
      ctaUrl: adminUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

export async function sendSupportContactEmail(params: {
  name: string;
  email: string;
  helpType: string;
  message: string;
}) {
  if (!process.env.RESEND_API_KEY) return { success: false };

  const safeName = escapeHtml(params.name.trim() || "Utilisateur");
  const safeEmail = escapeHtml(params.email.trim());
  const safeHelpType = escapeHtml(params.helpType.trim());
  const safeMessage = escapeHtml(params.message.trim()).replace(/\n/g, "<br/>");

  const { error } = await resend.emails.send({
    from,
    to: siteConfig.supportEmail,
    replyTo: params.email.trim(),
    subject: `[Support] ${params.helpType} - ${params.name}`,
    html: renderEmailLayout({
      title: "Nouveau message depuis le Centre d'aide",
      intro: "Un utilisateur a soumis une demande d'aide depuis le formulaire public.",
      sections: [
        `<p><strong>Nom:</strong> ${safeName}</p>`,
        `<p><strong>Email:</strong> ${safeEmail}</p>`,
        `<p><strong>Type de demande:</strong> ${safeHelpType}</p>`,
        `<p><strong>Message:</strong><br/>${safeMessage}</p>`,
      ],
    }),
  });

  return { success: !error, error: error?.message };
}

export async function sendHowItWorksContactEmail(params: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  message: string;
}) {
  if (!process.env.RESEND_API_KEY) return { success: false };

  const safeFirst = escapeHtml(params.firstName.trim());
  const safeLast = escapeHtml(params.lastName.trim());
  const safePhone = escapeHtml(params.phone.trim());
  const safeEmail = escapeHtml(params.email.trim());
  const safeMessage = escapeHtml(params.message.trim()).replace(/\n/g, "<br/>");

  const { error } = await resend.emails.send({
    from,
    to: siteConfig.supportEmail,
    replyTo: params.email.trim(),
    subject: `[Comment ça marche] ${params.firstName.trim()} ${params.lastName.trim()}`,
    html: renderEmailLayout({
      title: "Message depuis la page Comment ça marche",
      intro: "Un utilisateur a envoyé un message via le formulaire de contact.",
      sections: [
        `<p><strong>Prénom:</strong> ${safeFirst}</p>`,
        `<p><strong>Nom:</strong> ${safeLast}</p>`,
        `<p><strong>Téléphone:</strong> ${safePhone}</p>`,
        `<p><strong>Email:</strong> ${safeEmail}</p>`,
        `<p><strong>Message:</strong><br/>${safeMessage}</p>`,
      ],
    }),
  });

  return { success: !error, error: error?.message };
}

export async function sendPrelaunchWaitlistEmail(params: {
  firstName: string;
  email: string;
  profile: "organisateur" | "prestataire" | "autre";
  city?: string;
}) {
  if (!process.env.RESEND_API_KEY) return { success: false };

  const safeFirst = escapeHtml(params.firstName.trim());
  const safeEmail = escapeHtml(params.email.trim());
  const profileLabel =
    params.profile === "organisateur"
      ? "Client (organisateur d’événements / chercheur de matériel)"
      : params.profile === "prestataire"
        ? "Prestataire"
        : "Autre";
  const safeProfile = escapeHtml(profileLabel);
  const safeCity = params.city?.trim() ? escapeHtml(params.city.trim()) : "—";

  const { error } = await resend.emails.send({
    from,
    to: siteConfig.supportEmail,
    replyTo: params.email.trim(),
    subject: `[Waitlist pré-lancement] ${params.firstName.trim()}`,
    html: renderEmailLayout({
      title: "Inscription liste d’attente (pré-lancement)",
      intro: "Une personne souhaite être informée du lancement public.",
      sections: [
        `<p><strong>Prénom :</strong> ${safeFirst}</p>`,
        `<p><strong>Email :</strong> ${safeEmail}</p>`,
        `<p><strong>Profil :</strong> ${safeProfile}</p>`,
        `<p><strong>Ville :</strong> ${safeCity}</p>`,
      ],
    }),
  });

  return { success: !error, error: error?.message };
}

// ── Notifications P0 réservations / commandes (catalogue matériel) ─────────

/** Prestataire : nouvelle demande ou réservation initiée (avant ou hors paiement immédiat). */
export async function sendGsBookingNewDemandProviderEmail(
  to: string,
  params: {
    listingTitle: string;
    startDate: string;
    endDate: string;
    statusLabel: "pending" | "awaiting_payment";
    bookingUrl: string;
  }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const intro =
    params.statusLabel === "awaiting_payment"
      ? `Un client a démarré une réservation avec confirmation immédiate sur <strong>${escapeHtml(params.listingTitle)}</strong> : le paiement est en cours ou à finaliser.`
      : `Vous avez une nouvelle demande de réservation pour <strong>${escapeHtml(params.listingTitle)}</strong>.`;
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Nouvelle demande — ${params.listingTitle}`,
    html: renderEmailLayout({
      title: "Nouvelle activité sur votre annonce",
      intro,
      sections: [
        `<p class="tip"><strong>Période :</strong> ${escapeHtml(params.startDate)} → ${escapeHtml(params.endDate)}</p>`,
      ],
      ctaLabel: "Voir la réservation",
      ctaUrl: params.bookingUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Client : prestataire a accepté la demande (paiement à faire). */
export async function sendGsBookingAcceptedCustomerEmail(
  to: string,
  listingTitle: string,
  bookingUrl: string
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Demande acceptée — ${listingTitle}`,
    html: renderEmailLayout({
      title: "Votre demande a été acceptée",
      intro: `Le prestataire a accepté votre demande pour <strong>${escapeHtml(listingTitle)}</strong>. Vous pouvez procéder au paiement sur GetSoundOn lorsque le parcours le propose.`,
      sections: [],
      ctaLabel: "Voir ma réservation",
      ctaUrl: bookingUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Client : prestataire a refusé. */
export async function sendGsBookingRefusedCustomerEmail(
  to: string,
  listingTitle: string,
  bookingUrl: string
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Demande non acceptée — ${listingTitle}`,
    html: renderEmailLayout({
      title: "Votre demande n’a pas été acceptée",
      intro: `Le prestataire n’a pas pu accepter votre demande pour <strong>${escapeHtml(listingTitle)}</strong>. Vous pouvez explorer d’autres annonces sur le catalogue.`,
      sections: [],
      ctaLabel: "Voir le détail",
      ctaUrl: bookingUrl,
      ctaText: "Consultez le fil de la réservation ou parcourez le catalogue.",
    }),
  });
  return { success: !error, error: error?.message };
}

/** Nouveau message sur le fil d’une réservation. */
export async function sendGsBookingThreadMessageEmail(
  to: string,
  params: { listingTitle: string; preview: string; bookingUrl: string }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const safePreview =
    params.preview.length > 400 ? params.preview.slice(0, 397) + "…" : params.preview;
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Nouveau message — ${params.listingTitle}`,
    html: renderEmailLayout({
      title: "Nouveau message sur votre réservation",
      intro: `Concernant <strong>${escapeHtml(params.listingTitle)}</strong> :`,
      sections: [`<p class="tip">${escapeHtml(safePreview).replace(/\n/g, "<br/>")}</p>`],
      ctaLabel: "Ouvrir la conversation",
      ctaUrl: params.bookingUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Prestataire : le client a demandé une annulation (admin va traiter). */
export async function sendGsBookingCancellationRequestedProviderEmail(
  to: string,
  params: { listingTitle: string; bookingUrl: string; reasonPreview: string }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const prev =
    params.reasonPreview.length > 300 ? params.reasonPreview.slice(0, 297) + "…" : params.reasonPreview;
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Demande d’annulation — ${params.listingTitle}`,
    html: renderEmailLayout({
      title: "Demande d’annulation côté client",
      intro: `Une demande d’annulation a été déposée pour <strong>${escapeHtml(params.listingTitle)}</strong>. L’équipe GetSoundOn ou le processus interne va statuer.`,
      sections: [`<p class="tip"><strong>Motif (extrait) :</strong><br/>${escapeHtml(prev).replace(/\n/g, "<br/>")}</p>`],
      ctaLabel: "Voir la réservation",
      ctaUrl: params.bookingUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Client : accusé réception de sa demande d’annulation. */
export async function sendGsBookingCancellationRequestedCustomerEmail(
  to: string,
  params: { listingTitle: string; bookingUrl: string }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Demande d’annulation enregistrée — ${params.listingTitle}`,
    html: renderEmailLayout({
      title: "Votre demande d’annulation a bien été enregistrée",
      intro: `Nous avons bien reçu votre demande pour <strong>${escapeHtml(params.listingTitle)}</strong>. Vous serez informé par email lorsque la décision sera prise.`,
      sections: [],
      ctaLabel: "Voir ma réservation",
      ctaUrl: params.bookingUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

export type GsCancellationDecisionKind =
  | "reject"
  | "approve_no_refund"
  | "approve_full"
  | "approve_partial";

/** Client / prestataire : décision admin sur une demande d’annulation. */
export async function sendGsBookingCancellationDecisionEmail(
  to: string,
  params: {
    listingTitle: string;
    bookingUrl: string;
    role: "customer" | "provider";
    decision: GsCancellationDecisionKind;
    refundEur: number | null;
  }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { decision, refundEur, role } = params;
  let title = "Mise à jour concernant une annulation";
  let intro = "";

  if (decision === "reject") {
    title = "Demande d’annulation refusée";
    intro =
      role === "customer"
        ? `Votre demande d’annulation pour <strong>${escapeHtml(params.listingTitle)}</strong> n’a pas été acceptée. La réservation reste en l’état prévu.`
        : `La demande d’annulation du client pour <strong>${escapeHtml(params.listingTitle)}</strong> a été refusée par l’administration.`;
  } else if (decision === "approve_no_refund") {
    title = "Réservation annulée";
    intro =
      role === "customer"
        ? `La réservation <strong>${escapeHtml(params.listingTitle)}</strong> a été annulée conformément à la décision d’administration (aucun remboursement du montant principal).`
        : `La réservation <strong>${escapeHtml(params.listingTitle)}</strong> a été annulée par l’administration (sans remboursement client sur le montant principal).`;
  } else if (decision === "approve_full") {
    title = "Réservation annulée — remboursement";
    intro =
      role === "customer"
        ? `La réservation <strong>${escapeHtml(params.listingTitle)}</strong> a été annulée. Un remboursement du montant payé est en cours ou effectué selon votre banque.`
        : `La réservation <strong>${escapeHtml(params.listingTitle)}</strong> a été annulée ; un remboursement client a été déclenché.`;
  } else {
    title = "Réservation annulée — remboursement partiel";
    const amt = refundEur != null ? `${refundEur.toFixed(2)} €` : "un montant partiel";
    intro =
      role === "customer"
        ? `La réservation <strong>${escapeHtml(params.listingTitle)}</strong> a été annulée. Un remboursement de <strong>${escapeHtml(amt)}</strong> a été traité selon les règles appliquées.`
        : `La réservation <strong>${escapeHtml(params.listingTitle)}</strong> a été annulée avec un remboursement partiel client.`;
  }

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `${title} — ${params.listingTitle}`,
    html: renderEmailLayout({
      title,
      intro,
      sections: [],
      ctaLabel: "Voir la réservation",
      ctaUrl: params.bookingUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Client : commande panier payée (`gs_orders`). */
export async function sendGsOrderPaymentConfirmedCustomerEmail(
  to: string,
  params: {
    totalPaidEur: string;
    orderUrl: string;
    cautionHtml?: string | null;
    breakdown?: { locationEur: string; serviceFeeEur: string; totalEur: string } | null;
  }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const sections: string[] = [];
  if (params.breakdown) {
    sections.push(
      `<p class="tip"><strong>Location (panier) :</strong> ${escapeHtml(params.breakdown.locationEur)} EUR</p>`,
      `<p class="tip"><strong>Frais de service :</strong> ${escapeHtml(params.breakdown.serviceFeeEur)} EUR</p>`,
      `<p class="tip"><strong>Total payé :</strong> ${escapeHtml(params.breakdown.totalEur)} EUR</p>`
    );
  } else {
    sections.push(`<p class="tip"><strong>Montant payé :</strong> ${escapeHtml(params.totalPaidEur)} EUR</p>`);
  }
  if (params.cautionHtml) sections.push(params.cautionHtml);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Paiement confirmé — votre commande matériel",
    html: renderEmailLayout({
      title: "Votre commande est confirmée",
      intro: "Le paiement de votre commande catalogue (panier) a bien été enregistré.",
      sections,
      ctaLabel: "Voir ma commande",
      ctaUrl: params.orderUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Prestataire : commande panier payée. */
export async function sendGsOrderPaymentConfirmedProviderEmail(
  to: string,
  params: {
    locationAmountEur: string;
    orderUrl: string;
    cautionHtml?: string | null;
    split?: {
      platformFeeEur: string;
      providerNetEur: string;
      serviceFeePaidByCustomerEur?: string;
      checkoutTotalEur?: string;
    } | null;
  }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const sections = [
    `<p class="tip"><strong>Montant location (votre part annonce / panier) :</strong> ${escapeHtml(params.locationAmountEur)} EUR</p>`,
  ];
  if (params.split?.serviceFeePaidByCustomerEur && params.split?.checkoutTotalEur) {
    sections.push(
      `<p class="tip"><strong>Frais de service (client) :</strong> ${escapeHtml(params.split.serviceFeePaidByCustomerEur)} EUR — <strong>total encaissé :</strong> ${escapeHtml(params.split.checkoutTotalEur)} EUR.</p>`
    );
  }
  if (params.split) {
    sections.push(
      `<p class="tip"><strong>Commission plateforme (15&nbsp;%) :</strong> ${escapeHtml(params.split.platformFeeEur)} EUR — <strong>votre net :</strong> ${escapeHtml(params.split.providerNetEur)} EUR.</p>`
    );
  }
  if (params.cautionHtml) sections.push(params.cautionHtml);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Commande payée — matériel",
    html: renderEmailLayout({
      title: "Une commande vient d’être payée",
      intro: "Un client a finalisé le paiement d’une commande vous concernant.",
      sections,
      ctaLabel: "Voir la commande",
      ctaUrl: params.orderUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Prestataire : Stripe Connect prêt à recevoir les paiements. */
export async function sendStripeConnectPaymentsReadyEmail(to: string) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Paiements activés sur GetSoundOn",
    html: renderEmailLayout({
      title: "Vos paiements Stripe sont prêts",
      intro:
        "Votre compte Stripe Connect est configuré pour recevoir les encaissements des réservations matériel payées via GetSoundOn.",
      sections: [
        `<p>Vous pouvez suivre les virements depuis votre espace prestataire et votre tableau de bord Stripe.</p>`,
      ],
      ctaLabel: "Espace paiements",
      ctaUrl: `${siteUrl}/proprietaire/paiement`,
    }),
  });
  return { success: !error, error: error?.message };
}

// ── P1 transactionnel : échecs paiement, incidents, payout, factures ─────────

/** Client : paiement principal Checkout refusé / échoué (hors empreinte caution). */
export async function sendGsPaymentFailedCustomerEmail(
  to: string,
  params: { contextLabel: string; resumeUrl: string }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Paiement non finalisé — ${params.contextLabel}`,
    html: renderEmailLayout({
      title: "Votre paiement n’a pas pu être finalisé",
      intro: `Le paiement pour <strong>${escapeHtml(params.contextLabel)}</strong> n’a pas abouti (carte refusée, 3-D Secure incomplet, fonds insuffisants, etc.). Aucun montant n’a été débité pour ce passage.`,
      sections: [
        `<p>Vous pouvez réessayer depuis votre espace : ouvrez la réservation ou la commande, puis relancez le paiement sécurisé. Si le problème persiste, contactez votre banque ou utilisez un autre moyen de paiement.</p>`,
      ],
      ctaLabel: "Retourner à ma réservation",
      ctaUrl: params.resumeUrl,
      ctaText: "Depuis cette page, relancez le paiement lorsque vous êtes prêt.",
    }),
  });
  return { success: !error, error: error?.message };
}

/** Client : empreinte de caution / dépôt de garantie non finalisée après paiement principal. */
export async function sendGsDepositHoldFailedCustomerEmail(
  to: string,
  params: { contextLabel: string; bookingUrl: string }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Caution — action requise — ${params.contextLabel}`,
    html: renderEmailLayout({
      title: "La caution n’a pas pu être enregistrée",
      intro: `Pour <strong>${escapeHtml(params.contextLabel)}</strong>, l’empreinte bancaire de caution n’a pas pu être finalisée. Votre paiement principal peut être enregistré ; consultez le détail de la réservation ou commande et le support si besoin.`,
      sections: [
        `<p class="tip">Sans caution valide lorsque l’annonce en prévoit une, le prestataire ou l’administration peut vous recontacter. Réessayez depuis votre espace ou écrivez à <a href="mailto:${siteConfig.supportEmail}">${escapeHtml(siteConfig.supportEmail)}</a>.</p>`,
      ],
      ctaLabel: "Voir le détail",
      ctaUrl: params.bookingUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Client : incident signalé par le prestataire. */
export async function sendGsBookingIncidentDeclaredCustomerEmail(
  to: string,
  params: { listingTitle: string; bookingUrl: string }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Incident signalé — ${params.listingTitle}`,
    html: renderEmailLayout({
      title: "Un incident a été signalé sur votre location",
      intro: `Le prestataire a ouvert un signalement concernant <strong>${escapeHtml(params.listingTitle)}</strong>. L’équipe GetSoundOn examine le dossier. Aucune issue n’est garantie à ce stade : vous serez informé des suites par email ou via votre espace.`,
      sections: [
        `<p>Vous pouvez consulter la réservation et les échanges associés. Pour toute question, contactez le support.</p>`,
      ],
      ctaLabel: "Voir ma réservation",
      ctaUrl: params.bookingUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Prestataire : accusé de réception du signalement. */
export async function sendGsBookingIncidentDeclaredProviderEmail(
  to: string,
  params: { listingTitle: string; bookingUrl: string }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Signalement enregistré — ${params.listingTitle}`,
    html: renderEmailLayout({
      title: "Votre signalement a bien été enregistré",
      intro: `Nous avons bien reçu votre déclaration pour <strong>${escapeHtml(params.listingTitle)}</strong>. L’administration va examiner le dossier. Les délais et l’issue dépendent des éléments fournis ; vous serez informé des suites.`,
      sections: [],
      ctaLabel: "Voir la réservation",
      ctaUrl: params.bookingUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Client ou prestataire : incident traité par l’administration. */
export async function sendGsBookingIncidentResolvedPartyEmail(
  to: string,
  params: {
    role: "customer" | "provider";
    listingTitle: string;
    bookingUrl: string;
    decision: "resolved" | "dismissed";
    cautionDecisionPending: boolean;
  }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const isResolved = params.decision === "resolved";
  const title = isResolved ? "Incident : suite donnée par l’administration" : "Incident : dossier clos";
  let intro = "";
  if (params.role === "customer") {
    intro = isResolved
      ? params.cautionDecisionPending
        ? `L’administration a pris en compte le signalement concernant <strong>${escapeHtml(params.listingTitle)}</strong>. Une décision sur la <strong>caution</strong> peut encore être nécessaire ; suivez votre réservation.`
        : `L’administration a traité le signalement concernant <strong>${escapeHtml(params.listingTitle)}</strong>. Les suites (versement, caution) suivent les règles affichées sur la plateforme.`
      : `L’administration a examiné le signalement sur <strong>${escapeHtml(params.listingTitle)}</strong> et l’a écarté. Le déroulement habituel (caution, versements) reprend lorsque c’est applicable.`;
  } else {
    intro = isResolved
      ? params.cautionDecisionPending
        ? `Votre signalement sur <strong>${escapeHtml(params.listingTitle)}</strong> a été validé. Une décision sur la caution peut encore être attendue avant le versement.`
        : `Votre signalement sur <strong>${escapeHtml(params.listingTitle)}</strong> a été traité ; le versement peut reprendre son cours selon les délais habituels.`
      : `Le signalement sur <strong>${escapeHtml(params.listingTitle)}</strong> a été rejeté par l’administration. Le cycle de versement reprend lorsque les conditions sont réunies.`;
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `${title} — ${params.listingTitle}`,
    html: renderEmailLayout({
      title,
      intro,
      sections: [
        `<p class="tip"><small style="color:#666">Les décisions financières définitives peuvent dépendre de Stripe, des délais bancaires et des conditions de l’annonce. En cas de doute, contactez le support.</small></p>`,
      ],
      ctaLabel: "Voir la réservation",
      ctaUrl: params.bookingUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Prestataire : virement net envoyé (Stripe Transfer). */
export async function sendGsBookingPayoutSentProviderEmail(
  to: string,
  params: { listingTitle: string; amountEurStr: string; bookingUrl: string }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Virement envoyé — ${params.listingTitle}`,
    html: renderEmailLayout({
      title: "Un virement vient d’être envoyé",
      intro: `Le versement net d’environ <strong>${escapeHtml(params.amountEurStr)}&nbsp;EUR</strong> pour <strong>${escapeHtml(params.listingTitle)}</strong> a été initié vers votre compte Connect Stripe. Le crédit sur votre compte bancaire dépend des délais Stripe et de votre banque.`,
      sections: [],
      ctaLabel: "Voir la réservation",
      ctaUrl: params.bookingUrl,
      ctaText: "Retrouvez aussi le suivi dans votre espace Stripe et l’onglet Paiements.",
    }),
  });
  return { success: !error, error: error?.message };
}

/** Prestataire ou client : facture PDF générée (lien stable vers l’espace). */
export async function sendGsInvoiceAvailableEmail(
  to: string,
  params: {
    invoiceNumber: string;
    role: "provider" | "customer";
    dashboardUrl: string;
    listingTitle?: string;
  }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const label = params.listingTitle
    ? escapeHtml(params.listingTitle)
    : params.role === "provider"
      ? "votre activité"
      : "votre réservation";
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Facture disponible — ${params.invoiceNumber}`,
    html: renderEmailLayout({
      title: "Un document récapitulatif est disponible",
      intro: `La facture (document PDF) <strong>${escapeHtml(params.invoiceNumber)}</strong> concernant ${label} a été générée. Téléchargez-la depuis votre espace GetSoundOn (lien ci-dessous). Ce document est informatif ; la facturation TVA éventuelle reste de votre responsabilité ou selon les CGV.`,
      sections: [],
      ctaLabel: params.role === "provider" ? "Ouvrir mes factures" : "Voir ma réservation",
      ctaUrl: params.dashboardUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

// ── P2 : annonces prestataire, accuses contact, Connect interrompu ───────────

/** Prestataire : annonce soumise, en attente de validation admin (si configuré). */
export async function sendGsListingSubmittedProviderEmail(
  to: string,
  params: { listingTitle: string; manageUrl: string }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Annonce reçue — ${params.listingTitle}`,
    html: renderEmailLayout({
      title: "Votre annonce a bien été reçue",
      intro: `Nous avons bien enregistré <strong>${escapeHtml(params.listingTitle)}</strong>. Elle sera visible sur le catalogue après validation par l’équipe GetSoundOn lorsque la publication manuelle est activée.`,
      sections: [
        `<p>Vous pouvez modifier les informations ou les photos depuis votre espace. Vous recevrez un autre message lorsque l’annonce sera en ligne.</p>`,
      ],
      ctaLabel: "Gérer mon annonce",
      ctaUrl: params.manageUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Prestataire : annonce visible sur le catalogue (`is_active` true). */
export async function sendGsListingPublishedProviderEmail(
  to: string,
  params: {
    listingTitle: string;
    catalogueUrl: string;
    manageUrl: string;
    /** true = décision / action équipe GetSoundOn (modération). */
    validatedByAdmin?: boolean;
  }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const intro = params.validatedByAdmin
    ? `L’équipe GetSoundOn a validé votre annonce : <strong>${escapeHtml(params.listingTitle)}</strong> est désormais visible sur le catalogue (sous réserve des règles d’affichage habituelles).`
    : `Félicitations : <strong>${escapeHtml(params.listingTitle)}</strong> est désormais visible par les organisateurs sur le catalogue GetSoundOn (sous réserve des règles d’affichage habituelles).`;
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Annonce en ligne — ${params.listingTitle}`,
    html: renderEmailLayout({
      title: "Votre annonce est en ligne",
      intro,
      sections: [
        `<p>Pensez à vérifier vos photos, tarifs et disponibilités. Les réservations nécessitent un compte Stripe Connect actif lorsque le client paie en ligne.</p>`,
        `<p><a href="${params.manageUrl}">Gérer cette annonce</a></p>`,
      ],
      ctaLabel: "Voir sur le catalogue",
      ctaUrl: params.catalogueUrl,
      ctaText: "Le catalogue public liste les annonces actives.",
    }),
  });
  return { success: !error, error: error?.message };
}

/** Prestataire : annonce masquée (`is_active` false), ex. désactivation ou suppression logique. */
export async function sendGsListingDeactivatedProviderEmail(
  to: string,
  params: { listingTitle: string; manageUrl: string; deactivatedByAdmin?: boolean }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const intro = params.deactivatedByAdmin
    ? `L’équipe GetSoundOn a retiré du catalogue l’annonce <strong>${escapeHtml(params.listingTitle)}</strong> (masquée). Les réservations en cours ne sont pas annulées par ce seul geste. Pour en savoir plus, contactez le support.`
    : `L’annonce <strong>${escapeHtml(params.listingTitle)}</strong> a été retirée du catalogue (statut inactif). Les réservations en cours ne sont pas annulées par ce seul geste.`;
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Annonce masquée — ${params.listingTitle}`,
    html: renderEmailLayout({
      title: "Votre annonce n’est plus visible",
      intro,
      sections: params.deactivatedByAdmin
        ? [`<p>Vous pouvez consulter ou modifier votre fiche depuis votre espace prestataire.</p>`]
        : [
            `<p>Si vous n’êtes pas à l’origine de ce changement, connectez-vous à votre compte ou contactez le support.</p>`,
          ],
      ctaLabel: "Mes annonces",
      ctaUrl: params.manageUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Prestataire : annonce refusée par la modération admin. */
export async function sendGsListingRejectedProviderEmail(
  to: string,
  params: { listingTitle: string; manageUrl: string; reason: string | null }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const reasonBlock = params.reason
    ? `<p class="tip"><strong>Motif indiqué :</strong> ${escapeHtml(params.reason)}</p>`
    : `<p class="tip">Aucun motif détaillé n’a été joint ; écrivez au support si vous souhaitez des précisions.</p>`;
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Annonce non publiée — ${params.listingTitle}`,
    html: renderEmailLayout({
      title: "Votre annonce n’a pas été publiée",
      intro: `L’annonce <strong>${escapeHtml(params.listingTitle)}</strong> ne figure pas sur le catalogue suite à une décision de modération GetSoundOn. Vous pouvez adapter le contenu (photos, description, tarifs) et contacter le support pour une nouvelle vérification si besoin.`,
      sections: [
        reasonBlock,
        `<p><small style="color:#666">Cette décision n’annule pas les réservations déjà en cours sur cette annonce si elles existent ; en cas de doute, contactez le support.</small></p>`,
      ],
      ctaLabel: "Modifier mon annonce",
      ctaUrl: params.manageUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Utilisateur : accusé de réception après formulaire contact / centre d’aide. */
export async function sendContactFormAcknowledgementEmail(
  to: string,
  params: { contextLine: string }
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Nous avons bien reçu votre message — GetSoundOn",
    html: renderEmailLayout({
      title: "Message bien reçu",
      intro: `${escapeHtml(params.contextLine)} Notre équipe en prend connaissance. Le délai de réponse peut varier selon la période.`,
      sections: [
        `<p>Pour toute urgence liée à une réservation en cours, précisez la référence dans votre prochain message ou répondez à ce fil si votre client mail le permet.</p>`,
      ],
      ctaLabel: "Centre d’aide",
      ctaUrl: `${siteUrl}/centre-aide`,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Prestataire : capacités Stripe Connect passées de « actives » à « inactives » (webhook explicite). */
export async function sendStripeConnectPayoutsInterruptedEmail(to: string) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Action requise — paiements Stripe (GetSoundOn)",
    html: renderEmailLayout({
      title: "Vos encaissements peuvent être interrompus",
      intro:
        "Stripe signale que les capacités de versement de votre compte Connect ne sont plus actives. Les nouveaux paiements ou virements peuvent être bloqués tant que le compte n’est pas à jour.",
      sections: [
        `<p>Ouvrez votre espace paiements GetSoundOn puis le tableau de bord Stripe pour compléter les informations ou documents demandés.</p>`,
      ],
      ctaLabel: "Espace paiements",
      ctaUrl: `${siteUrl}/proprietaire/paiement`,
    }),
  });
  return { success: !error, error: error?.message };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
