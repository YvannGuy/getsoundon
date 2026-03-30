export type CompanySuggestion = {
  id: string;
  name: string;
  siren?: string | null;
  siret?: string | null;
  city?: string | null;
  postalCode?: string | null;
  isActive?: boolean | null;
  legalForm?: string | null;
};

export type CompanySearchResult = {
  suggestions: CompanySuggestion[];
};

export type CompanySearchQuery = {
  q: string;
  limit?: number;
};
