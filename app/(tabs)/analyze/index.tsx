import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/forms/FormField";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/lib/constants/spacing";
import { ListingParser } from "@/features/listings/ListingParser";
import { draftListingStore } from "@/lib/draftListingStore";

export default function AnalyzeEntry() {
  const { colors } = useTheme();
  const [url, setUrl] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;
    setError(null);
    setLoadingUrl(true);
    const result = await ListingParser.parseUrl(url);
    setLoadingUrl(false);
    if (!result.success || !result.listing) {
      setError(result.error ?? "Vi kunde inte läsa annonsen. Försök igen eller ladda upp screenshots.");
      return;
    }
    draftListingStore.set(result.listing);
    router.push("/(tabs)/analyze/manual");
  };

  const pickImages = async (kind: "screenshot" | "photo") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Vi behöver tillgång till dina bilder för att fortsätta.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 6,
    });
    if (result.canceled || result.assets.length === 0) return;

    draftListingStore.reset(kind === "screenshot" ? "screenshot" : "manual");
    draftListingStore.update({ imageUris: result.assets.map((a) => a.uri) });
    router.push("/(tabs)/analyze/manual");
  };

  const startManual = () => {
    draftListingStore.reset("manual");
    router.push("/(tabs)/analyze/manual");
  };

  return (
    <Screen scroll>
      <Text variant="title1">Analysera bil</Text>
      <Text variant="body" color="secondary" style={{ marginTop: spacing.xxs, marginBottom: spacing.xl }}>
        Välj hur du vill lägga till annonsen.
      </Text>

      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="headline" style={{ marginBottom: spacing.xs }}>
          Klistra in annonslänk
        </Text>
        <FormField
          label="URL"
          placeholder="https://www.blocket.se/..."
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={url}
          onChangeText={setUrl}
        />
        {error && (
          <Text variant="footnote" color="risk" style={{ marginBottom: spacing.sm }}>
            {error}
          </Text>
        )}
        <Button
          label={loadingUrl ? "Läser annonsen…" : "Analysera annons"}
          onPress={handleUrlSubmit}
          disabled={!url.trim()}
          loading={loadingUrl}
        />
      </Card>

      <Text variant="subhead" color="tertiary" style={styles.orLabel}>
        ELLER
      </Text>

      <View style={{ gap: spacing.sm }}>
        <OptionRow
          icon="image-outline"
          title="Ladda upp screenshots"
          subtitle="Av annonsen från Blocket, Wayke eller Bytbil"
          onPress={() => pickImages("screenshot")}
        />
        <OptionRow
          icon="camera-outline"
          title="Ladda upp bilder"
          subtitle="Egna foton av bilen"
          onPress={() => pickImages("photo")}
        />
        <OptionRow
          icon="create-outline"
          title="Skriv in information manuellt"
          subtitle="Fyll i uppgifterna själv"
          onPress={startManual}
        />
      </View>
    </Screen>
  );
}

function OptionRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} style={styles.optionCard}>
      <View style={[styles.optionIcon, { backgroundColor: colors.surfaceSunken }]}>
        <Ionicons name={icon} size={20} color={colors.textPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{title}</Text>
        <Text variant="footnote" color="secondary" style={{ marginTop: 2 }}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Card>
  );
}

const styles = StyleSheet.create({
  orLabel: { textAlign: "center", marginVertical: spacing.md },
  optionCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  optionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
