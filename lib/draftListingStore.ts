import { useSyncExternalStore } from "react";
import { emptyCarListingInput, type CarListingInput, type ListingSource } from "@/types/car";

/**
 * Enkel modul-singleton för att bära ett annons-utkast mellan
 * "Analysera"-flödets skärmar (metodval → granska/fyll i → progress).
 * Inget behov av persistens — utkastet lever bara under en analys-session.
 */
let draft: CarListingInput = emptyCarListingInput();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export const draftListingStore = {
  get: () => draft,
  set: (next: CarListingInput) => {
    draft = next;
    notify();
  },
  update: (patch: Partial<CarListingInput>) => {
    draft = { ...draft, ...patch };
    notify();
  },
  reset: (sourceType: ListingSource = "manual") => {
    draft = emptyCarListingInput(sourceType);
    notify();
  },
  subscribe: (callback: () => void) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
};

export function useDraftListing(): CarListingInput {
  return useSyncExternalStore(draftListingStore.subscribe, draftListingStore.get, draftListingStore.get);
}
