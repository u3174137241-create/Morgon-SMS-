import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Linking, Platform, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { WebView, type WebViewNavigation } from "react-native-webview";

const APP_URL = "https://sluta-leta-three.vercel.app";
const APP_HOSTNAME = new URL(APP_URL).hostname;

// WebViewen delar appens inloggningskaka (sharedCookiesEnabled), vilket gör
// den till ett "betrott" skal i användarens ögon. Utan den här spärren skulle
// en länk som en annan användare klistrar in i en chatt (phishing, en falsk
// inloggningssida osv.) öppnas rakt inuti appen med samma UI-chrome som
// resten av Sluta Leta — ett klassiskt sätt att lura folk. Allt som inte är
// vår egen domän öppnas därför i telefonens vanliga webbläsare istället,
// vilket även täcker Stripes betalsidor (buy.stripe.com) och samtidigt
// håller köpet utanför appens egen vy (App Store-regel 3.1.1).
function shouldOpenInApp(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === "https:" && hostname === APP_HOSTNAME;
  } catch {
    return false;
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Registrerar för pushnotiser hos Expo (som i sin tur pratar med APNs/FCM)
// och returnerar tokenet. Fungerar bara i en riktig EAS-byggd app på en
// fysisk enhet eller emulator med Google Play-tjänster — aldrig i Expo Go
// för remote push, och aldrig i simulatorn för riktiga push (bara lokala).
async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResponse.data;
  } catch (err) {
    console.warn("Kunde inte hämta Expo-pushtoken", err);
    return null;
  }
}

export default function App() {
  const webviewRef = useRef<WebView<object>>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const pushTokenRef = useRef<string | null>(null);

  // Skicka pushtokenet in i webbsidan via postMessage, så sidan (se
  // NativeAppBridge.tsx i sluta-leta-appen) kan POSTa det till backend med
  // sina egna cookies — appen behöver aldrig hantera inloggningssessionen.
  const sendTokenToWebView = useCallback((token: string) => {
    webviewRef.current?.postMessage(JSON.stringify({ type: "expo-push-token", token }));
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        pushTokenRef.current = token;
      }
    });
  }, []);

  const handleShouldStartLoadWithRequest = useCallback((request: WebViewNavigation) => {
    if (shouldOpenInApp(request.url)) return true;
    Linking.openURL(request.url).catch(() => {});
    return false;
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack) {
        webviewRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <WebView<object>
        ref={webviewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        onNavigationStateChange={(nav: { canGoBack: boolean }) => setCanGoBack(nav.canGoBack)}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onLoadEnd={() => {
          setLoading(false);
          if (pushTokenRef.current) sendTokenToWebView(pushTokenRef.current);
        }}
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        decelerationRate="normal"
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
