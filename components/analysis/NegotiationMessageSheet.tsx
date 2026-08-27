import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/lib/constants/spacing";

export function NegotiationMessageSheet({ message }: { message: string }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <Text variant="subhead" color="secondary" style={{ marginBottom: spacing.sm }}>
        Meddelande till säljaren
      </Text>
      <View style={[styles.messageBox, { backgroundColor: colors.surfaceSunken }]}>
        <Text variant="body">{message}</Text>
      </View>
      <Button
        label={copied ? "Kopierat!" : "Kopiera meddelande"}
        variant="secondary"
        onPress={copy}
        style={{ marginTop: spacing.sm }}
      />
      {copied && (
        <View style={styles.confirmRow}>
          <Ionicons name="checkmark-circle" size={14} color={colors.good} />
          <Text variant="caption" color="good" style={{ marginLeft: 4 }}>
            Klistra in det i chatten med säljaren
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  messageBox: { borderRadius: 12, padding: spacing.sm },
  confirmRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs, justifyContent: "center" },
});
