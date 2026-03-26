/**
 * Informations juridiques pour les mentions légales et pages légales.
 * À adapter selon la structure juridique de votre société.
 */
export const legalConfig = {
  /** Éditeur du site */
  editeur: {
    nom: "GetSoundOn",
    siret: "799 596 176 00021",
    rcs: "RCS Paris 799 596 176",
    capitalSocial: "1 000 €",
    siegeSocial: {
      adresse: "78 avenue des Champs-Élysées",
      codePostal: "75008",
      ville: "Paris",
      pays: "France",
    },
    tvaIntracommunautaire: "", // Non assujetti TVA
    email: "contact@getsoundon.com",
  },

  /** Directeur de la publication (obligatoire LCEN) */
  directeurPublication: "Guyonnet Yvann",

  /** Hébergeur (obligatoire LCEN) */
  hebergeur: {
    nom: "Vercel Inc.",
    adresse: "440 N Barranca Ave #4133, Covina, CA 91723, USA",
    site: "https://vercel.com",
  },

  /** Données personnelles - DPO si désigné */
  dpoEmail: "contact@getsoundon.com",

  /** Médiation consommation (obligatoire avant mise en ligne B2C) */
  mediation: {
    nom: "À compléter avant mise en ligne",
    url: "À compléter avant mise en ligne",
  },
};
