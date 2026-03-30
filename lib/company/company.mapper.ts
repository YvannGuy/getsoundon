import type { CompanySuggestion } from "./company.types";

type ApiEntrepriseItem = {
  siren?: string;
  siege?: {
    siret?: string;
    commune?: string;
    code_postal?: string;
    etat_administratif?: string;
  };
  nom_complet?: string;
  nom_raison_sociale?: string;
  forme_juridique?: {
    libelle?: string;
  };
};

type ApiEntrepriseResponse = {
  results?: ApiEntrepriseItem[];
};

export function mapCompanyResponse(payload: ApiEntrepriseResponse, limit = 8): CompanySuggestion[] {
  const items = payload.results ?? [];
  return items.slice(0, limit).map((item, idx) => {
    const nom = item.nom_complet || item.nom_raison_sociale || "";
    const siege = item.siege ?? {};
    const status = siege.etat_administratif;
    return {
      id: `${item.siren ?? idx}-${siege.siret ?? "n/a"}`,
      name: nom,
      siren: item.siren ?? null,
      siret: siege.siret ?? null,
      city: siege.commune ?? null,
      postalCode: siege.code_postal ?? null,
      isActive: status ? status.toLowerCase() === "a" : null,
      legalForm: item.forme_juridique?.libelle ?? null,
    };
  });
}
