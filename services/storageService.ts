import { supabase, isSupabaseConfigured } from "./supabaseClient";

const BUCKET = "listing-images";

/** Laddar upp en bild och returnerar en URL appen kan visa/skicka vidare. */
export async function uploadListingImage(localUri: string, userId: string): Promise<string> {
  if (!isSupabaseConfigured) {
    // Demo-läge: ingen backend att ladda upp till, behåll den lokala URI:n.
    return localUri;
  }

  const fileExt = localUri.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${fileExt}`;
  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: `image/${fileExt}`,
    upsert: false,
  });
  if (error) throw new Error("Kunde inte ladda upp bilden. Försök igen.");

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
