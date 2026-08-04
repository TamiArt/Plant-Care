export interface ExternalTaxonReference {
  provider: "gbif";
  taxonKey: number;
  scientificName: string;
  canonicalName?: string;
  rank?: string;
  status?: string;
  fetchedAt: string;
}
