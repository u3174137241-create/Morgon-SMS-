// Same beige / white / gold palette as the web dashboard (public/style.css).

export const colors = {
  cream: "#faf6ef",
  white: "#ffffff",
  beige: "#efe6d6",
  beigeSoft: "#f4ecdf",
  gold: "#b8924f",
  goldDeep: "#9c7a3c",
  goldLight: "#e8d3a4",
  ink: "#2f2a22",
  inkSoft: "#6f6656",
  muted: "#a89c85",
  border: "#e7dcc7",
  fail: "#c0604a",
  failBg: "#fbf1ee",
  failBorder: "#e4b8ab",
};

export const classificationColors: Record<string, { bg: string; fg: string }> = {
  HOT: { bg: colors.gold, fg: colors.white },
  WARM: { bg: colors.goldLight, fg: colors.goldDeep },
  WARM_POTENTIAL: { bg: colors.beige, fg: colors.inkSoft },
  COLD: { bg: "#eef2f6", fg: "#5b6c7c" },
  IGNORE: { bg: colors.border, fg: colors.muted },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const fonts = {
  serif: "Fraunces_600SemiBold",
  serifMedium: "Fraunces_500Medium",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemi: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
};

export const shadow = {
  shadowColor: "#7a622b",
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
};
