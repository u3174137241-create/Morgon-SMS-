export function formatSEK(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatKm(km: number): string {
  return `${new Intl.NumberFormat("sv-SE").format(km)} km`;
}

export function formatMil(km: number): string {
  return `${new Intl.NumberFormat("sv-SE").format(Math.round(km / 10))} mil`;
}

export function percentDiff(value: number, reference: number): number {
  if (reference === 0) return 0;
  return ((value - reference) / reference) * 100;
}
