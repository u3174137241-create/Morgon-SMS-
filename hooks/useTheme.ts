import { useColorScheme } from "react-native";
import { palettes, ThemeColors } from "@/lib/constants/colors";

export function useTheme(): { colors: ThemeColors; scheme: "light" | "dark" } {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return { colors: palettes[scheme], scheme };
}
