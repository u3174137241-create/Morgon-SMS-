export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

export function carTitle(make: string | null, model: string | null): string {
  return [make, model].filter(Boolean).join(" ") || "Okänd bil";
}
