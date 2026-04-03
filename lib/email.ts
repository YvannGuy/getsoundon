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
const contactEmail = "contact@getsoundon.com";
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
        <p>Contact support : <a href="mailto:${contactEmail}">${contactEmail}</a></p>
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
        "Vous venez de rejoindre une plateforme dédiée à la <strong>location de matériel événementiel</strong> (sono, DJ, lumière, services) entre <strong>locataires</strong> et <strong>prestataires</strong> vérifiés.",
      sections: [
        `<h2>Un parcours simple et encadré</h2>
         <p>Notre objectif : vous aider à trouver le bon matériel, échanger clairement avec le prestataire, sécuriser la <strong>demande</strong>, la <strong>réservation</strong> et le <strong>paiement</strong> lorsque le flux en ligne est proposé sur l’annonce.</p>`,
        `<h2>Ce que vous pouvez faire</h2>
         <ul>
           <li>Parcourir le <a href="${siteUrl}/catalogue">catalogue matériel</a></li>
           <li>Réserver et payer en ligne lorsque l’annonce le propose (paiement sécurisé)</li>
           <li>Échanger avec le prestataire depuis <strong>Mes locations matériel</strong> (tableau de bord)</li>
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
        `<h2>Un outil pensé pour les loueurs</h2>
         <p>Publiez vos <strong>annonces</strong> (photos, tarifs, zone, options), gérez les <strong>réservations catalogue</strong> et, lorsque Stripe Connect est activé, encaissez les <strong>paiements</strong> associés.</p>`,
        `<h2>Ce que vous pouvez faire dès maintenant</h2>
         <ul>
           <li>Créer ou compléter une <strong>annonce</strong> matériel</li>
           <li>Suivre les <strong>locations matériel</strong> et les échanges liés aux réservations</li>
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
    `<p class="tip"><strong>Montant de la location (votre annonce) :</strong> ${escapeHtml(locationAmountEur)} EUR</p>`,
  ];
  if (split?.serviceFeePaidByCustomerEur && split?.checkoutTotalEur) {
    sections.push(
      `<p class="tip"><strong>Frais de service (facturés au locataire, hors votre rémunération) :</strong> ${escapeHtml(split.serviceFeePaidByCustomerEur)} EUR — <strong>total encaissé sur le paiement :</strong> ${escapeHtml(split.checkoutTotalEur)} EUR.</p>`
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
      intro: `Un locataire a finalisé le paiement pour votre annonce <strong>${escapeHtml(listingTitle)}</strong>.`,
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
    to: contactEmail,
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
    to: contactEmail,
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
      ? "Organisateur / chercheur de matériel"
      : params.profile === "prestataire"
        ? "Prestataire / loueur"
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
