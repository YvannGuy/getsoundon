export const siteConfig = {
  name: "GetSoundOn",
  description:
    "Louez et proposez du matériel événementiel (sono, DJ, lumières) entre particuliers et pros sur GetSoundOn.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://getsoundon.com",
  instagram: "https://instagram.com/getsoundon",
  facebook: "https://facebook.com/getsoundon",
  /** Contact affiché page pré-lancement et réception des inscriptions waitlist */
  supportEmail: "support@getsoundon.com",
  /** Date de lancement pour la page Coming Soon (format ISO) */
  launchDate: process.env.NEXT_PUBLIC_LAUNCH_DATE ?? "2026-03-02T00:00:00",
};
