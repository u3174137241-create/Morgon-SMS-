/** Källan till ett enskilt datafält — avgör hur det visas i UI (kap. 14, datakvalitet). */
export type FieldSource = "listing" | "ai_estimate" | "missing";

export interface SourcedField<T> {
  value: T | null;
  source: FieldSource;
}

export type FuelType =
  | "bensin"
  | "diesel"
  | "el"
  | "laddhybrid"
  | "hybrid"
  | "gas"
  | "okänt";

export type Gearbox = "manuell" | "automat" | "okänt";

export type ListingSource = "blocket" | "wayke" | "bytbil" | "facebook" | "manual" | "screenshot" | "unknown";

/**
 * Rå information extraherad/inmatad om en bilannons, innan AI-analys.
 * Fält som saknas ska vara `null` — aldrig ihopgissade.
 */
export interface CarListingInput {
  sourceType: ListingSource;
  sourceUrl: string | null;
  make: string | null;
  model: string | null;
  modelYear: number | null;
  mileageKm: number | null;
  fuelType: FuelType | null;
  gearbox: Gearbox | null;
  engine: string | null;
  powerHp: number | null;
  price: number | null;
  ownerCount: number | null;
  serviceHistoryNotes: string | null;
  equipment: string[];
  description: string | null;
  imageUris: string[];
  region: string | null;
}

export function emptyCarListingInput(sourceType: ListingSource = "manual"): CarListingInput {
  return {
    sourceType,
    sourceUrl: null,
    make: null,
    model: null,
    modelYear: null,
    mileageKm: null,
    fuelType: null,
    gearbox: null,
    engine: null,
    powerHp: null,
    price: null,
    ownerCount: null,
    serviceHistoryNotes: null,
    equipment: [],
    description: null,
    imageUris: [],
    region: null,
  };
}
