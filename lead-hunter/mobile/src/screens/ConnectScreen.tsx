import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { testConnection, UnauthorizedError } from "../api";
import { Button } from "../components/Button";
import { setApiBaseUrl, setAppPassword } from "../storage";
import { colors, fonts, radius, spacing } from "../theme";

export function ConnectScreen({ onConnected }: { onConnected: () => void }) {
  const [url, setUrl] = useState("http://192.168.1.");
  const [password, setPassword] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setError(null);
    const trimmed = url.trim().replace(/\/+$/, "");
    if (!trimmed) {
      setError("Ange serverns adress.");
      return;
    }
    const withScheme = /^https?:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`;
    setTesting(true);
    try {
      await testConnection(withScheme, password);
      await setApiBaseUrl(withScheme);
      await setAppPassword(password);
      onConnected();
    } catch (err: any) {
      if (err instanceof UnauthorizedError) setError("Fel lösenord.");
      else setError(err.message || "Kunde inte ansluta till servern.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.mark}>✦</Text>
        <Text style={styles.title}>AI Lead Hunter</Text>
        <Text style={styles.subtitle}>
          Anslut till din Lead Hunter-server. Den körs på din dator — telefonen behöver vara på samma WiFi-nätverk (eller ha åtkomst via
          t.ex. Tailscale/VPN).
        </Text>

        <Text style={styles.fieldLabel}>Server-adress</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="http://192.168.1.23:3100"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={styles.hint}>
          Hittas i terminalen där servern startades ("AI Lead Hunter dashboard running on http://localhost:PORT") — byt localhost mot
          datorns lokala IP-adress (t.ex. via `ipconfig`/`ifconfig`).
        </Text>

        <Text style={styles.fieldLabel}>Lösenord (om APP_PASSWORD är satt)</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="valfritt"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ marginTop: spacing.lg }}>
          <Button variant="gold" onPress={connect} loading={testing}>
            Anslut
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.xl, paddingTop: spacing.xxl * 1.5 },
  mark: { fontSize: 40, color: colors.gold, textAlign: "center", marginBottom: spacing.sm },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink, textAlign: "center" },
  subtitle: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 19 },
  fieldLabel: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.inkSoft, marginBottom: 6, marginTop: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontFamily: fonts.sans, fontSize: 14, color: colors.ink, backgroundColor: colors.white },
  hint: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted, marginTop: 6, lineHeight: 15 },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.fail, marginTop: spacing.md, textAlign: "center" },
});
