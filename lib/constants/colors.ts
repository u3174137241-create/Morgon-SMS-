/**
 * Neutral, sofistikerad palett. Svart/vitt/grått bär hela UI:t —
 * grönt/gult/rött används uteslutande för verdict/risk-semantik.
 */

const light = {
  background: "#FAFAF9",
  backgroundElevated: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceSunken: "#F3F3F1",
  border: "#E7E5E2",
  borderStrong: "#D4D1CB",
  textPrimary: "#111111",
  textSecondary: "#5C5A56",
  textTertiary: "#948F87",
  textInverse: "#FFFFFF",
  tint: "#111111",
  overlay: "rgba(17,17,17,0.4)",

  good: "#1E7A3D",
  goodBg: "#E9F5EC",
  warn: "#946600",
  warnBg: "#FBF1DC",
  risk: "#B23B2E",
  riskBg: "#FBEAE7",

  chartTrack: "#EDECE9",
} as const;

const dark = {
  background: "#0B0B0A",
  backgroundElevated: "#151513",
  surface: "#151513",
  surfaceSunken: "#1D1D1A",
  border: "#2A2A26",
  borderStrong: "#3A3A34",
  textPrimary: "#F5F4F2",
  textSecondary: "#B4B0A8",
  textTertiary: "#7C7870",
  textInverse: "#111111",
  tint: "#F5F4F2",
  overlay: "rgba(0,0,0,0.55)",

  good: "#4ADE80",
  goodBg: "#132A1B",
  warn: "#F5C451",
  warnBg: "#2E2410",
  risk: "#F0897A",
  riskBg: "#301613",

  chartTrack: "#232320",
} as const;

export type ThemeColors = { [K in keyof typeof light]: string };

export const palettes: { light: ThemeColors; dark: ThemeColors } = { light, dark };
export type ColorScheme = keyof typeof palettes;
