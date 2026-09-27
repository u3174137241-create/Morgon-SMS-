import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ogiltig e-postadress."),
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken.").max(200),
  name: z.string().trim().min(1, "Namn krävs.").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ogiltig e-postadress."),
  password: z.string().min(1, "Lösenord krävs.").max(200),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ogiltig e-postadress."),
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(10, "Ogiltig token."),
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken.").max(200),
});

export const searchConditionSchema = z.enum(["Ny", "Begagnad", "Renoveringsobjekt"]);

export const createSearchSchema = z.object({
  text: z.string().trim().min(3, "Beskriv vad du söker med minst 3 tecken.").max(2000, "Beskrivningen är för lång (max 2000 tecken)."),
  images: z.array(z.string().url()).max(10, "Max 10 bilder.").default([]),
  condition: searchConditionSchema.optional(),
  budgetMin: z.number().int().positive("Budget måste vara ett positivt tal.").max(100_000_000).optional(),
  budgetMax: z.number().int().positive("Budget måste vara ett positivt tal.").max(100_000_000).optional(),
  location: z.string().trim().min(1).max(100, "Platsen är för lång.").optional(),
});

export const createOfferSchema = z.object({
  searchId: z.string().cuid().optional(),
  listingId: z.string().cuid().optional(),
  price: z.number().int().positive("Priset måste vara ett positivt tal.").max(100_000_000),
  message: z.string().trim().min(1, "Skriv en kort beskrivning.").max(1000, "Beskrivningen är för lång (max 1000 tecken)."),
  images: z.array(z.string().url()).max(10, "Max 10 bilder.").default([]),
});

export const createListingSchema = z.object({
  title: z.string().trim().min(2, "Titeln måste vara minst 2 tecken.").max(200, "Titeln är för lång."),
  description: z.string().trim().min(2, "Beskrivningen måste vara minst 2 tecken.").max(2000, "Beskrivningen är för lång (max 2000 tecken)."),
  price: z.number().int().positive("Priset måste vara ett positivt tal.").max(100_000_000),
  location: z.string().trim().min(1, "Plats krävs.").max(100, "Platsen är för lång."),
  images: z.array(z.string().url()).max(10, "Max 10 bilder.").default([]),
});

export const createReviewSchema = z.object({
  transactionId: z.string().cuid(),
  rating: z.number().int().min(1, "Betyg måste vara mellan 1 och 5.").max(5, "Betyg måste vara mellan 1 och 5."),
  comment: z.string().trim().max(1000, "Kommentaren är för lång (max 1000 tecken).").optional(),
});

export const createReportSchema = z.object({
  targetType: z.enum(["USER", "SEARCH", "LISTING"]),
  targetId: z.string().cuid(),
  reason: z.string().trim().min(5, "Beskriv vad som hänt med minst 5 tecken.").max(500, "Texten är för lång (max 500 tecken)."),
});

export const sendMessageSchema = z.object({
  transactionId: z.string().cuid(),
  type: z.enum(["TEXT", "IMAGE", "VOICE"]).default("TEXT"),
  content: z.string().trim().max(4000, "Meddelandet är för långt.").optional(),
  mediaUrl: z.string().url().optional(),
});
