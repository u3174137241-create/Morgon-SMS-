import { Platform } from "react-native";

export const fontFamily = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
});

/** Tydliga typografiska nivåer. Storlekar respekterar Dynamic Type via allowFontScaling (default true). */
const variants = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "700" as const, letterSpacing: -0.4 },
  title1: { fontSize: 26, lineHeight: 32, fontWeight: "700" as const, letterSpacing: -0.3 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const, letterSpacing: -0.2 },
  title3: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const, letterSpacing: -0.1 },
  headline: { fontSize: 16, lineHeight: 22, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: "400" as const },
  bodyMedium: { fontSize: 16, lineHeight: 23, fontWeight: "500" as const },
  callout: { fontSize: 15, lineHeight: 21, fontWeight: "400" as const },
  subhead: { fontSize: 14, lineHeight: 20, fontWeight: "500" as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const, letterSpacing: 0.2 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: "600" as const, letterSpacing: 0.6 },
} as const;

export const typography = Object.fromEntries(
  Object.entries(variants).map(([key, value]) => [key, { fontFamily, ...value }])
) as { [K in keyof typeof variants]: (typeof variants)[K] & { fontFamily: typeof fontFamily } };

export type TypographyVariant = keyof typeof variants;
