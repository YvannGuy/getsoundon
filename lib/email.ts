import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const from =
  process.env.RESEND_FROM_EMAIL ?? "salledeculte.com <onboarding@resend.dev>";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salledeculte.com";
const contactEmail = "contact@salledeculte.com";
const instagramUrl = "https://www.instagram.com/salledeculte/";
const facebookUrl = "https://www.facebook.com/profile.php?id=61588281587238";
const demoVideoUrl = "https://youtu.be/demo-salledeculte";
const seekerWelcomeVideoUrl = "https://vimeo.com/1169991938";
const seekerWelcomeGuideUrl = `${siteUrl}/pdf/salledeculte.com_bien_debuter.pdf`;
const ownerWelcomeVideoUrl = "https://vimeo.com/1170020143";

function renderEmailLayout({
  title,
  intro,
  sections,
  ctaLabel,
  ctaUrl,
  ctaTitle = "Commencez maintenant",
  ctaText = "Accédez à votre espace pour continuer sur salledeculte.com.",
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
  const logoUrl = `${siteUrl}/logopleinsdc.png`;
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
h2{color:#213398;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:26px 0 12px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;}
a{color:#213398;text-decoration:none;}
a:hover{text-decoration:underline;}
.email-card{max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;}
.header{padding:20px 24px;border-bottom:1px solid #e2e8f0;background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);}
.logo{display:inline-flex;align-items:center;gap:10px;color:#0f172a;font-weight:700;font-size:16px;}
.logo img{height:40px;width:auto;display:block;}
.content{padding:24px;}
.btn{display:inline-block;background:#213398;color:#fff!important;padding:12px 24px;border-radius:8px;margin:14px 0 6px;font-weight:600;}
p{margin:0 0 12px;}
ul{margin:12px 0;padding-left:20px;}
li{margin:6px 0;}
.tip{margin:12px 0;padding:12px;background:#f8fafc;border-left:3px solid #213398;font-size:14px;}
.cta-block{margin-top:22px;padding:16px;border:1px solid #dbe4ff;background:#f7f9ff;border-radius:12px;}
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
        <img src="${logoUrl}" alt="salledeculte.com" />
        <span>salledeculte.com</span>
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
      <p class="signature">À très bientôt,<br>L'équipe salledeculte.com</p>
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
    subject: "Bienvenue sur salledeculte.com",
    html: renderEmailLayout({
      title: `Bienvenue ${firstName} sur Salledeculte`,
      intro:
        "Vous venez de rejoindre une plateforme pensée pour connecter les propriétaires de salles chrétiennes et les utilisateurs en recherche d’un lieu adapté à leurs besoins.",
      sections: [
        `<h2>Un espace simple et sécurisé</h2>
         <p>Notre objectif : simplifier les échanges, faciliter la réservation et sécuriser les paiements, tout en proposant une expérience claire et professionnelle.</p>`,
        `<h2>Ce que vous pouvez faire</h2>
         <ul>
           <li>Parcourir les salles disponibles</li>
           <li>Envoyer une demande de location ou de visite</li>
           <li>Échanger directement avec le propriétaire</li>
           <li>Recevoir une offre personnalisée</li>
           <li>Payer en ligne de manière sécurisée (optionnel)</li>
         </ul>`,
        `<h2>Astuce pour bien démarrer</h2>
         <p>Complétez votre demande avec un maximum de détails (type d’événement, date, capacité, budget). Vous recevrez des réponses plus rapides et plus pertinentes.</p>`,
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
    subject: "Bienvenue sur salledeculte.com",
    html: renderEmailLayout({
      title: "Bienvenue sur salledeculte.com",
      intro:
        "Merci d’avoir rejoint la plateforme en tant que propriétaire. Vous faites désormais partie d’un réseau dédié à la location de salles chrétiennes.",
      sections: [
        `<h2>Un outil conçu pour vous faire gagner du temps</h2>
         <p>Salledeculte vous permet de publier votre salle, recevoir des demandes ciblées, échanger simplement avec les utilisateurs et sécuriser vos paiements.</p>`,
        `<h2>Ce que vous pouvez faire dès maintenant</h2>
         <ul>
           <li>Ajouter ou modifier vos annonces</li>
           <li>Gérer vos disponibilités</li>
           <li>Recevoir des demandes de visite/location</li>
           <li>Envoyer des offres</li>
           <li>Suivre vos transactions depuis votre dashboard</li>
         </ul>`,
        `<h2>Conseil pour bien démarrer</h2>
         <p>Prenez quelques minutes pour compléter votre annonce avec des photos de qualité, une description claire et les informations pratiques. Plus votre annonce est détaillée, plus vous recevrez des demandes pertinentes.</p>`,
        `<h2>Vidéo de prise en main</h2>
         <p>Découvrez les principales fonctionnalités propriétaire :</p>
         <p><a href="${ownerWelcomeVideoUrl}">${ownerWelcomeVideoUrl}</a></p>`,
      ],
      ctaLabel: "Créer ou gérer mon annonce",
      ctaUrl: `${siteUrl}/onboarding/salle`,
    }),
  });
  return { success: !error, error: error?.message };
}

export async function sendNewMessageNotification(
  to: string,
  senderName: string,
  preview: string,
  messagerieUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, email non envoyé");
    return { success: false };
  }
  const safePreview =
    preview.length > 120 ? preview.slice(0, 117) + "..." : preview;
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Nouveau message de ${senderName} sur salledeculte.com`,
    html: renderEmailLayout({
      title: "Nouveau message",
      intro: `<strong>${escapeHtml(senderName)}</strong> vous a envoyé un message :`,
      sections: [
        `<p class="tip">${escapeHtml(safePreview)}</p>`,
      ],
      ctaLabel: "Voir la discussion",
      ctaUrl: messagerieUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

export async function sendNewDemandeNotification(
  to: string,
  seekerName: string,
  salleName: string,
  demandeUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, notification nouvelle demande non envoyée");
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Nouvelle demande pour ${salleName} sur salledeculte.com`,
    html: renderEmailLayout({
      title: "Nouvelle demande de réservation",
      intro: `<strong>${escapeHtml(seekerName)}</strong> vous a envoyé une demande pour la salle <strong>${escapeHtml(salleName)}</strong>.`,
      sections: [
        "<p>Connectez-vous à votre espace propriétaire pour la consulter et y répondre.</p>",
      ],
      ctaLabel: "Voir la demande",
      ctaUrl: demandeUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Notifie le propriétaire d'une demande de visite */
export async function sendNewVisiteRequestNotification(
  to: string,
  seekerName: string,
  salleName: string,
  creneauLabel: string,
  demandesUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, notification demande de visite non envoyée");
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Demande de visite pour ${salleName} — ${seekerName}`,
    html: renderEmailLayout({
      title: "Demande de visite",
      intro: `<strong>${escapeHtml(seekerName)}</strong> souhaite organiser une visite pour <strong>${escapeHtml(salleName)}</strong>.`,
      sections: [
        `<p class="tip"><strong>Créneau demandé :</strong> ${escapeHtml(creneauLabel)}</p>`,
      ],
      ctaLabel: "Voir et répondre",
      ctaUrl: demandesUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Confirmation au seeker quand sa demande de visite est acceptée */
export async function sendVisiteAcceptedNotification(
  to: string,
  salleName: string,
  address: string,
  dateStr: string,
  horairesStr: string,
  messagerieUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Visite acceptée pour ${salleName} — salledeculte.com`,
    html: renderEmailLayout({
      title: "Votre visite a été acceptée",
      intro: `Le propriétaire de <strong>${escapeHtml(salleName)}</strong> a accepté votre demande de visite.`,
      sections: [
        `<p class="tip"><strong>Date :</strong> ${escapeHtml(dateStr)}<br><strong>Créneau :</strong> ${escapeHtml(horairesStr)}<br><strong>Adresse :</strong> ${escapeHtml(address)}</p>`,
        "<p>Vous pouvez contacter le propriétaire pour organiser la visite.</p>",
      ],
      ctaLabel: "Ouvrir la messagerie",
      ctaUrl: messagerieUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Notification au seeker quand sa demande de visite est refusée */
export async function sendVisiteRefusedNotification(
  to: string,
  salleName: string,
  demandesUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Créneau indisponible pour ${salleName} — salledeculte.com`,
    html: renderEmailLayout({
      title: "Votre demande de visite n'a pas pu être confirmée",
      intro: `Le propriétaire de <strong>${escapeHtml(salleName)}</strong> n'est pas disponible sur ce créneau.`,
      sections: [
        "<p>Vous pouvez consulter votre demande et échanger avec le propriétaire depuis votre espace.</p>",
      ],
      ctaLabel: "Voir ma demande",
      ctaUrl: demandesUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Notification au seeker quand le propriétaire propose une reprogrammation */
export async function sendVisiteRescheduleNotification(
  to: string,
  salleName: string,
  dateStr: string,
  horairesStr: string,
  demandeUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Nouveau créneau proposé pour ${salleName} — salledeculte.com`,
    html: renderEmailLayout({
      title: "Un nouveau créneau vous est proposé",
      intro: `Le propriétaire de <strong>${escapeHtml(salleName)}</strong> vous propose une nouvelle date de visite.`,
      sections: [
        `<p class="tip"><strong>Date :</strong> ${escapeHtml(dateStr)}<br><strong>Créneau :</strong> ${escapeHtml(horairesStr)}</p>`,
        "<p>Vous pouvez accepter ou refuser cette proposition depuis votre demande.</p>",
      ],
      ctaLabel: "Gérer ma demande",
      ctaUrl: demandeUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Notifie les admins quand une nouvelle annonce est soumise et doit être validée */
export async function sendNewSallePendingAdminNotification(
  adminEmails: string[],
  salleName: string,
  salleCity: string,
  validationUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, notification nouvelle salle (à valider) non envoyée");
    return { success: false };
  }
  if (adminEmails.length === 0) {
    return { success: false };
  }
  const to = adminEmails;
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `[salledeculte.com] Nouvelle annonce à valider : ${salleName}`,
    html: renderEmailLayout({
      title: "Nouvelle annonce à valider",
      intro:
        "Une nouvelle annonce a été soumise et nécessite votre validation.",
      sections: [
        `<p><strong>${escapeHtml(salleName)}</strong> — ${escapeHtml(salleCity)}</p>`,
      ],
      ctaLabel: "Voir et valider l'annonce",
      ctaUrl: validationUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Notifie les admins quand une nouvelle annonce est publiée automatiquement (sans validation) */
export async function sendNewSallePublishedAdminNotification(
  adminEmails: string[],
  salleName: string,
  salleCity: string,
  annoncesUrl: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, notification nouvelle salle (publiée) non envoyée");
    return { success: false };
  }
  if (adminEmails.length === 0) {
    return { success: false };
  }
  const to = adminEmails;
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `[salledeculte.com] Nouvelle annonce publiée : ${salleName}`,
    html: renderEmailLayout({
      title: "Nouvelle annonce publiée",
      intro:
        "Une nouvelle annonce a été publiée automatiquement (mode publication auto).",
      sections: [
        `<p><strong>${escapeHtml(salleName)}</strong> — ${escapeHtml(salleCity)}</p>`,
      ],
      ctaLabel: "Voir les annonces",
      ctaUrl: annoncesUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

export async function sendReservationConfirmedSeekerEmail(
  to: string,
  salleName: string,
  amountEur: string,
  reservationsUrl: string
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Reservation confirmee pour ${salleName}`,
    html: renderEmailLayout({
      title: "Votre reservation est confirmee",
      intro: `Votre paiement pour <strong>${escapeHtml(salleName)}</strong> a ete valide.`,
      sections: [
        `<p class="tip"><strong>Montant paye :</strong> ${escapeHtml(amountEur)} EUR</p>`,
        "<p>Vous pouvez consulter les details de votre reservation dans votre espace.</p>",
      ],
      ctaLabel: "Voir ma reservation",
      ctaUrl: reservationsUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

export async function sendReservationConfirmedOwnerEmail(
  to: string,
  salleName: string,
  amountEur: string,
  ownerReservationsUrl: string
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Reservation confirmee pour ${salleName}`,
    html: renderEmailLayout({
      title: "Une reservation vient d'etre confirmee",
      intro: `Le paiement de la reservation pour <strong>${escapeHtml(salleName)}</strong> est confirme.`,
      sections: [
        `<p class="tip"><strong>Montant paye :</strong> ${escapeHtml(amountEur)} EUR</p>`,
      ],
      ctaLabel: "Voir mes reservations",
      ctaUrl: ownerReservationsUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

export async function sendPaymentFailedSeekerEmail(
  to: string,
  salleName: string,
  paymentUrl: string
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Paiement echoue pour ${salleName}`,
    html: renderEmailLayout({
      title: "Paiement non finalise",
      intro: `Le paiement pour <strong>${escapeHtml(salleName)}</strong> n'a pas pu aboutir.`,
      sections: [
        "<p>Verifiez votre moyen de paiement puis relancez l'operation depuis votre espace.</p>",
      ],
      ctaLabel: "Reessayer le paiement",
      ctaUrl: paymentUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

export async function sendPaymentFailedOwnerEmail(
  to: string,
  salleName: string,
  ownerReservationsUrl: string
) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Paiement echoue pour ${salleName}`,
    html: renderEmailLayout({
      title: "Echec de paiement sur une reservation",
      intro: `Le paiement de la reservation pour <strong>${escapeHtml(salleName)}</strong> a echoue.`,
      sections: [
        "<p>Vous pouvez suivre la reservation et reprendre l'echange depuis votre espace proprietaire.</p>",
      ],
      ctaLabel: "Voir mes reservations",
      ctaUrl: ownerReservationsUrl,
    }),
  });
  return { success: !error, error: error?.message };
}

/** Confirmation à l'utilisateur après soumission du formulaire conciergerie */
export async function sendConciergeConfirmationEmail(to: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, email confirmation conciergerie non envoyé");
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Demande enregistrée — Conciergerie salledeculte.com",
    html: renderEmailLayout({
      title: "Votre demande a bien été enregistrée",
      intro:
        "Merci d'avoir confié votre recherche de salle à notre équipe. Nous avons bien reçu votre brief et nous vous recontacterons sous 24–72h avec une shortlist de 3 à 5 lieux adaptés à votre besoin.",
      sections: [
        "<p>En attendant, vous pouvez continuer à explorer nos <a href=\"" + siteUrl + "/rechercher\">salles disponibles</a>.</p>",
      ],
      ctaLabel: "Explorer les salles",
      ctaUrl: `${siteUrl}/rechercher`,
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
