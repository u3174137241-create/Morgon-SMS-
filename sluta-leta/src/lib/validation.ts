import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(200),
});

export const searchConditionSchema = z.enum(["Ny", "Begagnad", "Renoveringsobjekt"]);

export const createSearchSchema = z.object({
  text: z.string().trim().min(3).max(2000),
  images: z.array(z.string().url()).max(10).default([]),
  condition: searchConditionSchema.optional(),
  budgetMin: z.number().int().positive().max(100_000_000).optional(),
  budgetMax: z.number().int().positive().max(100_000_000).optional(),
  location: z.string().trim().min(1).max(100).optional(),
});

export const createOfferSchema = z.object({
  searchId: z.string().cuid().optional(),
  listingId: z.string().cuid().optional(),
  price: z.number().int().positive().max(100_000_000),
  message: z.string().trim().min(1).max(1000),
  images: z.array(z.string().url()).max(10).default([]),
});

export const createListingSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(2).max(2000),
  price: z.number().int().positive().max(100_000_000),
  location: z.string().trim().min(1).max(100),
  images: z.array(z.string().url()).max(10).default([]),
});

export const createReviewSchema = z.object({
  transactionId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const sendMessageSchema = z.object({
  transactionId: z.string().cuid(),
  type: z.enum(["TEXT", "IMAGE", "VOICE"]).default("TEXT"),
  content: z.string().trim().max(4000).optional(),
  mediaUrl: z.string().url().optional(),
});
