import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const from =
  process.env.RESEND_FROM_EMAIL ?? "salledeculte.com <onboarding@resend.dev>";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function sendWelcomeSeekerEmail(to: string, fullName: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, email non envoyé");
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Bienvenue sur salledeculte.com",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
body{font-family:system-ui,sans-serif;line-height:1.65;color:#334155;max-width:580px;margin:0 auto;padding:28px;font-size:15px;}
h1{color:#0f172a;font-size:22px;font-weight:600;margin:0 0 24px;}
h2{color:#213398;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin:28px 0 12px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;}
a{color:#213398;text-decoration:none;}
a:hover{text-decoration:underline;}
.btn{display:inline-block;background:#213398;color:#fff!important;padding:12px 24px;border-radius:8px;margin:20px 0;font-weight:500;}
p{margin:0 0 12px;}
ul{margin:12px 0;padding-left:20px;}
li{margin:6px 0;}
.tip{margin:12px 0;padding:12px;background:#f8fafc;border-left:3px solid #213398;font-size:14px;}
.signature{margin-top:32px;color:#64748b;font-size:14px;}
</style>
</head>
<body>
  <h1>Bonjour et bienvenue sur salledeculte.com</h1>
  <p>Merci d'avoir rejoint la plateforme. Vous pouvez désormais rechercher des lieux adaptés à vos événements spirituels et cérémoniels.</p>

  <h2>🏛 Qu'est-ce que salledeculte.com ?</h2>
  <p>salledeculte.com est une plateforme spécialisée qui met en relation :</p>
  <ul>
    <li>Des personnes recherchant une salle</li>
    <li>Des propriétaires de lieux</li>
  </ul>
  <p>Notre objectif est de simplifier votre recherche grâce à des annonces claires, des photos soignées et des informations essentielles.</p>

  <h2>✨ Comment bien rechercher votre salle</h2>
  <ul>
    <li>Utilisez les filtres (lieu, capacité, type d'événement)</li>
    <li>Consultez attentivement les photos</li>
    <li>Vérifiez les contraintes et règles du lieu</li>
    <li>Comparez plusieurs annonces</li>
  </ul>
  <p class="tip">👉 Une recherche précise facilite des réponses plus rapides et pertinentes.</p>

  <h2>🚀 Vos avantages sur salledeculte.com</h2>
  <ul>
    <li>Vous accédez à des annonces structurées</li>
    <li>Vous gagnez du temps dans votre recherche</li>
    <li>Vous échangez directement avec les propriétaires</li>
    <li>Vous centralisez vos demandes et discussions</li>
    <li>Vous bénéficiez d'un cadre plus clair et sécurisé</li>
  </ul>

  <h2>🎟 Vos Pass de contact</h2>
  <p>Pour démarrer sereinement :</p>
  <ul>
    <li>Vous bénéficiez de <strong>2 Pass gratuits</strong> pour contacter les propriétaires.</li>
  </ul>
  <p>Ensuite, vous pouvez activer : Pass 24h • Pass 48h • Abonnement</p>
  <p class="tip">👉 Les Pass vous permettent de contacter librement les propriétaires pendant la durée choisie.</p>

  <h2>💬 Une mise en relation simplifiée</h2>
  <p>La plateforme vous permet de :</p>
  <ul>
    <li>Contacter les propriétaires</li>
    <li>Envoyer des demandes ciblées</li>
    <li>Discuter directement</li>
    <li>Recevoir et comparer des offres</li>
  </ul>

  <h2>💳 Offres & Paiements via la plateforme</h2>
  <p>Une fois votre accord trouvé avec un propriétaire :</p>
  <ul>
    <li>Vous pouvez recevoir une offre de location</li>
    <li>Effectuer le paiement directement sur la plateforme</li>
    <li>Bénéficier d'un cadre sécurisé</li>
    <li>Accéder à un contrat et une facture associés</li>
  </ul>
  <p class="tip">👉 Le paiement via la plateforme reste optionnel, mais offre davantage de sécurité et de sérénité.</p>
  <p>Avantages : Paiement sécurisé • Transaction traçable • Reçu Stripe automatique • Cadre clair et professionnel</p>

  <h2>📊 Depuis votre Dashboard</h2>
  <p>Dans votre espace utilisateur, vous pouvez :</p>
  <ul>
    <li>Suivre vos demandes</li>
    <li>Gérer vos discussions</li>
    <li>Consulter vos offres reçues</li>
    <li>Accéder à vos Pass et paiements</li>
  </ul>

  <h2>🤝 Notre objectif</h2>
  <p>Vous aider à trouver facilement un lieu adapté et simplifier l'organisation de votre événement.</p>

  <h2>👉 Accéder à votre espace</h2>
  <p>Connectez-vous à tout moment :</p>
  <p><a href="${siteUrl}" class="btn">Accéder à salledeculte.com</a></p>
  <p>Nous sommes ravis de vous compter parmi nos utilisateurs.</p>
  <p class="signature">À très bientôt,<br>L'équipe salledeculte.com</p>
</body>
</html>`,
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
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
body{font-family:system-ui,sans-serif;line-height:1.65;color:#334155;max-width:580px;margin:0 auto;padding:28px;font-size:15px;}
h1{color:#0f172a;font-size:22px;font-weight:600;margin:0 0 24px;}
h2{color:#213398;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin:28px 0 12px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;}
a{color:#213398;text-decoration:none;}
a:hover{text-decoration:underline;}
.btn{display:inline-block;background:#213398;color:#fff!important;padding:12px 24px;border-radius:8px;margin:20px 0;font-weight:500;}
p{margin:0 0 12px;}
ul{margin:12px 0;padding-left:20px;}
li{margin:6px 0;}
.tip{margin:12px 0;padding:12px;background:#f8fafc;border-left:3px solid #213398;font-size:14px;}
.signature{margin-top:32px;color:#64748b;font-size:14px;}
</style>
</head>
<body>
  <h1>Bonjour et bienvenue sur salledeculte.com</h1>
  <p>Merci d'avoir rejoint la plateforme. Vous faites désormais partie des propriétaires qui proposent des lieux adaptés à des événements spirituels et cérémoniels.</p>

  <h2>🏛 Qu'est-ce que salledeculte.com ?</h2>
  <p>salledeculte.com est une plateforme spécialisée qui met en relation :</p>
  <ul>
    <li>Des propriétaires de lieux</li>
    <li>Des personnes recherchant une salle</li>
  </ul>
  <p>Contrairement aux plateformes généralistes, salledeculte.com est pensée pour des besoins spécifiques : clarté des annonces, informations essentielles, demandes ciblées.</p>

  <h2>✨ Comment bien présenter votre salle</h2>
  <p>Une annonce complète augmente fortement vos chances de recevoir des demandes qualifiées.</p>
  <ul>
    <li>Ajoutez des photos lumineuses et nettes</li>
    <li>Indiquez la capacité réelle</li>
    <li>Précisez les contraintes (horaires, son, règles)</li>
    <li>Mentionnez les équipements disponibles</li>
    <li>Soyez clair sur les types d'événements acceptés</li>
  </ul>
  <p class="tip">👉 Une annonce précise évite les mauvaises demandes et fait gagner du temps à tous.</p>

  <h2>🚀 Vos avantages en tant que propriétaire</h2>
  <p>En étant inscrit sur salledeculte.com :</p>
  <ul>
    <li>Vous recevez des demandes ciblées</li>
    <li>Vous gagnez en visibilité</li>
    <li>Vous évitez les échanges inutiles</li>
    <li>Vous contrôlez vos disponibilités</li>
    <li>Vous échangez directement avec les demandeurs</li>
    <li>Vous centralisez vos discussions et paiements</li>
  </ul>

  <h2>💳 Paiements via la plateforme</h2>
  <p>Vous pouvez choisir d'être payé directement via salledeculte.com.</p>
  <p><strong>Avantages :</strong></p>
  <ul>
    <li>Paiement sécurisé</li>
    <li>Commission automatiquement calculée</li>
    <li>Historique des transactions</li>
    <li>Reçu Stripe automatique</li>
    <li>Expérience rassurante pour le client</li>
  </ul>
  <p><strong>Commission plateforme :</strong></p>
  <p>Une commission de service est appliquée uniquement lorsque la transaction est réalisée via la plateforme.</p>
  <p class="tip">👉 Aucun frais tant qu'il n'y a pas de paiement.</p>

  <h2>🔒 Pourquoi passer par la plateforme ?</h2>
  <ul>
    <li>Sécurité des paiements</li>
    <li>Traçabilité</li>
    <li>Moins de risques d'annulation / litige</li>
    <li>Image plus professionnelle</li>
    <li>Confiance renforcée côté client</li>
  </ul>

  <h2>📊 Depuis votre Dashboard</h2>
  <p>Dans votre espace propriétaire, vous pouvez :</p>
  <ul>
    <li>Gérer vos annonces</li>
    <li>Mettre à jour vos disponibilités</li>
    <li>Répondre aux demandes</li>
    <li>Envoyer des offres</li>
    <li>Suivre vos paiements</li>
  </ul>

  <h2>🤝 Notre objectif</h2>
  <p>Vous aider à valoriser votre lieu, simplifier la mise en relation et sécuriser les échanges.</p>

  <h2>👉 Accéder à votre espace</h2>
  <p>Connectez-vous à tout moment :</p>
  <p><a href="${siteUrl}/onboarding/salle" class="btn">Accéder à mon espace</a></p>
  <p>Nous sommes ravis de vous compter parmi nos propriétaires.</p>
  <p class="signature">À très bientôt,<br>L'équipe salledeculte.com</p>
</body>
</html>`,
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
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;}a{color:#213398;text-decoration:none;}a:hover{text-decoration:underline;}.btn{display:inline-block;background:#213398;color:#fff!important;padding:12px 24px;border-radius:8px;margin:16px 0;}.preview{background:#f5f5f5;padding:12px;border-radius:8px;margin:16px 0;font-style:italic;}p{margin:0 0 1em;}</style></head>
<body>
  <h1>Nouveau message</h1>
  <p><strong>${senderName}</strong> vous a envoyé un message :</p>
  <div class="preview">${escapeHtml(safePreview)}</div>
  <p><a href="${messagerieUrl}" class="btn">Voir la discussion</a></p>
  <p>Cordialement,<br>L'équipe salledeculte.com</p>
</body>
</html>`,
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
    console.warn("[email] RESEND_API_KEY non configuré, email non envoyé");
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Nouvelle demande pour ${salleName} sur salledeculte.com`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;}a{color:#213398;text-decoration:none;}a:hover{text-decoration:underline;}.btn{display:inline-block;background:#213398;color:#fff!important;padding:12px 24px;border-radius:8px;margin:16px 0;}p{margin:0 0 1em;}</style></head>
<body>
  <h1>Nouvelle demande de réservation</h1>
  <p><strong>${escapeHtml(seekerName)}</strong> vous a envoyé une demande pour la salle <strong>${escapeHtml(salleName)}</strong>.</p>
  <p>Connectez-vous à votre espace propriétaire pour la consulter et y répondre.</p>
  <p><a href="${demandeUrl}" class="btn">Voir la demande</a></p>
  <p>Cordialement,<br>L'équipe salledeculte.com</p>
</body>
</html>`,
  });
  return { success: !error, error: error?.message };
}

/** Email de confirmation après inscription à la liste Coming Soon */
export async function sendComingSoonConfirmationEmail(to: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY non configuré, email non envoyé");
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Merci pour votre inscription — salledeculte.com",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
body{font-family:system-ui,sans-serif;line-height:1.65;color:#334155;max-width:580px;margin:0 auto;padding:28px;font-size:15px;}
h1{color:#0f172a;font-size:22px;font-weight:600;margin:0 0 24px;}
a{color:#213398;text-decoration:none;}
a:hover{text-decoration:underline;}
.btn{display:inline-block;background:#213398;color:#fff!important;padding:12px 24px;border-radius:8px;margin:20px 0;font-weight:500;}
p{margin:0 0 12px;}
.signature{margin-top:32px;color:#64748b;font-size:14px;}
</style>
</head>
<body>
  <h1>Merci pour votre inscription</h1>
  <p>Vous serez informé en priorité de l&apos;ouverture de salledeculte.com.</p>
  <p>En attendant, suivez-nous sur nos réseaux pour rester connecté :</p>
  <p>
    <a href="https://www.instagram.com/salledeculte/">Instagram</a> &middot;
    <a href="https://www.facebook.com/profile.php?id=61588281587238">Facebook</a>
  </p>
  <p><a href="${siteUrl}" class="btn">Visiter salledeculte.com</a></p>
  <p class="signature">À très bientôt,<br>L&apos;équipe salledeculte.com</p>
</body>
</html>`,
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
    return { success: false };
  }
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Demande de visite pour ${salleName} — ${seekerName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>body{font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:560px;margin:0 auto;padding:24px;}a{color:#213398;text-decoration:none;}.btn{display:inline-block;background:#213398;color:#fff!important;padding:12px 24px;border-radius:8px;margin:16px 0;}p{margin:0 0 1em;}.creneau{background:#f5f5f5;padding:12px;border-radius:8px;margin:16px 0;font-weight:500;}</style></head>
<body>
  <h1>Demande de visite</h1>
  <p><strong>${escapeHtml(seekerName)}</strong> souhaite organiser une visite pour <strong>${escapeHtml(salleName)}</strong>.</p>
  <p class="creneau">Créneau demandé : ${escapeHtml(creneauLabel)}</p>
  <p><a href="${demandesUrl}" class="btn">Voir et répondre</a></p>
  <p>Cordialement,<br>L'équipe salledeculte.com</p>
</body>
</html>`,
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
  if (!process.env.RESEND_API_KEY || adminEmails.length === 0) {
    return { success: false };
  }
  const to = adminEmails;
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `[salledeculte.com] Nouvelle annonce à valider : ${salleName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
body{font-family:system-ui,sans-serif;line-height:1.65;color:#334155;max-width:560px;margin:0 auto;padding:24px;font-size:15px;}
h1{color:#0f172a;font-size:20px;font-weight:600;margin:0 0 20px;}
a{color:#213398;text-decoration:none;}
a:hover{text-decoration:underline;}
.btn{display:inline-block;background:#213398;color:#fff!important;padding:12px 24px;border-radius:8px;margin:16px 0;font-weight:500;}
p{margin:0 0 12px;}
.signature{margin-top:24px;color:#64748b;font-size:14px;}
</style>
</head>
<body>
  <h1>Nouvelle annonce à valider</h1>
  <p>Une nouvelle annonce a été soumise et nécessite votre validation :</p>
  <p><strong>${escapeHtml(salleName)}</strong> — ${escapeHtml(salleCity)}</p>
  <p><a href="${validationUrl}" class="btn">Voir et valider l'annonce</a></p>
  <p class="signature">L'équipe salledeculte.com</p>
</body>
</html>`,
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
